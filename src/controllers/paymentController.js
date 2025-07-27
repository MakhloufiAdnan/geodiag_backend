import paymentService from '../services/paymentService.js';

/**
 * @file Gère les requêtes HTTP pour l'initiation d'un paiement.
 */
class PaymentController {
  /**
   * Crée une session de paiement sécurisée (ex: Stripe) pour une commande.
   */
  async createCheckoutSession(req, res, next) {
    try {
      const { orderId } = req.body;
      const session = await paymentService.createCheckoutSession(
        orderId,
        req.user
      );
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
