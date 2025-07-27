import offerService from '../services/offerService.js';

/**
 * @file Gère les requêtes HTTP pour les offres commerciales.
 */
class OfferController {
  /**
   * Récupère la liste des offres publiques.
   * L'autorisation (vérifier si l'utilisateur est un admin) est gérée dans le service.
   */
  async getAllOffers(req, res, next) {
    try {
      const offers = await offerService.getAllOffers(req.user);
      res.status(200).json(offers);
    } catch (error) {
      next(error);
    }
  }
}

export default new OfferController();
