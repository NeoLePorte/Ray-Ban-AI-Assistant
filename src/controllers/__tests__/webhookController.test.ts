// src/__tests__/webhookController.test.ts
import request from 'supertest';
import { app } from '../../server';
import nock from 'nock';

describe('Webhook Controller', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('should verify webhook subscription', async () => {
    const response = await request(app)
      .get('/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN, 'hub.challenge': '1234' });

    expect(response.status).toBe(200);
    expect(response.text).toBe('1234');
  });

  // Add more tests...
});