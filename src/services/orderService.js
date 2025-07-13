import orderRepository from '../repositories/orderRepository.js';
import offerService from './offerService.js';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from '../dtos/orderDto.js';
import { ForbiddenException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour la création des commandes.
 * @class OrderService
 */
class OrderService {
    /**
     * Crée une nouvelle commande pour une compagnie à partir d'une offre.
     * @param {string} offerId - L'ID de l'offre choisie.
     * @param {object} authenticatedUser - L'administrateur de la compagnie qui passe la commande.
     * @returns {Promise<OrderDto>} La nouvelle commande créée et formatée via DTO.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
     * @throws {NotFoundException} Si l'offre sélectionnée n'existe pas (levée par offerService).
     */
    async createOrder(offerId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Seul un administrateur de compagnie peut passer une commande.');
        }

        // Appelle le service des offres. Si l'offre n'est pas trouvée,
        // offerService lèvera une NotFoundException qui sera propagée.
        const offer = await offerService.getOfferById(offerId, authenticatedUser);
        
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