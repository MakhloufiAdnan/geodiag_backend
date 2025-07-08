import orderService from '../services/orderService.js';

class OrderController {
    async createOrder(req, res, next) {
        try {
            const { offerId } = req.body;
            const newOrder = await orderService.createOrder(offerId, req.user);
            res.status(201).json(newOrder);
        } catch (error) {
            next(error);
        }
    }
}
export default new OrderController();
