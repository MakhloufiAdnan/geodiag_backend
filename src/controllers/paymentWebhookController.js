import paymentService from '../services/paymentService.js';
import logger from '../config/logger.js';

/**
 * @file Gère les requêtes HTTP relatives aux webhooks de paiement.
 * @description Ce contrôleur délègue la logique métier au service de paiement
 * et gère les réponses HTTP correspondantes.
 * @requires paymentService - Le service qui contient la logique de traitement des webhooks.
 * @requires logger - Le service de logging pour tracer les événements.
 */
class PaymentWebhookController {
  /**
   * Gère la réception d'un événement webhook Stripe validé.
   *
   * @description Ce handler est le cœur de la réception des webhooks. Il suit les meilleures
   * pratiques recommandées par Stripe :
   * 1. Il suppose qu'un middleware en amont (`webhookAuthMiddleware`) a déjà validé la
   * signature de l'événement et l'a attaché à `req.webhookEvent`.
   * 2. Il passe immédiatement l'événement au `paymentService` pour le mettre en file d'attente.
   * 3. Il renvoie une réponse `200 OK` à Stripe le plus vite possible pour accuser réception.
   * 4. Il gère spécifiquement les erreurs de conflit (doublons) pour garantir l'idempotence.
   *
   * @param {import('express').Request & { webhookEvent: import('stripe').Stripe.Event }} req - L'objet de requête Express, enrichi avec l'événement webhook validé.
   * @param {import('express').Response} res - L'objet de réponse Express.
   * @param {import('express').NextFunction} next - La fonction pour passer au middleware suivant en cas d'erreur.
   * @returns {Promise<void>}
   */
  async handleWebhook(req, res, next) {
    try {
      // L'événement sécurisé et validé est récupéré depuis la requête.
      const event = req.webhookEvent;

      // L'événement est mis en file d'attente pour un traitement asynchrone.
      // Cette approche découple la réception de la logique métier, rendant le système plus résilient.
      await paymentService.queuePaymentWebhook(event);

      // Une réponse 200 est envoyée immédiatement à Stripe pour accuser réception.
      // Evite que Stripe ne considère l'appel comme un échec et ne le réessaie.
      res
        .status(200)
        .send({ message: "Webhook reçu et mis en file d'attente." });
    } catch (error) {
      // Gestion spécifique de l'idempotence : si le service renvoie une erreur de conflit
      // (car l'événement a déjà été traité), on considère que c'est un succès du point de vue de Stripe.
      if (error.statusCode === 409) {
        logger.warn(
          { eventId: req.webhookEvent.id },
          'Événement webhook en double ignoré.'
        );
        res.status(200).send({ message: 'Événement en double ignoré.' });
      } else {
        // Pour toute autre erreur (ex: panne de la base de données lors de la mise en file d'attente),
        // on la propage au gestionnaire d'erreurs global. Stripe réessaiera d'envoyer le webhook.
        next(error);
      }
    }
  }
}

export default new PaymentWebhookController();
