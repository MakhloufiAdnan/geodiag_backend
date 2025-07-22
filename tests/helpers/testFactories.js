/**
 * @file Fonctions utilitaires ("factories") pour créer des entités de test
 * dans la base de données (compagnies, utilisateurs, etc.).
 */

import bcrypt from 'bcrypt';
import { pool } from '../../src/db/index.js';
import { generateAccessToken } from '../../src/utils/jwtUtils.js';

/**
 * Crée une compagnie de test et retourne son ID.
 * @param {string} name - Le nom de la compagnie.
 * @param {string} email - L'email de la compagnie.
 * @returns {Promise<string>} L'ID de la compagnie créée.
 */
export const createTestCompany = async (name, email) => {
    const res = await pool.query(
        "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id",
        [name, email]
    );
    return res.rows[0].company_id;
};

/**
 * Crée un utilisateur de test (admin ou technician) et retourne son ID et son accessToken.
 * @param {string} companyId - L'ID de la compagnie parente.
 * @param {'admin' | 'technician'} role - Le rôle de l'utilisateur.
 * @param {string} email - L'email de l'utilisateur.
 * @returns {Promise<{userId: string, token: string}>} L'ID de l'utilisateur et son accessToken.
 */
export const createTestUser = async (companyId, role, email) => {
    const password = await bcrypt.hash('password123', 10);
    const res = await pool.query(
        "INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id",
        [companyId, email, password, role]
    );
    const userId = res.rows[0].user_id;
    const token = generateAccessToken({ userId, companyId, role });
    return { userId, token };
};