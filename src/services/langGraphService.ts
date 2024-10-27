import { StateGraph, MemorySaver, START, END, Annotation } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { SystemMessage, HumanMessage, BaseMessage, AIMessage } from '@langchain/core/messages';
import { config } from '../config';
import { LLMType } from '../models/conversation';
import { AppError, LangGraphError } from '../utils/errorHandler';
import logger from '../utils/logger';


const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
      if (Array.isArray(right)) {
        return left.concat(right);
      }
      return left.concat([right]);
    },
    default: () => [],
  }),
  imageData: Annotation<string | undefined>()
});

export class LangGraphService {
  private model: BaseLanguageModel;
  private graph: ReturnType<typeof StateGraph.prototype.compile>;
  private checkpointer: MemorySaver;

  constructor(modelType: LLMType) {
    try {
      logger.info('Initializing LangGraphService', { modelType });
      this.model = this.getModelInstance(modelType);
      this.checkpointer = new MemorySaver();
      this.graph = this.initializeGraph();
      logger.info('LangGraphService initialized successfully');
    } catch (error) {
      logger.error('Error initializing LangGraphService', { error, modelType });
      throw error;
    }
  }

  private getModelInstance(model: LLMType): BaseLanguageModel {
    switch (model) {
      case 'gpt-4o':
      case 'gpt-4o-mini':
        return new ChatOpenAI({ 
          modelName: 'gpt-4o',
          openAIApiKey: config.OPENAI_API_KEY,
          temperature: 0.7,
          maxTokens: 1500
        });
      case 'claude-3-5-sonnet-20241022':
      case 'claude-3-opus-20240229':
        return new ChatAnthropic({ 
          modelName: model,
          anthropicApiKey: config.ANTHROPIC_KEY,
          temperature: 0.7,
          maxTokens: 1500
        });
      default:
        throw new AppError(`Unsupported model: ${model}`, 400);
    }
  }

  private initializeGraph() {
    try {
        const graphBuilder = new StateGraph(StateAnnotation);
        
        if (!this.model) {
            throw new Error('LLM model not initialized');
        }

        // Define nodes
        const nodes = {
            chat: "chat",
            image: "image"
        } as const;

        // Chat node
        const chatNode = async (state: typeof StateAnnotation.State) => {
            const response = await this.model.invoke(state.messages);
            return {
                messages: [new AIMessage({ content: response.content })],
            };
        };

        // Image node
        const imageNode = (state: typeof StateAnnotation.State) => {
            if (!state.imageData) {
                throw new Error('No image data provided');
            }
            return {
                messages: [new AIMessage({ 
                    content: `Analyzing image: ${state.imageData}` 
                })],
            };
        };

        // Conditional edge function
        const shouldProcessImage = (state: typeof StateAnnotation.State) => {
            return state.imageData ? "image" : "chat";
        };

        // Add nodes and edges with conditional routing
        graphBuilder
            .addNode(nodes.chat, chatNode)
            .addNode(nodes.image, imageNode)
            .addConditionalEdges(
                START,
                shouldProcessImage,
                {
                    chat: nodes.chat,
                    image: nodes.image,
                }
            )
            .addEdge(nodes.chat, END)
            .addEdge(nodes.image, END);

        return graphBuilder.compile({
            checkpointer: this.checkpointer
        });
    } catch (error: any) {
        logger.error('Error initializing graph', { 
            message: error.message, 
            stack: error.stack 
        });
        throw new AppError('Failed to initialize LangGraph', 500);
    }
  }

  async processMessage(message: string, context?: string, imageData?: string): Promise<string> {
    try {
        const messages = [new HumanMessage({ content: message })];
        if (context) {
            messages.unshift(new SystemMessage({ content: context }));
        }

        // Only include imageData in the invoke call if it exists
        const invokeParams = {
            messages,
            ...(imageData && { imageData })
        };

        const result = await this.graph.invoke(
            invokeParams,
            { configurable: { thread_id: message } }
        );

        if (!result?.messages?.length) {
            throw new LangGraphError('No response generated');
        }

        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content as string;
    } catch (error) {
        logger.error('Error processing message', { 
            error: error instanceof Error ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            } : error,
            message 
        });
        throw new LangGraphError(
            'Failed to process message',
            500,
            error instanceof Error ? error : undefined
        );
    }
  }

  async getState(userId: string) {
    return await this.checkpointer.get({
      configurable: { thread_id: userId }
    });
  }

  async clearState(userId: string) {
    try {
      await this.checkpointer.put({
        configurable: { thread_id: userId }
      }, { 
        v: 1,
        id: userId,
        ts: Date.now().toString(),
        channel_values: {},
        channel_versions: {},
        versions_seen: {},
        pending_sends: []
      }, { 
        source: 'input',
        step: 0,
        writes: {},
        parents: {}
      });
      logger.info('State cleared for user', { userId });
    } catch (error) {
      logger.error('Error clearing state', { error, userId });
      throw new AppError('Failed to clear state', 500);
    }
  }
}
