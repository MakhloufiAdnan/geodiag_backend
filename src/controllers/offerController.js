/**
 * @file Gère les requêtes HTTP pour les offres commerciales.
 * @description Ce contrôleur gère uniquement le point d'accès public pour la
 * consultation des offres. La logique métier et l'autorisation pour la gestion
 * des offres sont gérées par l'API GraphQL.
 */
import offerService from '../services/offerService.js';

class OfferController {
  /**
   * Gère la requête pour récupérer la liste des offres publiques.
   * @description Ce handler est destiné à une route publique. Il n'effectue aucune
   * vérification d'autorisation et appelle une méthode de service dédiée
   * pour ne récupérer que les offres marquées comme "publiques".
   * @param {import('express').Request} req - L'objet de requête Express.
   * @param {import('express').Response} res - L'objet de réponse Express.
   * @param {import('express').NextFunction} next - La fonction middleware suivante.
   */
  async getAllOffers(req, res, next) {
    try {
      // Appelle une méthode spécifique pour les offres publiques.
      const offers = await offerService.getAllPublicOffers();

      res.status(200).json(offers);
    } catch (error) {
      // Toute erreur est transmise au gestionnaire d'erreurs global.
      next(error);
    }
  }
}

export default new OfferController();
