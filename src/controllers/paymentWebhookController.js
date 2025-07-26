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
     * Gère la réception d'un événement webhook Stripe.
     * La validation de la signature du webhook est supposée avoir été effectuée
     * par un middleware en amont, qui attache l'événement validé à `req.webhookEvent`.
     *
     * @method handleWebhook
     * @param {import('express').Request & { webhookEvent: object }} req - L'objet de requête Express, enrichi avec l'événement webhook validé.
     * @param {import('express').Response} res - L'objet de réponse Express.
     * @param {import('express').NextFunction} next - La fonction pour passer au middleware suivant en cas d'erreur.
     * @returns {Promise<void>}
     */
    async handleWebhook(req, res, next) {
        try {
            // L'événement sécurisé est récupéré depuis la requête
            const event = req.webhookEvent;

            // L'événement est mis en file d'attente pour un traitement asynchrone.
            // Le service gère la logique d'idempotence.
            await paymentService.queuePaymentWebhook(event);

            // Une réponse 200 est envoyée immédiatement à Stripe pour accuser réception.
            res.status(200).send({ message: "Webhook reçu et mis en file d'attente." });
        } catch (error) {
          
            if (error.statusCode === 409) {
                logger.warn({ eventId: req.webhookEvent.id }, 'Événement webhook en double ignoré.');
                res.status(200).send({ message: 'Événement en double ignoré.' });
            } else {
                next(error);
            }
        }
    }
}

export default new PaymentWebhookController();