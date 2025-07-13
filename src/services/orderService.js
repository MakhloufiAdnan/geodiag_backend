import orderRepository from '../repositories/orderRepository.js';
import offerService from './offerService.js';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from '../dtos/orderDto.js';

/**
 * @file Gère la logique métier pour les commandes.
 */
class OrderService {
    /**
     * Crée une nouvelle commande pour une compagnie.
     * @param {string} offerId - L'ID de l'offre choisie.
     * @param {object} authenticatedUser - L'admin de la compagnie qui passe la commande.
     * @returns {Promise<OrderDto>} La nouvelle commande créée.
     */
    async createOrder(offerId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenError('Seul un administrateur de compagnie peut passer une commande.');
        }
        
        const offer = await offerService.getOfferById(offerId, authenticatedUser);
        if (!offer) {
            throw new NotFoundError("L'offre sélectionnée n'existe pas.");
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