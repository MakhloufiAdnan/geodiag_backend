import paymentService from '../services/paymentService.js';

class PaymentWebhookController {
    async handleWebhook(req, res, next) {
        try {
            const event = req.webhookEvent;
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