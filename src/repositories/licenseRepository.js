import { db } from '../db/index.js';

class LicenseRepository {
    async create(licenseData, dbClient = db) {
        const { order_id, company_id, qr_code_payload, status, expires_at } = licenseData;
        const { rows } = await dbClient.query(
            `INSERT INTO licenses (order_id, company_id, qr_code_payload, status, expires_at)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [order_id, company_id, qr_code_payload, status, expires_at],
        );
        return rows[0];
    }
    
    async findActiveByCompanyId(companyId) {
        const { rows } = await db.query(
            "SELECT * FROM licenses WHERE company_id = $1 AND status = 'active' AND expires_at > NOW()",
            [companyId]
        );
        return rows[0];
    }
}
export default new LicenseRepository();