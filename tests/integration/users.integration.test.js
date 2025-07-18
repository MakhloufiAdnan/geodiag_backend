import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { generateToken } from '../../src/utils/jwtUtils.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

/**
 * @file Tests d'intégration pour les routes /api/users.
 * @description Valide les opérations CRUD et les règles d'autorisation sur les utilisateurs.
 */
const app = createTestApp();

describe("Tests d'intégration pour /api/users", () => {
    let adminToken, technicianToken, testCompanyId, testUserId;

    /**
     * Avant chaque test, nettoie la base et la repeuple avec des données fraîches.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');

        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('User Test Co', 'user-co@test.com') RETURNING company_id");
        testCompanyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'admin.user@test.com', $2, 'admin') RETURNING user_id", [testCompanyId, adminPassword]);
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: testCompanyId, role: 'admin' });

        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'tech.user@test.com', $2, 'technician') RETURNING user_id", [testCompanyId, techPassword]);
        testUserId = techRes.rows[0].user_id;
        technicianToken = generateToken({ userId: testUserId, companyId: testCompanyId, role: 'technician' });
    });

    afterAll(async () => {
        await pool.end();
    });

    it("GET /api/users - Doit retourner la liste des utilisateurs pour un admin (200)", async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("GET /api/users - Doit refuser l'accès pour un non-admin (403)", async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });

    it("GET /api/users/:id - Doit autoriser un technicien à voir son propre profil (200)", async () => {
        const res = await request(app).get(`/api/users/${testUserId}`).set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.userId).toBe(testUserId);
    });
});