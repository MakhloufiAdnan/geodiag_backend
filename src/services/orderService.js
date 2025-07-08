import orderRepository from '../repositories/orderRepository.js';
import offerService from './offerService.js';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from '../dtos/orderDto.js';

class OrderService {
    async createOrder(offerId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Seul un administrateur de compagnie peut passer une commande.');
            error.statusCode = 403;
            throw error;
        }
        const offer = await offerService.getOfferById(offerId);
        if (!offer) {
            const error = new Error("L'offre sélectionnée n'existe pas.");
            error.statusCode = 404;
            throw error;
        }
        const orderData = {
            company_id: authenticatedUser.companyId,
            offer_id: offerId,
            order_number: `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`,
            amount: offer.price,
        };
        const newOrder = await orderRepository.create(orderData);
        return new OrderDto(newOrder);
    }
}
export default new OrderService();