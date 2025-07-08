import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';

class OfferService {
    // Note : La logique d'autorisation pour le CRUD des offres (par un super-admin)
    // serait implémentée ici, mais pour l'instant, on se concentre sur la lecture.
    
    async getPublicOffers() {
        const offers = await offerRepository.findAllPublic();
        return offers.map(offer => new OfferDto(offer));
    }

    async getOfferById(id) {
        return offerRepository.findById(id);
    }
}
export default new OfferService();