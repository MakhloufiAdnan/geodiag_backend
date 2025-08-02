/**
 * @file Gère la logique métier pour les offres commerciales.
 * @description Ce service orchestre la récupération des offres, la gestion du cache
 * pour les données publiques, et les opérations CRUD pour l'administration.
 */
import offerRepository from '../repositories/offerRepository.js';
import { OfferDto } from '../dtos/offerDto.js';
import { NotFoundException } from '../exceptions/ApiException.js';
import redisClient from '../config/redisClient.js';
import logger from '../config/logger.js';

const CACHE_KEY_PUBLIC_OFFERS = 'offers:public';
const CACHE_TTL_SECONDS = 3600; // 1 heure

class OfferService {
  /**
   * Invalide le cache des offres publiques.
   * @private
   */
  async #invalidatePublicOffersCache() {
    try {
      logger.info(`Invalidating cache for key: ${CACHE_KEY_PUBLIC_OFFERS}`);
      await redisClient.del(CACHE_KEY_PUBLIC_OFFERS);
    } catch (err) {
      logger.error(
        { err },
        "Erreur lors de l'invalidation du cache des offres publiques."
      );
    }
  }

  /**
   * Récupère TOUTES les offres (publiques et privées) pour l'admin de la plateforme.
   * @returns {Promise<Array<OfferDto>>}
   */
  async getAllOffers() {
    const offersFromDb = await offerRepository.findAll();
    return offersFromDb.map((offer) => new OfferDto(offer));
  }

  /**
   * Récupère UNIQUEMENT les offres publiques, avec une stratégie de cache.
   * @returns {Promise<Array<OfferDto>>}
   */
  async getAllPublicOffers() {
    try {
      const cachedOffers = await redisClient.get(CACHE_KEY_PUBLIC_OFFERS);
      if (cachedOffers) {
        logger.info('CACHE HIT pour les offres publiques');
        return JSON.parse(cachedOffers);
      }
    } catch (err) {
      logger.error({ err }, 'Erreur lors de la lecture du cache Redis.');
    }

    logger.info(
      'CACHE MISS pour les offres publiques. Récupération depuis la BDD.'
    );
    const offersFromDb = await offerRepository.findAllPublic();
    const offersDto = offersFromDb.map((offer) => new OfferDto(offer));

    try {
      await redisClient.set(
        CACHE_KEY_PUBLIC_OFFERS,
        JSON.stringify(offersDto),
        'EX',
        CACHE_TTL_SECONDS
      );
    } catch (err) {
      logger.error({ err }, "Erreur lors de l'écriture dans le cache Redis.");
    }

    return offersDto;
  }

  /**
   * Récupère une offre unique par son ID.
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getOfferById(id) {
    const offer = await offerRepository.findById(id);
    if (!offer) throw new NotFoundException('Offre non trouvée.');
    return offer;
  }

  /**
   * Crée une nouvelle offre.
   * @param {object} offerData
   * @returns {Promise<OfferDto>}
   */
  async createOffer(offerData) {
    const newOffer = await offerRepository.create(offerData);
    await this.#invalidatePublicOffersCache();
    return new OfferDto(newOffer);
  }

  /**
   * Met à jour une offre existante.
   * @param {string} id
   * @param {object} offerData
   * @returns {Promise<OfferDto>}
   */
  async updateOffer(id, offerData) {
    const updatedOffer = await offerRepository.update(id, offerData);
    if (!updatedOffer)
      throw new NotFoundException('Offre à mettre à jour non trouvée.');
    await this.#invalidatePublicOffersCache();
    return new OfferDto(updatedOffer);
  }

  /**
   * Supprime une offre.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteOffer(id) {
    const deletedOffer = await offerRepository.delete(id);
    if (!deletedOffer)
      throw new NotFoundException('Offre à supprimer non trouvée.');
    await this.#invalidatePublicOffersCache();
    return true;
  }
}

export default new OfferService();
