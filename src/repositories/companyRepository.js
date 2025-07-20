import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité Company.
 * @description Ce repository est la seule couche qui interagit directement
 * avec la table "companies" de la base de données.
 */
class CompanyRepository {
    /**
     * Trouve une compagnie par son identifiant unique (UUID).
     * @param {string} id - L'ID de la compagnie à trouver.
     * @returns {Promise<object|undefined>} L'objet compagnie s'il est trouvé, sinon undefined.
     */
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM companies WHERE company_id = $1', [id]);
        return rows[0];
    }

    /**
     * Trouve une compagnie par son adresse email.
     * @param {string} email - L'email de la compagnie à trouver.
     * @returns {Promise<object|undefined>} L'objet compagnie s'il est trouvé, sinon undefined.
     */
    async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM companies WHERE email = $1', [email]);
        return rows[0];
    }

    /**
     * Crée une nouvelle compagnie dans la base de données.
     * @param {object} companyData - Les données de la compagnie à créer.
     * @param {object} [dbClient=db] - Un client de base de données optionnel pour les transactions.
     * @returns {Promise<object>} L'objet de la compagnie nouvellement créée.
     */
    async create(companyData, dbClient = db) {
        const { name, address, email, phone_number } = companyData;
        const { rows } = await dbClient.query(
            `INSERT INTO companies (name, address, email, phone_number)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, address, email, phone_number]
        );
        return rows[0];
    }

    /**
     * Trouve plusieurs compagnies par leurs ID.
     * @param {Array<string>} ids - Un tableau d'ID de compagnies.
     * @returns {Promise<Array<object>>} Un tableau de compagnies.
     */
    async findByIds(ids) {
        const { rows } = await db.query('SELECT * FROM companies WHERE company_id = ANY($1::uuid[])', [ids]);
        return rows;
    }

    /**
     * Récupère une liste paginée de toutes les compagnies de la base de données.
     * @param {number} limit - Le nombre de compagnies par page.
     * @param {number} offset - Le décalage pour la pagination.
     * @returns {Promise<Array<object>>} Un tableau de compagnies.
     */
    async findAll(limit, offset) {
        const { rows } = await db.query(
            'SELECT * FROM companies ORDER BY name LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return rows;
    }

    /**
     * Compte le nombre total de compagnies.
     * @returns {Promise<number>} Le nombre total de compagnies.
     */
    async countAll() {
        const { rows } = await db.query('SELECT COUNT(*) FROM companies');
        return parseInt(rows[0].count, 10);
    }
}

export default new CompanyRepository();