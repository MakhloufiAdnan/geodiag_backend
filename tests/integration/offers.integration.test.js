import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { createTestApp } from '../helpers/app.js';
import { generateToken } from '../../src/utils/jwtUtils.js';

/**
 * @file Tests d'intégration pour les routes /api/offers.
 * @description Valide l'accès et les règles d'autorisation sur les offres.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';

const app = createTestApp();

describe("Tests d'intégration pour /api/offers", () => {
    let adminToken, technicianToken;

    /**
     * Avant chaque test, nettoie la base et la repeuple avec des données fraîches.
     */
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE companies, users, offers RESTART IDENTITY CASCADE');
        
        const companyRes = await pool.query("INSERT INTO companies (name, email) VALUES ('Offer Test Co', 'offer-co@test.com') RETURNING company_id");
        const companyId = companyRes.rows[0].company_id;

        const adminPassword = await bcrypt.hash('password123', 10);
        const adminRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'admin.offer@test.com', $2, 'admin') RETURNING user_id", [companyId, adminPassword]);
        adminToken = generateToken({ userId: adminRes.rows[0].user_id, companyId: companyId, role: 'admin' });
        
        const techPassword = await bcrypt.hash('password123', 10);
        const techRes = await pool.query("INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, 'tech.offer@test.com', $2, 'technician') RETURNING user_id", [companyId, techPassword]);
        technicianToken = generateToken({ userId: techRes.rows[0].user_id, companyId: companyId, role: 'technician' });

        await pool.query("INSERT INTO offers (name, price, duration_months) VALUES ('Offre Test', 99.99, 12)");
    });

    afterAll(async () => {
        await pool.end();
    });

    it("GET /api/offers - Doit retourner la liste des offres pour un admin (200)", async () => {
        const res = await request(app).get('/api/offers').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it("GET /api/offers - Doit refuser l'accès pour un technicien (403)", async () => {
        const res = await request(app).get('/api/offers').set('Authorization', `Bearer ${technicianToken}`);
        expect(res.statusCode).toBe(403);
    });
});