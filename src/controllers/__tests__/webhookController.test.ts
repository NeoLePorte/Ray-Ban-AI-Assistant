import request from 'supertest';
import { app } from '../../server';
import nock from 'nock';
import { processMessage } from '../../controllers/messageController';
import logger from '../../utils/logger';

// Mock the processMessage and logger
jest.mock('../../controllers/messageController');
jest.mock('../../utils/logger');

describe('Webhook Controller', () => {
  const AUTHORIZED_NUMBER = process.env.AUTHORIZED_WHATSAPP_NUMBER || '16315551181';

  beforeAll(() => {
    // Configure network behavior
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    // Reset network behavior
    nock.cleanAll();
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should verify webhook subscription', async () => {
    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': '1234',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('1234');
  });

  it('should process an authorized text message', async () => {
    const sampleData = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '16505551111',
                  phone_number_id: '123456123',
                },
                contacts: [
                  {
                    profile: {
                      name: 'test user name',
                    },
                    wa_id: AUTHORIZED_NUMBER, // Use the authorized number
                  },
                ],
                messages: [
                  {
                    from: AUTHORIZED_NUMBER,
                    id: 'ABGGFlA5Fpa',
                    timestamp: '1504902988',
                    type: 'text',
                    text: {
                      body: 'this is a text message',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const response = await request(app).post('/webhook').send(sampleData);

    expect(response.status).toBe(200);
    expect(processMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from: AUTHORIZED_NUMBER,
        content: 'this is a text message',
        type: 'text',
      })
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not process an unauthorized message', async () => {
    const unauthorizedNumber = '15556664444';
    const sampleData = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '16505551111',
                  phone_number_id: '123456123',
                },
                contacts: [
                  {
                    profile: {
                      name: 'test user name',
                    },
                    wa_id: unauthorizedNumber, // Unauthorized number
                  },
                ],
                messages: [
                  {
                    from: unauthorizedNumber,
                    id: 'ABGGFlA5Fpa',
                    timestamp: '1504902988',
                    type: 'text',
                    text: {
                      body: 'this is a text message',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const response = await request(app).post('/webhook').send(sampleData);

    expect(response.status).toBe(200);
    expect(processMessage).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Unauthorized message attempt', { from: unauthorizedNumber });
  });

  it('should handle non-array messages gracefully', async () => {
    const sampleData = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                messages: {}, // Simulate incorrect format
              },
            },
          ],
        },
      ],
    };

    const response = await request(app).post('/webhook').send(sampleData);

    expect(response.status).toBe(200);
    expect(processMessage).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Messages field is not an array', { value: sampleData.entry[0].changes[0].value });
  });

  it('should respond with 404 for non-whatsapp_business_account', async () => {
    const sampleData = {
      object: 'some_other_account',
      entry: [],
    };

    const response = await request(app).post('/webhook').send(sampleData);

    expect(response.status).toBe(404);
    expect(logger.warn).toHaveBeenCalledWith('Received non-WhatsApp Business account webhook', { object: 'some_other_account' });
  });
});
