import { describe, it, expect, afterAll, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { createTestCompany, createTestUser } from '../helpers/testFactories.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour les routes de gestion des utilisateurs (/api/users).
 */
describe("Suites de tests pour /api/users", () => {
    let app, server;
    let adminToken, technicianToken, testUserId;

    /**
     * @description Démarre le serveur une seule fois avant tous les tests de cette suite.
     */
    beforeAll(() => {
        const testApp = createTestApp();
        app = testApp.app;
        server = testApp.server;
    });

    /**
     * @description Avant chaque test, prépare la base de données avec une compagnie, un admin et un technicien.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');

        const testCompanyId = await createTestCompany('User Test Co', 'user-co@test.com');

        const admin = await createTestUser(testCompanyId, 'admin', 'admin.user@test.com');
        adminToken = admin.token;

        const tech = await createTestUser(testCompanyId, 'technician', 'tech.user@test.com');
        technicianToken = tech.token;
        testUserId = tech.userId;
    });

    /**
     * @description Ferme le serveur à la fin des tests.
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
     * @description Vérifie qu'un admin peut obtenir la liste de tous les utilisateurs.
     */
    it("GET /api/users - Doit retourner la liste paginée des utilisateurs pour un admin (200)", async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        expect(res.body).toHaveProperty('meta');
    });

    /**
     * @description Vérifie qu'un utilisateur non-admin (technicien) ne peut pas lister les utilisateurs.
     */
    it("GET /api/users - Doit refuser l'accès pour un non-admin (403)", async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });

    /**
     * @description Vérifie qu'un utilisateur peut consulter son propre profil.
     */
    it("GET /api/users/:id - Doit autoriser un technicien à voir son propre profil (200)", async () => {
        const res = await request(app).get(`/api/users/${testUserId}`).set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.userId).toBe(testUserId);
    });
});