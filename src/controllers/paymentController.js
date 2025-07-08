import paymentService from '../services/paymentService.js';

class PaymentController {
    async createCheckoutSession(req, res, next) {
        try {
            const { orderId } = req.body;
            const session = await paymentService.createCheckoutSession(orderId, req.user);
            res.status(200).json(session);
        } catch (error) {
            next(error);
        }
    }
}
export default new PaymentController();