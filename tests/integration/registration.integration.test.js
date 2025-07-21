import { describe, it, expect, afterAll, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour le flux d'inscription (/api/register).
 */
describe("Suites de tests pour /api/register", () => {
    let app, server;

    /**
     * @description Démarre le serveur une seule fois avant tous les tests de cette suite.
     */
    beforeAll(() => {
        const testApp = createTestApp();
        app = testApp.app;
        server = testApp.server;
    });

    /**
     * @description Avant chaque test, vide les tables concernées.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');
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
     * @description Teste un scénario d'inscription réussi pour une nouvelle compagnie et son admin.
     */
    it('POST /register/company - Doit créer une compagnie et un admin, et renvoyer un token (201)', async () => {
        const newRegistration = {
            companyData: { name: "Register Co", email: "co@register-test.com" },
            adminData: { email: "admin@register-test.com", password: "password123", first_name: "Reg", last_name: "Ister" }
        };

        const res = await request(app).post('/api/register/company').send(newRegistration);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    /**
     * @description Teste la gestion d'erreur lors d'une tentative d'inscription avec un email de compagnie déjà existant.
     */
    it("POST /register/company - Doit refuser si l'email de la compagnie existe déjà (409)", async () => {
        const firstRegistration = {
            companyData: { name: "Existing Co", email: "co@conflict.com" },
            adminData: { email: "admin1@conflict.com", password: "password123", first_name: "Admin", last_name: "One" }
        };
        await request(app).post('/api/register/company').send(firstRegistration);

        const conflictingRegistration = {
            companyData: { name: "Another Co", email: "co@conflict.com" }, // Email en conflit
            adminData: { email: "admin2@conflict.com", password: "password123", first_name: "Admin", last_name: "Two" }
        };

        const res = await request(app).post('/api/register/company').send(conflictingRegistration);

        expect(res.statusCode).toBe(409);
    });
});