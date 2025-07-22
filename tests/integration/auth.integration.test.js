import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import supertest from 'supertest';
import { pool } from '../../src/db/index.js';
import bcrypt from 'bcrypt';

/**
 * @file Tests d'intégration finaux pour le flux d'authentification complet (/api/auth).
 * @description Ce test valide le cycle de vie complet d'une session en utilisant un agent
 * supertest pour simuler un navigateur qui conserve les cookies.
 */
describe('Flux d\'Authentification (/api/auth)', () => {
    let agent;
    const adminEmail = 'final-integration-auth@test.com';
    const adminPassword = 'password123';
    const companyEmail = 'final-auth-co@test.com';

    /**
     * @description Prépare la BDD avec une compagnie et un utilisateur avant tous les tests.
     */
    beforeAll(async () => {
        await pool.query('TRUNCATE companies, users, refresh_tokens RESTART IDENTITY CASCADE');

        const companyRes = await pool.query(
            "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id",
            ['Final Auth Co', companyEmail]
        );
        const companyId = companyRes.rows[0].company_id;

        const passwordHash = await bcrypt.hash(adminPassword, 10);
        
        await pool.query(
            "INSERT INTO users (company_id, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'admin', true)",
            [companyId, adminEmail, passwordHash]
        );
        
        agent = supertest.agent(global.testApp);
    });

    /**
     * @description Nettoie la base de données après les tests.
     */
    afterAll(async () => {
        await pool.query('TRUNCATE companies, users, refresh_tokens RESTART IDENTITY CASCADE');
    });

    let refreshTokenFromLogin;

    describe('1. Connexion (Login)', () => {
        it('POST /login - Doit authentifier, retourner un accessToken et un cookie refreshToken', async () => {
            const response = await agent
                .post('/api/auth/company/login')
                .send({ email: adminEmail, password: adminPassword });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            
            const cookie = response.headers['set-cookie'][0];
            expect(cookie).toContain('refreshToken=');
            expect(cookie).toContain('HttpOnly');
            
            refreshTokenFromLogin = cookie.split(';')[0].split('=')[1];
        });
    });

    describe('2. Rafraîchissement de Session (Refresh)', () => {
        it('POST /refresh - Doit utiliser le cookie pour obtenir un nouvel accessToken', async () => {

            // Ajout d'un délai pour éviter la collision de timestamp JWT
            await new Promise(resolve => setTimeout(resolve, 1100));

            const response = await agent.post('/api/auth/refresh').send();
            
            expect(response.status).toBe(200);
            expect(response.body.accessToken).toBeDefined();
            
            const newCookie = response.headers['set-cookie'][0];
            const newRefreshToken = newCookie.split(';')[0].split('=')[1];
            expect(newRefreshToken).not.toBe(refreshTokenFromLogin);
        });
    });
    
    describe('3. Déconnexion (Logout)', () => {
        it('POST /logout - Doit effacer le cookie et invalider la session', async () => {
            const response = await agent.post('/api/auth/logout').send();
            
            expect(response.status).toBe(204);
            const cookie = response.headers['set-cookie'][0];
            expect(cookie).toContain('refreshToken=;');
            expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
        });
    });

    describe('4. Tentative d\'accès après Déconnexion', () => {
        it('POST /refresh - Doit échouer avec une erreur 401 Unauthorized après une déconnexion', async () => {
            const response = await agent.post('/api/auth/refresh').send();
            
            // Le comportement correct est 401 car le cookie a été supprimé.
            expect(response.status).toBe(401);
        });
    });
});