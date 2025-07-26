/**
 * @file Test de bout en bout (E2E) pour le flux utilisateur complet avec des mocks spécifiques.
 * @description Valide le parcours de l'inscription à la licence après un paiement simulé.
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import supertest from "supertest";
import { pool } from "../../src/db/index.js";
import { mockCheckoutSession } from "../../mocks/stripe.js";
import redisClient from "../../src/config/redisClient.js";

// --- MOCKS (AVANT TOUT LE RESTE) ---

// Mock robuste de Stripe qui gère le constructeur et les méthodes statiques.
const MOCK_VALID_EVENT = {
  id: `evt_test_${Date.now()}`,
  type: "checkout.session.completed",
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
jest.unstable_mockModule("stripe", () => ({
  default: mockStripeConstructor,
  __esModule: true,
}));

// Simule la fonction `sendMail` pour pouvoir l'espionner dans nos assertions.
const mockSendMail = jest.fn().mockResolvedValue({ success: true });

// Simule la librairie nodemailer au complet en fournissant une implémentation.
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

// Le mock de pdfGenerator reste utile.
jest.mock("../../src/utils/pdfGenerator.js");

describe("Flux E2E complet : Inscription, Paiement et Licence", () => {
  /** @type {supertest.SuperTest<supertest.Test>} */
  let agent;
  let server;

  beforeAll(async () => {
    const { createTestApp } = await import("../helpers/app.js");
    const { app, server: localServer } = createTestApp();
    server = localServer;
    agent = supertest.agent(app);
  });

  afterAll(async () => {

    // Vérification pour éviter l'erreur si le serveur n'a pas démarré
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
    await redisClient.quit();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Nettoie aussi le mock de sendMail avant chaque test.
    mockSendMail.mockClear();
    await pool.query(
      "TRUNCATE companies, users, offers, orders, licenses, payments, processed_webhook_events RESTART IDENTITY CASCADE"
    );
  });

  it("doit gérer le flux complet : inscription, commande, paiement, licence et e-mail", async () => {
    // --- ARRANGE ---
    const offerRes = await pool.query(
      "INSERT INTO offers (name, description, price, duration_months, max_users) VALUES ($1, $2, $3, $4, $5) RETURNING offer_id",
      ["Offre E2E Complète", "Description de test", 150.0, 12, 10]
    );
    const offerId = offerRes.rows[0].offer_id;
    const registrationData = {
      companyData: {
        name: "Ma Super Compagnie E2E",
        email: "contact@super-compagnie-e2e.com",
      },
      adminData: {
        first_name: "Jean",
        last_name: "Dupont",
        email: "admin@super-compagnie-e2e.com",
        password: "passwordSecure123!",
      },
    };

    // --- ACT & ASSERT (Étapes 1-3) ---
    const registrationResponse = await agent
      .post("/api/register/company")
      .send(registrationData);
    expect(registrationResponse.status).toBe(201);
    const adminToken = registrationResponse.body.accessToken;
    const companyId = registrationResponse.body.company.company_id;

    const orderResponse = await agent
      .post("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ offerId });
    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.body.orderId;

    mockCheckoutSession.metadata = { orderId, companyId };

    const checkoutResponse = await agent
      .post("/api/payments/create-checkout-session")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderId });
    expect(checkoutResponse.status).toBe(200);

    // --- ACT (Étape 4: Webhook) ---
    const webhookResponse = await agent
      .post("/api/webhooks/payment")
      .set("stripe-signature", "t=123,v1=fake_signature")
      .send({ type: "checkout.session.completed" });

    expect(webhookResponse.status).toBe(200);

    // --- ASSERT (Étape 5: Création de licence) ---
    const licenseRes = await pool.query(
      "SELECT * FROM licenses WHERE order_id = $1",
      [orderId]
    );
    expect(licenseRes.rowCount).toBe(1);
    expect(licenseRes.rows[0].status).toBe("active");

    // --- ASSERT (Étape 6: Envoi d'email) ---
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const emailOptions = mockSendMail.mock.calls[0][0];
    expect(emailOptions.to).toBe(registrationData.companyData.email);
    expect(emailOptions.subject).toContain("Votre licence Geodiag");
  }, 15000);
});
