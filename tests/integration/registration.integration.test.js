import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour le flux d'inscription.
 * @description Valide la création de compagnies et d'admins via l'endpoint public.
 */
const { app, server } = createTestApp();

describe("Tests d'intégration pour /api/register", () => {
    
    /**
     * Avant chaque test, nettoie les tables pour garantir une isolation complète.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');
    });

    /**
     * À la fin de tous les tests de cette suite, ferme la connexion à la base de données.
     */
    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
        await pool.end();
    });

    /**
     * @it Doit créer une compagnie et un admin avec des données valides, et renvoyer un statut 201 avec un token.
     */
    it('POST /register/company - Doit créer une compagnie et un admin, et renvoyer un token (201)', async () => {

        // Arrange
        const newRegistration = {
            companyData: { name: "Register Co", email: "co@register-test.com" },
            adminData: { email: "admin@register-test.com", password: "password123", first_name: "Reg", last_name: "Ister" }
        };

        // Act
        const res = await request(app).post('/api/register/company').send(newRegistration);
        
        // Assert
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
    });

    /**
     * @it Doit refuser la création si l'email de la compagnie existe déjà (statut 409).
     */
    it("POST /register/company - Doit refuser si l'email existe déjà (409)", async () => {

        // Arrange: Créer d'abord une compagnie pour provoquer le conflit.
        await request(app).post('/api/register/company').send({
            companyData: { name: "Existing Co", email: "co@conflict.com" },
            adminData: { email: "admin1@conflict.com", password: "password123", first_name: "Admin", last_name: "One" }
        });
        
        const conflictingRegistration = {
            companyData: { name: "Another Co", email: "co@conflict.com" }, // Email en conflit
            adminData: { email: "admin2@conflict.com", password: "password123", first_name: "Admin", last_name: "Two" }
        };

        // Act
        const res = await request(app).post('/api/register/company').send(conflictingRegistration);
        
        // Assert
        expect(res.statusCode).toBe(409);
    });
});