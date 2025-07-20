import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { generateToken } from '../../src/utils/jwtUtils.js';

/**
 * @file Tests d'intégration pour les routes /api/companies.
 * @description Valide l'accès et les règles d'autorisation sur les compagnies.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

const { app, server } = createTestApp();

describe("Tests d'intégration pour /api/companies", () => {
    let adminToken, technicianToken, testCompanyId;

    /**
     * Avant chaque test, nettoie la base et la repeuple avec des données fraîches.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE');
        
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Company Integ Test', 'co-integ@test.com') RETURNING company_id");
        testCompanyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'admin.co@test.com', $2, 'admin') RETURNING user_id", [testCompanyId, adminPassword]);
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: testCompanyId, role: 'admin' });

        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'tech.co@test.com', $2, 'technician') RETURNING user_id", [testCompanyId, techPassword]);
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: testCompanyId, role: 'technician' });
    });

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
        await pool.end();
    });

    it("GET /api/companies - Doit retourner la liste des compagnies pour un admin (200)", async () => {
        const res = await request(app).get('/api/companies').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/companies - Doit refuser l'accès pour un technicien (403)", async () => {
        const res = await request(app).get('/api/companies').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });

    it("GET /api/companies/:id - Doit retourner une compagnie par son ID pour un admin (200)", async () => {
        const res = await request(app)
            .get(`/api/companies/${testCompanyId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.companyId).toBe(testCompanyId);
    });
});