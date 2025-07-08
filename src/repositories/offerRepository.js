import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité Offer.
 */
class OfferRepository {
    /**
     * Trouve une offre par son ID.
     * @param {string} id - L'ID de l'offre.
     * @returns {Promise<object|undefined>} L'objet offre s'il est trouvé.
     */
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM offers WHERE offer_id = $1', [id]);
        return rows[0];
    }

    /**
     * Récupère toutes les offres marquées comme publiques.
     * @returns {Promise<Array<object>>} Un tableau des offres publiques.
     */
    async findAllPublic() {
        const { rows } = await db.query("SELECT * FROM offers WHERE is_public = true ORDER BY price");
        return rows;
    }
}

export default new OfferRepository();