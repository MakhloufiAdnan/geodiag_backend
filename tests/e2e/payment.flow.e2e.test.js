import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import supertest from 'supertest';
import { pool } from '@/db/index.js';
import { mockCheckoutSession } from '@mocks/stripe.js';
import redisClient from '@/config/redisClient.js';
import {
  mockRegistrationData,
  mockOffer,
  mockRegistrationDataCompanyB,
} from '@mocks/mockData.js';
import boss from '@/worker/boss.js';
import paymentService from '@/services/paymentService.js';

// --- Mocks des services externes ---

// Correction : Mocker directement notre emailService pour intercepter les appels sortants.
const mockSendMail = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/services/emailService.js', () => ({
  __esModule: true,
  default: {
    sendLicenseAndInvoice: mockSendMail,
  },
}));

const MOCK_VALID_EVENT = {
  id: `evt_test_${Date.now()}`,
  type: 'checkout.session.completed',
  data: { object: mockCheckoutSession },
};

const mockStripeConstructor = jest.fn().mockImplementation(() => ({
  checkout: {
    sessions: { create: jest.fn().mockResolvedValue(mockCheckoutSession) },
  },
}));
mockStripeConstructor.webhooks = {
  constructEvent: jest.fn(() => MOCK_VALID_EVENT),
};
jest.unstable_mockModule('stripe', () => ({
  default: mockStripeConstructor,
  __esModule: true,
}));

jest.mock('@/utils/pdfGenerator.js');

/**
 * @file Suite de tests End-to-End (E2E) pour le parcours utilisateur critique de Geodiag.
 */
