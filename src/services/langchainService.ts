import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { z } from "zod";
import { config } from '../config';
import { LLMType, isSupportedModel } from '../models/conversation';
import { AppError } from '../utils/errorHandler';

function getModelInstance(model: LLMType): BaseLanguageModel {
  if (model.startsWith('gpt-')) {
    return new ChatOpenAI({ modelName: model, openAIApiKey: config.OPENAI_API_KEY });
  } else if (model.startsWith('claude-')) {
    return new ChatAnthropic({ modelName: model, anthropicApiKey: config.ANTHROPIC_KEY });
  }
  throw new AppError(`Unsupported model: ${model}`, 400);
}

export async function getLangChainResponse(query: string, model: LLMType, systemPrompt: string): Promise<string> {
  if (!isSupportedModel(model)) {
    throw new AppError(`Invalid model: ${model}`, 400);
  }

  const llm = getModelInstance(model);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{query}"]
  ]);

  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser()
  ]);

  const response = await chain.invoke({ query });
  return response;
}

export async function getLangChainImageResponse(query: string, imageBase64: string, model: LLMType, systemPrompt: string): Promise<string> {
  if (!isSupportedModel(model)) {
    throw new AppError(`Invalid model: ${model}`, 400);
  }

  const llm = getModelInstance(model);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", `Analyze this image and answer the following question: ${query}\nThe image is encoded in base64: ${imageBase64}`]
  ]);

  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser()
  ]);

  const response = await chain.invoke({});
  return response;
}

export async function getStructuredOutput<T extends z.ZodType>(
  query: string,
  model: LLMType,
  schema: T
): Promise<z.infer<T>> {
  const llm = getModelInstance(model);
  const parser = StructuredOutputParser.fromZodSchema(schema);

  const prompt = ChatPromptTemplate.fromMessages([
    ["human", "Generate a response to the following query: {query}"],
    ["human", "Format the output as follows:\n{format_instructions}"]
  ]);

  const chain = RunnableSequence.from([
    {
      query: (input: { query: string }) => input.query,
      format_instructions: async () => parser.getFormatInstructions()
    },
    prompt,
    llm,
    parser
  ]);

  return await chain.invoke({ query });
}

export async function streamLangChainResponse(
  query: string,
  model: LLMType,
  systemPrompt: string,
  callbacks: BaseCallbackHandler[]
): Promise<void> {
  const llm = getModelInstance(model);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{query}"]
  ]);

  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser()
  ]);

  await chain.invoke({ query }, { callbacks });
}
