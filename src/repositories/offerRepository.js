import { db } from '../db/index.js';

class OfferRepository {
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM offers WHERE offer_id = $1', [id]);
        return rows[0];
    }

    async findAllPublic() {
        const { rows } = await db.query("SELECT * FROM offers WHERE is_public = true ORDER BY price");
        return rows;
    }
}
export default new OfferRepository();

// ------------------------------------------------------------------------

// FILE: src/dtos/offerDto.js
// Rôle : Formate les données d'une offre pour l'API.
export class OfferDto {
    constructor(offer) {
        this.offerId = offer.offer_id;
        this.name = offer.name;
        this.description = offer.description;
        this.price = offer.price;
        this.durationMonths = offer.duration_months;
        this.maxUsers = offer.max_users;
    }
}