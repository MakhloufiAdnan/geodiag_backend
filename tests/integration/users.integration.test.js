import request from 'supertest';
import express from 'express';
import userRoutes from '../../src/routes/userRoutes.js';
import { db, pool } from '../../src/db/index.js';

process.env.NODE_ENV = 'test';

const app = express();
app.use(express.json());
app.use('/api', userRoutes);

describe('Routes CRUD /api/users', () => {
    let testCompanyId;
    let testUserId;

    beforeAll(async () => {
        const { rows } = await db.query(
            "INSERT INTO companies (name, address, email, phone_number) VALUES ('Test Co', '123 Test', 'co@test.com', '123') RETURNING company_id"
        );
        testCompanyId = rows[0].company_id;
    });

    afterAll(async () => {
        
        // Nettoie les tables après tous les tests dans l'ordre inverse
        await db.query('DELETE FROM users');
        await db.query('DELETE FROM companies');
        await pool.end();
    });

    beforeEach(async () => {
        // Crée un utilisateur de test avant chaque test
        const { rows } = await db.query(
            `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
            VALUES ($1, 'user@test.com', 'hashed', 'Jane', 'Doe', 'technician') RETURNING user_id`,
            [testCompanyId]
        );
        testUserId = rows[0].user_id;
    });

    afterEach(async () => {
        // Nettoie les tables après chaque test
        await db.query('DELETE FROM users');
    });

    it('GET /users - doit retourner une liste paginée d\'utilisateurs', async () => {
        const res = await request(app).get('/api/users');
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].email).toBe('user@test.com');
    });

    it('GET /users/:id - doit retourner un utilisateur spécifique', async () => {
        const res = await request(app).get(`/api/users/${testUserId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.userId).toBe(testUserId);
    });

    it('PUT /users/:id - doit mettre à jour un utilisateur', async () => {
        const updatedData = { first_name: 'John' };
        const res = await request(app)
            .put(`/api/users/${testUserId}`)
            .send(updatedData);
            
        expect(res.statusCode).toEqual(200);
        expect(res.body.firstName).toBe('John');
    });

    it('DELETE /users/:id - doit supprimer un utilisateur', async () => {
        const res = await request(app).delete(`/api/users/${testUserId}`);
        expect(res.statusCode).toEqual(204);

        // Vérifie que l'utilisateur a bien été supprimé
        const check = await db.query('SELECT * FROM users WHERE user_id = $1', [testUserId]);
        expect(check.rows).toHaveLength(0);
    });
});