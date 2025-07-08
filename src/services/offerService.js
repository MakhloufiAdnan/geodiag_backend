import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';

/**
 * @file Gère la logique métier pour les offres commerciales.
 */
class OfferService {
    /**
     * Méthode privée pour s'assurer que l'utilisateur est un admin.
     * @param {object} authenticatedUser - L'utilisateur extrait du token.
     * @private
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Accès refusé. Droits administrateur requis.');
            error.statusCode = 403;
            throw error;
        }
    }

    /**
     * Récupère toutes les offres publiques (accessible aux admins).
     * @param {object} authenticatedUser - L'utilisateur qui fait la requête.
     * @returns {Promise<Array<OfferDto>>} Une liste d'offres.
     */
    async getAllOffers(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offers = await offerRepository.findAllPublic();
        return offers.map(offer => new OfferDto(offer));
    }

    /**
     * Récupère une offre par son ID.
     * @param {string} id - L'ID de l'offre.
     * @returns {Promise<object|null>} L'offre brute ou null.
     */
    async getOfferById(id) {
        // Pas de vérification de droits ici, car la méthode est appelée par d'autres services
        // qui ont déjà validé l'autorisation.
        return offerRepository.findById(id);
    }
}

export default new OfferService();