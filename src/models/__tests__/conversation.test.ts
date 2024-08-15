import {  
    SUPPORTED_MODELS,
    isSupportedModel, 
    getModelFromAlias, 
    createNewConversation,
    Conversation 
} from '../conversation';

describe('Conversation Model', () => {

    describe('SUPPORTED_MODELS', () => {
        it('should contain all supported models', () => {
            expect(SUPPORTED_MODELS).toEqual([
                'gpt-4o',
                'gpt-4o-mini',
                'claude-3-5-sonnet-20240620',
                'claude-3-opus-20240229'
            ]);
        });
    });

    describe('isSupportedModel', () => {
        it('should return true for supported models', () => {
            expect(isSupportedModel('gpt-4o')).toBe(true);
            expect(isSupportedModel('claude-3-5-sonnet-20240620')).toBe(true);
        });

        it('should return false for unsupported models', () => {
            expect(isSupportedModel('unsupported-model')).toBe(false);
        });
    });

    describe('MODEL_ALIASES', () => {
        it('should map aliases to correct models', () => {
            expect(getModelFromAlias('4o')).toBe('gpt-4o');
            expect(getModelFromAlias('mini')).toBe('gpt-4o-mini');
            expect(getModelFromAlias('sonnet')).toBe('claude-3-5-sonnet-20240620');
            expect(getModelFromAlias('opus')).toBe('claude-3-opus-20240229');
        });

        it('should return undefined for invalid alias', () => {
            expect(getModelFromAlias('invalid-alias')).toBeUndefined();
        });

        it('should return the model if alias is actually a valid model', () => {
            expect(getModelFromAlias('gpt-4o')).toBe('gpt-4o');
        });
    });

    describe('createNewConversation', () => {
        it('should create a new conversation with default values', () => {
            const userId = 'user-123';
            const newConversation: Conversation = createNewConversation(userId);

            expect(newConversation.id).toBe(userId);
            expect(newConversation.userId).toBe(userId);
            expect(newConversation.model).toBe(SUPPORTED_MODELS[0]);
            expect(newConversation.messages).toEqual([]);
            expect(newConversation.createdAt).toBeInstanceOf(Date);
            expect(newConversation.updatedAt).toBeInstanceOf(Date);
            expect(newConversation.isArchived).toBe(false);
            expect(newConversation.userContext).toBe('');
        });
    });
});
