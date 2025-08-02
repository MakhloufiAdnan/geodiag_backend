/**
 * @file Test de bout en bout (E2E) pour le flux utilisateur complet via GraphQL.
 * @description Valide le parcours critique de l'application :
 * 1. Inscription d'une nouvelle compagnie via l'API REST.
 * 2. Création d'une commande via une mutation GraphQL.
 * 3. Création d'une session de paiement via une mutation GraphQL.
 * 4. Simulation de la confirmation de paiement via le webhook REST.
 * 5. Vérification de la création de la licence en base de données et de l'envoi de l'email.
 */
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
import { pool } from '../../src/db/index.js';
import { mockCheckoutSession } from '../../mocks/stripe.js';
import redisClient from '../../src/config/redisClient.js';
import { mockRegistrationData, mockOffer } from '../../mocks/mockData.js';

// --- Mocks des services externes (Stripe, Nodemailer) ---
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

const mockSendMail = jest.fn().mockResolvedValue({ success: true });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

jest.mock('../../src/utils/pdfGenerator.js');

describe('Flux E2E complet : Inscription (REST) -> Paiement (GraphQL) -> Licence', () => {
  /** @type {supertest.SuperTest<supertest.Test>} */
  let agent;
  let server;
  let testOfferId;

  /**
   * @description Met en place le serveur de test avant l'exécution de toute la suite.
   */
  beforeAll(async () => {
    const { createTestApp } = await import('../helpers/app.js');
    const { app, server: localServer } = createTestApp();
    server = localServer;
    agent = supertest.agent(app);
  });

  /**
   * @description Nettoie les connexions (serveur, BDD, Redis) après l'exécution de tous les tests.
   */
  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
    await redisClient.quit();
  });

  /**
   * @description Réinitialise la base de données et les mocks avant chaque test pour garantir l'isolation.
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail.mockClear();
    await pool.query(
      'TRUNCATE companies, users, offers, orders, licenses, payments, processed_webhook_events RESTART IDENTITY CASCADE'
    );

    // Crée une offre de test dans la base de données.
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

  it('doit gérer le flux complet via les mutations GraphQL', async () => {
    // --- ÉTAPE 1: Inscription (via l'API REST restante) ---
    const registrationResponse = await agent
      .post('/api/register/company')
      .send(mockRegistrationData);
    expect(registrationResponse.status).toBe(201);
    const adminToken = registrationResponse.body.accessToken;
    const companyId = registrationResponse.body.company.company_id;

    // --- ÉTAPE 2: Création de la commande (via GraphQL Mutation) ---
    const createOrderMutation = `
      mutation CreateOrder($offerId: ID!) {
        createOrder(offerId: $offerId) {
          success
          message
          order {
            orderId
            status
          }
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

    expect(orderResponse.status).toBe(200); // Les requêtes GraphQL réussies retournent 200 OK
    expect(orderResponse.body.data.createOrder.success).toBe(true);
    const orderId = orderResponse.body.data.createOrder.order.orderId;

    // --- ÉTAPE 3: Création de la session de paiement (via GraphQL Mutation) ---
    mockCheckoutSession.metadata = { orderId, companyId };
    const createCheckoutMutation = `
      mutation CreateCheckout($orderId: ID!) {
        createCheckoutSession(orderId: $orderId) {
          sessionId
          url
        }
      }
    `;
    const checkoutResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ query: createCheckoutMutation, variables: { orderId } });

    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body.data.createCheckoutSession).toHaveProperty(
      'sessionId'
    );

    // --- ÉTAPE 4: Réception du Webhook (via l'API REST restante) ---
    const webhookResponse = await agent
      .post('/api/webhooks/payment')
      .set('stripe-signature', 't=123,v1=fake_signature')
      .send({ type: 'checkout.session.completed' });

    expect(webhookResponse.status).toBe(200);

    // --- ASSERTIONS FINALES : Vérifier les effets de bord en BDD et l'envoi d'email ---
    const licenseRes = await pool.query(
      'SELECT * FROM licenses WHERE order_id = $1',
      [orderId]
    );
    expect(licenseRes.rowCount).toBe(1);
    expect(licenseRes.rows[0].status).toBe('active');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const emailOptions = mockSendMail.mock.calls[0][0];
    expect(emailOptions.to).toBe(mockRegistrationData.companyData.email);
    expect(emailOptions.subject).toContain('Votre licence Geodiag');
  }, 15000);
});
