/**
 * @file Tests d'intégration pour le flux d'authentification complet (/api/auth).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { pool } from '../../src/db/index.js';
import bcrypt from 'bcrypt';
import { setupIntegrationTest } from '../helpers/integrationTestSetup.js';
import redisClient from '../../src/config/redisClient.js';

describe('Flux d\'Authentification (/api/auth)', () => {
    const getAgent = setupIntegrationTest();
    let agent;

    const adminEmail = 'final-integration-auth@test.com';
    const adminPassword = 'password123';

    beforeAll(async () => {
        await pool.query('TRUNCATE companies, users, refresh_tokens RESTART IDENTITY CASCADE');
        const companyRes = await pool.query(
            "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id",
            ['Final Auth Co', 'final-auth-co@test.com']
        );
        const companyId = companyRes.rows[0].company_id;
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
            "INSERT INTO users (company_id, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'admin', true)",
            [companyId, adminEmail, passwordHash]
        );
    });
    
    beforeEach(() => {
        agent = getAgent();
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    let refreshTokenFromLogin;

    describe('1. Connexion (Login)', () => {
        it('POST /login - Doit authentifier, retourner un accessToken et un cookie refreshToken', async () => {
            // Arrange
            const credentials = { email: adminEmail, password: adminPassword };

            // Act
            const response = await agent
                .post('/api/auth/company/login')
                .send(credentials);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            const cookie = response.headers['set-cookie'][0];
            expect(cookie).toContain('refreshToken=');
            
            refreshTokenFromLogin = cookie.split(';')[0].split('=')[1];
        });
    });

    describe('2. Rafraîchissement de Session (Refresh)', () => {
        it('POST /refresh - Doit utiliser le cookie pour obtenir un nouvel accessToken', async () => {
            // Arrange
            // Le cookie est conservé par l'agent. Un délai est ajouté pour éviter les collisions de timestamp JWT.
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // Act
            const response = await agent.post('/api/auth/refresh').send();
            
            // Assert
            expect(response.status).toBe(200);
            expect(response.body.accessToken).toBeDefined();
            const newCookie = response.headers['set-cookie'][0];
            const newRefreshToken = newCookie.split(';')[0].split('=')[1];
            expect(newRefreshToken).not.toBe(refreshTokenFromLogin);
        });
    });
    
    describe('3. Déconnexion (Logout)', () => {
        it('POST /logout - Doit effacer le cookie et invalider la session', async () => {
            // Arrange : L'agent a toujours une session active.

            // Act
            const response = await agent.post('/api/auth/logout').send();
            
            // Assert
            expect(response.status).toBe(204);
            const cookie = response.headers['set-cookie'][0];
            expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
        });
    });

    describe('4. Tentative d\'accès après Déconnexion', () => {
        it('POST /refresh - Doit échouer avec une erreur 401 Unauthorized après une déconnexion', async () => {
            // Arrange : L'agent a un cookie de session expiré.

            // Act
            const response = await agent.post('/api/auth/refresh').send();
            
            // Assert
            expect(response.status).toBe(401);
        });
    });
});