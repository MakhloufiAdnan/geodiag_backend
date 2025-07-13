import orderRepository from '../repositories/orderRepository.js';
import offerService from './offerService.js';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from '../dtos/orderDto.js';
import { ForbiddenException, NotFoundException } from '../exceptions/apiException.js';

class OrderService {
    async createOrder(offerId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Seul un administrateur de compagnie peut passer une commande.');
        }

        const offer = await offerService.getOfferById(offerId, authenticatedUser);
        
        // Vérification pour gérer le cas où l'offre est introuvable.
        if (!offer) {
            throw new NotFoundException("L'offre sélectionnée n'existe pas.");
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
