import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';
import { ForbiddenException, NotFoundException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour les offres commerciales.
 * @class OfferService
 */
class OfferService {
    /**
     * Vérifie si l'utilisateur authentifié a le rôle d'administrateur.
     * @private
     * @param {object} authenticatedUser - L'objet utilisateur issu du token.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Accès refusé. Droits administrateur requis.');
        }
    }

    /**
     * Récupère toutes les offres publiques. Accessible uniquement aux administrateurs.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<Array<OfferDto>>} Une liste d'offres formatée via DTO.
     */
    async getAllOffers(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offers = await offerRepository.findAllPublic();
        return offers.map(offer => new OfferDto(offer));
    }

    /**
     * Récupère une offre par son ID. Accessible uniquement aux administrateurs.
     * @param {string} id - L'ID de l'offre à récupérer.
     * @param {object} authenticatedUser - L'utilisateur effectuant la requête.
     * @returns {Promise<object>} L'objet offre brut trouvé.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
     * @throws {NotFoundException} Si aucune offre n'est trouvée pour cet ID.
     */
    async getOfferById(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const offer = await offerRepository.findById(id);
        if (!offer) {
            throw new NotFoundException('Offre non trouvée.');
        }
        return offer;
    }
}

export default new OfferService();
