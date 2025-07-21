import { describe, it, expect, afterAll, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour le flux de commande (/api/orders).
 */
describe("Suites de tests pour /api/orders", () => {
    let app, server;
    let adminToken, technicianToken, testOfferId;

    /**
     * @description Démarre le serveur une seule fois avant tous les tests de cette suite.
     */
    beforeAll(() => {
        const testApp = createTestApp();
        app = testApp.app;
        server = testApp.server;
    });

    /**
     * @description Avant chaque test, nettoie et prépare la base de données pour le flux de commande.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users, offers, orders RESTART IDENTITY CASCADE');

        const companyId = await createTestCompany('Order Test Co', 'order-co@test.com');

        const admin = await createTestUser(companyId, 'admin', 'admin.order@test.com');
        adminToken = admin.token;

        const tech = await createTestUser(companyId, 'technician', 'tech.order@test.com');
        technicianToken = tech.token;

        const offerRes = await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Order Offer', 199.99, 12) RETURNING offer_id");
        testOfferId = offerRes.rows[0].offer_id;
    });

    /**
     * @description Ferme le serveur à la fin des tests de la suite.
     */
    afterAll(async () => {
        
        // 1. Fermer le serveur HTTP pour arrêter d'accepter de nouvelles requêtes
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }

        // 2. Fermer le pool de connexions à la base de données
        await pool.end();
    });

    describe('POST /api/orders', () => {
        /**
         * @description Vérifie qu'un administrateur peut créer une nouvelle commande.
         */
        it("Doit autoriser un admin à créer une commande (201)", async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ offerId: testOfferId });

            expect(res.statusCode).toBe(201);
            expect(res.body.offerId).toBe(testOfferId);
            expect(res.body.status).toBe('pending');
        });

        /**
         * @description Vérifie qu'un utilisateur avec le rôle 'technician' ne peut pas créer de commande.
         */
        it("Doit refuser à un technicien de créer une commande (403)", async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${technicianToken}`)
                .send({ offerId: testOfferId });

            expect(res.statusCode).toBe(403);
        });
    });
});