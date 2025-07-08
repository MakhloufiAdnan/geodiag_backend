import paymentService from '../services/paymentService.js';

/**
 * @file Gère les requêtes entrantes des webhooks de paiement.
 */
class PaymentWebhookController {
    /**
     * Traite un événement de webhook après sa validation par le middleware.
     */
    async handleWebhook(req, res, next) {
        try {
            const event = req.webhookEvent; // L'événement sécurisé attaché par le middleware
            if (event.type === 'checkout.session.completed') {
                await paymentService.handleSuccessfulPayment(event.data.object);
            }
            res.status(200).send({ message: "Webhook traité." });
        } catch (error) {
            next(error);
        }
    }
}

export default new PaymentWebhookController();
