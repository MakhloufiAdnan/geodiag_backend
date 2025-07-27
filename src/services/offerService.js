import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';
import { NotFoundException } from '../exceptions/apiException.js';
import redisClient from '../config/redisClient.js';
import logger from '../config/logger.js';

const CACHE_KEY_OFFERS = 'offers:all';
const CACHE_TTL_SECONDS = 3600; // 1 heure

/**
 * @file Gère la logique métier pour les offres commerciales, y compris la gestion du cache.
 * @class OfferService
 */
class OfferService {
  /**
   * Invalide (supprime) le cache contenant la liste de toutes les offres.
   * Cette méthode est appelée après chaque opération d'écriture (création, mise à jour, suppression).
   * @private
   * @returns {Promise<void>}
   */
  async #invalidateOffersCache() {
    try {
      logger.info(`Invalidating cache for key: ${CACHE_KEY_OFFERS}`);
      await redisClient.del(CACHE_KEY_OFFERS);
    } catch (err) {
      logger.error(
        { err },
        "Erreur lors de l'invalidation du cache des offres."
      );
    }
  }

  /**
   * Récupère toutes les offres publiques. Les résultats sont mis en cache.
   * Accessible uniquement aux administrateurs.
   * @returns {Promise<Array<OfferDto>>} Une liste d'offres formatée via DTO.
   */
  async getAllOffers() {
    try {
      const cachedOffers = await redisClient.get(CACHE_KEY_OFFERS);
      if (cachedOffers) {
        logger.info('CACHE HIT pour les offres');
        return JSON.parse(cachedOffers);
      }
    } catch (err) {
      logger.error(
        { err },
        'Erreur lors de la lecture du cache Redis pour les offres.'
      );
    }

    logger.info('CACHE MISS pour les offres. Récupération depuis la BDD.');
    const offersFromDb = await offerRepository.findAllPublic();
    const offersDto = offersFromDb.map((offer) => new OfferDto(offer));

    try {
      await redisClient.set(
        CACHE_KEY_OFFERS,
        JSON.stringify(offersDto),
        'EX',
        CACHE_TTL_SECONDS
      );
    } catch (err) {
      logger.error(
        { err },
        "Erreur lors de l'écriture dans le cache Redis pour les offres."
      );
    }

    return offersDto;
  }

  /**
   * Récupère une offre par son ID.
   * Accessible uniquement aux administrateurs.
   * @param {string} id - L'ID de l'offre à récupérer.
   * @returns {Promise<object>} L'objet offre brut trouvé.
   * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
   * @throws {NotFoundException} Si aucune offre n'est trouvée pour cet ID.
   */
  async getOfferById(id) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundException('Offre non trouvée.');
    }
    return offer;
  }

  /**
   * Crée une nouvelle offre et invalide le cache des offres.
   * @param {object} offerData - Les données de l'offre à créer.
   * @returns {Promise<OfferDto>} La nouvelle offre créée.
   */
  async createOffer(offerData) {
    const newOffer = await offerRepository.create(offerData);
    await this.#invalidateOffersCache();

    return new OfferDto(newOffer);
  }

  /**
   * Met à jour une offre existante et invalide le cache des offres.
   * @param {string} id - L'ID de l'offre à mettre à jour.
   * @param {object} offerData - Les nouvelles données.
   * @returns {Promise<OfferDto>} L'offre mise à jour.
   * @throws {NotFoundException} Si l'offre à mettre à jour n'est pas trouvée.
   */
  async updateOffer(id, offerData) {
    const updatedOffer = await offerRepository.update(id, offerData);
    if (!updatedOffer) {
      throw new NotFoundException('Offre non trouvée pour la mise à jour.');
    }

    await this.#invalidateOffersCache();

    return new OfferDto(updatedOffer);
  }

  /**
   * Supprime une offre et invalide le cache des offres.
   * @param {string} id - L'ID de l'offre à supprimer.
   * @returns {Promise<OfferDto>} L'offre qui a été supprimée.
   * @throws {NotFoundException} Si l'offre à supprimer n'est pas trouvée.
   */
  async deleteOffer(id) {
    const deletedOffer = await offerRepository.delete(id);
    if (!deletedOffer) {
      throw new NotFoundException('Offre non trouvée pour la suppression.');
    }

    await this.#invalidateOffersCache();

    return new OfferDto(deletedOffer);
  }
}

export default new OfferService();
