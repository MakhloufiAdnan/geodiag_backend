import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité License.
 */
class LicenseRepository {
    /**
     * Crée une nouvelle licence.
     * @param {object} licenseData - Les données de la licence à créer.
     * @param {object} [dbClient=db] - Un client de base de données optionnel pour les transactions.
     * @returns {Promise<object>} L'objet de la licence nouvellement créée.
     */
    async create(licenseData, dbClient = db) {
        const { order_id, company_id, qr_code_payload, status, expires_at } = licenseData;
        const { rows } = await dbClient.query(
            `INSERT INTO licenses (order_id, company_id, qr_code_payload, status, expires_at)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [order_id, company_id, qr_code_payload, status, expires_at],
        );
        return rows[0];
    }
    
    /**
     * Trouve une licence active pour une compagnie donnée.
     * Une licence est considérée comme active si son statut est 'active' et si sa date
     * d'expiration n'est pas encore passée.
     * @param {string} companyId - L'ID de la compagnie.
     * @returns {Promise<object|undefined>} L'objet licence s'il est trouvé, sinon undefined.
     */
    async findActiveByCompanyId(companyId) {
        const { rows } = await db.query(
            "SELECT * FROM licenses WHERE company_id = $1 AND status = 'active' AND expires_at > NOW()",
            [companyId]
        );
        return rows[0];
    }
}

export default new LicenseRepository();