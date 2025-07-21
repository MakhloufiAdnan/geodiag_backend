import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { generateToken } from '../../src/utils/jwtUtils.js';

/**
 * Crée une compagnie de test et retourne son ID.
 */
export const createTestCompany = async (name, email) => {
    const res = await pool.query(
        "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id",
        [name, email]
    );
    return res.rows[0].company_id;
};

/**
 * Crée un utilisateur de test (admin ou technician) et retourne son ID et son token.
 */
export const createTestUser = async (companyId, role, email) => {
    const password = await bcrypt.hash('password123', 10);
    const res = await pool.query(
        "INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id",
        [companyId, email, password, role]
    );
    const userId = res.rows[0].user_id;
    const token = generateToken({ userId, companyId, role });
    return { userId, token };
};