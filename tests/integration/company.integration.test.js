import { describe, it, expect, afterAll, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour les routes /api/companies.
 * @description Valide la récupération et la protection des routes des compagnies.
 */
describe("Suites de tests pour /api/companies", () => {
    let app, server;
    let adminToken, technicianToken, testCompanyId;

    /**
     * @description Démarre le serveur une seule fois avant tous les tests de cette suite.
     */
    beforeAll(() => {
        const testApp = createTestApp();
        app = testApp.app;
        server = testApp.server;
    });

    /**
     * @description Avant chaque test, nettoie et prépare la base de données avec des données fraîches.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');

        testCompanyId = await createTestCompany('Company Integ Test', 'co-integ@test.com');

        const admin = await createTestUser(testCompanyId, 'admin', 'admin.co@test.com');
        adminToken = admin.token;

        const tech = await createTestUser(testCompanyId, 'technician', 'tech.co@test.com');
        technicianToken = tech.token;
    });

    /**
     * @description Ferme le serveur une seule fois après tous les tests pour éviter les handles ouverts.
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
     * @description Teste si un admin peut récupérer la liste paginée des compagnies.
     */
    it("GET /api/companies - Doit retourner la liste des compagnies pour un admin (200)", async () => {
        const res = await request(app).get('/api/companies').set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    /**
     * @description Teste si un technicien est bien bloqué lors de l'accès à la liste des compagnies.
     */
    it("GET /api/companies - Doit refuser l'accès pour un technicien (403)", async () => {
        const res = await request(app).get('/api/companies').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });

    /**
     * @description Teste si un admin peut récupérer les détails d'une compagnie par son ID.
     */
    it("GET /api/companies/:id - Doit retourner une compagnie par son ID pour un admin (200)", async () => {
        const res = await request(app)
            .get(`/api/companies/${testCompanyId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.companyId).toBe(testCompanyId);
    });
});