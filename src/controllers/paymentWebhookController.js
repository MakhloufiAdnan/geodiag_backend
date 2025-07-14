import paymentService from '../services/paymentService.js';

/**
 * @file Gère les requêtes entrantes des webhooks de paiement.
 */
class PaymentWebhookController {
    /**
     * Reçoit, valide et met en file d'attente un événement de webhook pour un traitement asynchrone.
     */
    async handleWebhook(req, res, next) {
        try {
            const event = req.webhookEvent; // L'événement sécurisé attaché par le middleware

            // Met en file d'attente l'événement pour un traitement asynchrone
            await paymentService.queuePaymentWebhook(event);

            // Répond immédiatement à Stripe pour accuser réception
            res.status(200).send({ message: "Webhook reçu et mis en file d'attente." });
        } catch (error) {
            // Si l'erreur est un conflit (doublon), on répond quand même 200
            // car l'événement a déjà été traité ou est en cours de traitement.
            if (error.statusCode === 409) {
                console.log(`Événement en double ignoré : ${req.webhookEvent.id}`);
                res.status(200).send({ message: "Événement en double ignoré." });
            } else {
                next(error);
            }
        }
    }
}

export default new PaymentWebhookController();