import paymentService from '../services/paymentService.js';
import logger from '../config/logger.js';

/**
 * @description Contrôleur pour la gestion des webhooks de paiement.
 * Gère la réception et la mise en file d'attente des événements de webhook.
 */
class PaymentWebhookController {
  /**
   * @description Gère les événements de webhook entrants.
   * Valide l'événement et le met en file d'attente pour un traitement asynchrone.
   * @param {object} req - L'objet de requête Express, contenant `webhookEvent`.
   * @param {object} res - L'objet de réponse Express.
   * @param {function} next - La fonction next du middleware.
   */
  async handleWebhook(req, res, next) {
    try {
      // Le middleware rawBodyMiddleware attache l'événement de webhook à req.webhookEvent
      await paymentService.queuePaymentWebhook(req.webhookEvent);
      res
        .status(200)
        .send({ message: "Webhook reçu et mis en file d'attente." });
    } catch (error) {
      // Si c'est une ConflictException (événement en double), nous renvoyons 200 car Stripe ne réessaie pas
      // car l'événement a déjà été traité ou est en cours de traitement.
      if (error.statusCode === 409) {
        logger.warn(`Événement en double ignoré : ${req.webhookEvent.id}`);
        res.status(200).send({ message: 'Événement en double ignoré.' });
      } else {
        next(error); // Passe les autres erreurs au middleware de gestion des erreurs
      }
    }
  }
}

export default new PaymentWebhookController();
