import { describe, it, expect, afterAll, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour les routes /api/offers.
 * @description Valide l'accès et les règles d'autorisation sur les offres.
 */
describe("Suites de tests pour /api/offers", () => {
    let app, server;
    let adminToken, technicianToken;

    /**
     * @description Démarre le serveur une seule fois avant tous les tests de cette suite.
     */
    beforeAll(() => {
        const testApp = createTestApp();
        app = testApp.app;
        server = testApp.server;
    });

    /**
     * @description Avant chaque test, nettoie et prépare la base de données.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users, offers RESTART IDENTITY CASCADE');

        const companyId = await createTestCompany('Offer Test Co', 'offer-co@test.com');

        const admin = await createTestUser(companyId, 'admin', 'admin.offer@test.com');
        adminToken = admin.token;

        const tech = await createTestUser(companyId, 'technician', 'tech.offer@test.com');
        technicianToken = tech.token;

        await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)");
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

    /**
     * @description Teste si un admin peut lister toutes les offres disponibles.
     */
    it("GET /api/offers - Doit retourner la liste des offres pour un admin (200)", async () => {
        const res = await request(app).get('/api/offers').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    /**
     * @description Teste si un technicien ne peut pas accéder à la liste des offres.
     */
    it("GET /api/offers - Doit refuser l'accès pour un technicien (403)", async () => {
        const res = await request(app).get('/api/offers').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });
});