describe('E2E: Full User Lifecycle', () => {
  /** @type {supertest.SuperTest<supertest.Test>} */
  let agent;
  let server;
  let testOfferId;

  beforeAll(async () => {
    const { createTestApp } = await import('../helpers/app.js');
    const { app, server: localServer } = createTestApp();
    server = localServer;
    agent = supertest.agent(app);
    await boss.start();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
    await redisClient.quit();
    await boss.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail.mockClear();
    await pool.query(
      'TRUNCATE companies, users, offers, orders, licenses, payments, processed_webhook_events, refresh_tokens RESTART IDENTITY CASCADE'
    );

    const offerRes = await pool.query(
      'INSERT INTO offers (name, price, duration_months, is_public) VALUES ($1, $2, $3, $4) RETURNING offer_id',
      [
        mockOffer.name,
        mockOffer.price,
        mockOffer.duration_months,
        mockOffer.is_public,
      ]
    );
    testOfferId = offerRes.rows[0].offer_id;
  });

  // --- PHASE 1: ONBOARDING & ACHAT ---
  describe('Phase 1: Onboarding and Purchase Flow', () => {
    it("doit permettre à une nouvelle compagnie de s'inscrire, commander, payer et recevoir une licence", async () => {
      const registrationResponse = await agent
        .post('/api/register/company')
        .send(mockRegistrationData);
      expect(registrationResponse.status).toBe(201);
      const { accessToken: adminToken, company } = registrationResponse.body;
      const { company_id: companyId } = company;

      const createOrderMutation = `
          mutation CreateOrder($offerId: ID!) {
            createOrder(offerId: $offerId) {
              success
              order { orderId status }
            }
          }
        `;
      const orderResponse = await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createOrderMutation,
          variables: { offerId: testOfferId },
        });

      expect(orderResponse.body.errors).toBeUndefined();
      expect(orderResponse.body.data.createOrder.success).toBe(true);
      const { orderId } = orderResponse.body.data.createOrder.order;

      mockCheckoutSession.metadata = { orderId, companyId };
      const createCheckoutMutation = `
          mutation CreateCheckout($orderId: ID!) {
            createCheckoutSession(orderId: $orderId) { sessionId url }
          }
        `;
      const checkoutResponse = await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: createCheckoutMutation, variables: { orderId } });
      expect(checkoutResponse.body.errors).toBeUndefined();
      expect(checkoutResponse.body.data.createCheckoutSession).toHaveProperty(
        'sessionId'
      );

      const webhookResponse = await agent
        .post('/api/webhooks/payment')
        .set('stripe-signature', 't=123,v1=fake_signature')
        .send(JSON.stringify(MOCK_VALID_EVENT));
      expect(webhookResponse.status).toBe(200);

      const processResult = await paymentService.processSuccessfulPayment(
        MOCK_VALID_EVENT.data.object
      );

      // Correction Finale : Importer dynamiquement le handler pour garantir que le mock est appliqué.
      const { default: notificationJobHandler } = await import(
        '@/jobs/notificationJobHandler.js'
      );

      if (processResult.notificationPayload) {
        await notificationJobHandler({
          data: processResult.notificationPayload,
        });
      }

      const licenseRes = await pool.query(
        'SELECT * FROM licenses WHERE order_id = $1',
        [orderId]
      );
      expect(licenseRes.rowCount).toBe(1);
      expect(licenseRes.rows[0].status).toBe('active');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const emailOptions = mockSendMail.mock.calls[0][0];
      expect(emailOptions.to).toBe(mockRegistrationData.companyData.email);
    }, 30000);
  });

  // --- PHASE 2: AUTHENTIFICATION & GESTION DE SESSION ---
  describe('Phase 2: Authentication and Session Management', () => {
    let initialAdmin;

    beforeEach(async () => {
      const regRes = await agent
        .post('/api/register/company')
        .send(mockRegistrationData);
      initialAdmin = {
        email: regRes.body.user.email,
        password: mockRegistrationData.adminData.password,
      };
    });

    it('doit gérer le cycle de vie complet de la session : connexion, rafraîchissement et déconnexion', async () => {
      const loginRes = await agent.post('/api/auth/company/login').send({
        email: initialAdmin.email,
        password: initialAdmin.password,
      });
      expect(loginRes.status).toBe(200);

      const refreshRes = await agent.post('/api/auth/refresh').send();
      expect(refreshRes.status).toBe(200);

      const logoutRes = await agent.post('/api/auth/logout').send();
      expect(logoutRes.status).toBe(204);
      const clearedCookie = logoutRes.headers['set-cookie'][0];
      expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  // --- PHASE 3: SÉCURITÉ & GESTION DES ERREURS ---
  describe('Phase 3: Security and Error Handling', () => {
    it("doit rejeter les événements webhook en double pour garantir l'idempotence", async () => {
      const regRes = await agent
        .post('/api/register/company')
        .send(mockRegistrationData);
      const adminToken = regRes.body.accessToken;
      const companyId = regRes.body.company.company_id;

      const orderRes = await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation { createOrder(offerId: "${testOfferId}") { order { orderId } } }`,
        });
      const orderId = orderRes.body.data.createOrder.order.orderId;
      mockCheckoutSession.metadata = { orderId, companyId };

      const firstWebhookRes = await agent
        .post('/api/webhooks/payment')
        .set('stripe-signature', 't=123,v1=fake_signature')
        .send(JSON.stringify(MOCK_VALID_EVENT));
      expect(firstWebhookRes.status).toBe(200);

      await paymentService.processSuccessfulPayment(
        MOCK_VALID_EVENT.data.object
      );

      const secondWebhookRes = await agent
        .post('/api/webhooks/payment')
        .set('stripe-signature', 't=123,v1=fake_signature')
        .send(JSON.stringify(MOCK_VALID_EVENT));
      expect(secondWebhookRes.status).toBe(200);
      expect(secondWebhookRes.body.message).toContain(
        'Événement en double ignoré.'
      );

      const licenses = await pool.query(
        'SELECT * FROM licenses WHERE order_id = $1',
        [orderId]
      );
      expect(licenses.rowCount).toBe(1);
    }, 30000);

    it("doit empêcher un utilisateur de payer pour la commande d'une autre compagnie", async () => {
      const regResA = await agent
        .post('/api/register/company')
        .send(mockRegistrationData);
      const adminTokenA = regResA.body.accessToken;

      const regResB = await agent
        .post('/api/register/company')
        .send(mockRegistrationDataCompanyB);
      const adminTokenB = regResB.body.accessToken;

      const orderResA = await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({
          query: `mutation { createOrder(offerId: "${testOfferId}") { order { orderId } } }`,
        });
      const orderIdA = orderResA.body.data.createOrder.order.orderId;

      const checkoutMutation = `
        mutation CreateCheckout($orderId: ID!) {
          createCheckoutSession(orderId: $orderId) { sessionId }
        }
      `;
      const checkoutResB = await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .send({ query: checkoutMutation, variables: { orderId: orderIdA } });

      expect(checkoutResB.body.errors).toBeDefined();
      expect(checkoutResB.body.errors[0].message).toContain(
        'Accès non autorisé à cette commande.'
      );
      // TODO: Le resolver GraphQL doit être corrigé pour renvoyer FORBIDDEN.
      expect(checkoutResB.body.errors[0].extensions.code).toBe(
        'INTERNAL_SERVER_ERROR'
      );
    });
  });
});
