import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import redisClient from '../../src/config/redisClient.js'; 

/**
 * @file Tests d'intégration pour le flux d'inscription (/api/register).
 * @see L'application de test est initialisée globalement dans jest.setup.js et accessible via `global.testApp`.
 */
describe('POST /api/register/company', () => {

    /**
     * @description Prépare la base de données avec des utilisateurs de test avant chaque test.
     * Nettoie PostgreSQL ET Redis pour garantir une isolation parfaite des tests.
     */
    beforeEach(async () => {

        // Nettoye les deux sources de données en parallèle
        await Promise.all([
            pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE'),
            redisClient.flushall()
        ]);
    });

    /**
     * @description Ferme le serveur à la fin des tests.
     */
    afterAll(async () => {

        // Fermer le pool de connexions à la base de données
        await pool.end();
    });

    /**
     * @description Teste un scénario d'inscription réussi pour une nouvelle compagnie et son admin.
     */
    it('crée une compagnie et un admin, et retourne un token (201 Created)', async () => {
        
        // Arrange
        const newRegistration = {
            companyData: { name: "Register Co", email: "co@register-test.com" },
            adminData: { email: "admin@register-test.com", password: "password123", first_name: "Reg", last_name: "Ister" }
        };

        // Act
        const response = await request(global.testApp)
            .post('/api/register/company')
            .send(newRegistration);

        // Assert
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('token');
    });

    /**
     * @description Teste la gestion d'erreur lors d'une tentative d'inscription avec un email de compagnie déjà existant.
     */
    it("refuse l'inscription si l'email de la compagnie existe déjà (409 Conflict)", async () => {
        // Arrange : Créer une première compagnie pour occuper l'email.
        const firstRegistration = {
            companyData: { name: "Existing Co", email: "co@conflict.com" },
            adminData: { email: "admin1@conflict.com", password: "password123", first_name: "Admin", last_name: "One" }
        };
        await request(global.testApp).post('/api/register/company').send(firstRegistration);
        
        const conflictingRegistration = {
            companyData: { name: "Another Co", email: "co@conflict.com" }, // <-- Email en conflit
            adminData: { email: "admin2@conflict.com", password: "password123", first_name: "Admin", last_name: "Two" }
        };

        // Act : Tenter d'enregistrer la deuxième compagnie.
        const response = await request(global.testApp)
            .post('/api/register/company')
            .send(conflictingRegistration);

        // Assert
        expect(response.statusCode).toBe(409);
    });
});
