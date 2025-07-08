import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';

class OfferService {
    /**
     * Méthode privée pour centraliser la vérification des droits d'administrateur.
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Accès refusé. Droits administrateur requis.');
            error.statusCode = 403; // 403 Forbidden
            throw error;
        }
    }

    async getAllOffers(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offers = await offerRepository.findAllPublic();
        return offers.map(offer => new OfferDto(offer));
    }

    async getOfferById(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offer = await offerRepository.findById(id);
        return offer ? new OfferDto(offer) : null;
    }
}

export default new OfferService();