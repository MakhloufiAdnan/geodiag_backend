import { db } from '../db/index.js';

class LicenseRepository {
    async findActiveByCompanyId(companyId) {
        // TODO: Implémenter la vraie logique de requête SQL.
        // Cette requête doit vérifier que la licence existe, que son statut est 'active'
        // et que sa date d'expiration (expires_at) n'est pas dans le passé.
        console.log(`Vérification de la licence pour la compagnie ${companyId}...`);
        
        const { rows } = await db.query(
            "SELECT * FROM licenses WHERE company_id = $1 AND status = 'active' AND expires_at > NOW()",
            [companyId]
        );
        
        return rows[0]; // Retourne la licence si elle est trouvée et active, sinon undefined.
    }
}

export default new LicenseRepository();