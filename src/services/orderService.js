import orderRepository from '../repositories/orderRepository.js';
import offerService from './offerService.js';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from '../dtos/orderDto.js';
import {
  ForbiddenException,
  NotFoundException,
} from '../exceptions/ApiException.js';

/**
 * @class OrderService
 * @description Gère la logique métier relative aux commandes.
 */
class OrderService {
  /**
   * Crée une nouvelle commande pour un utilisateur authentifié.
   * La méthode vérifie que l'utilisateur est un administrateur et que l'offre spécifiée est valide.
   *
   * @param {string} offerId - L'identifiant de l'offre à commander.
   * @param {object} authenticatedUser - L'objet utilisateur authentifié, provenant du middleware JWT.
   * @property {string} authenticatedUser.role - Le rôle de l'utilisateur ('admin' ou 'technician').
   * @property {string} [authenticatedUser.company_id] - L'ID de la compagnie (style snake_case).
   * @property {string} [authenticatedUser.companyId] - L'ID de la compagnie (style camelCase).
   * @returns {Promise<OrderDto>} La nouvelle commande formatée comme un DTO.
   * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
   * @throws {NotFoundException} Si l'offre spécifiée n'existe pas.
   */
  async createOrder(offerId, authenticatedUser) {
    // 1. Vérifier les permissions de l'utilisateur
    if (!authenticatedUser || authenticatedUser.role !== 'admin') {
      throw new ForbiddenException(
        'Seul un administrateur de compagnie peut passer une commande.'
      );
    }

    // 2. Récupérer les détails de l'offre
    const offer = await offerService.getOfferById(offerId, authenticatedUser);

    // 3. Vérifier que l'offre existe
    if (!offer) {
      throw new NotFoundException("L'offre sélectionnée n'existe pas.");
    }

    // 4. Extraire l'ID de la compagnie de manière sécurisée
    // Gère à la fois `company_id` (modèles internes) et `companyId` (payload JWT)
    const companyId =
      authenticatedUser.company_id || authenticatedUser.companyId;

    // 5. Préparer les données de la commande
    const orderData = {
      company_id: companyId,
      offer_id: offerId,
      order_number: `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`,
      amount: offer.price,
    };

    // 6. Créer la commande dans le repository
    const newOrder = await orderRepository.create(orderData);

    // 7. Retourner la commande formatée via un DTO (Data Transfer Object)
    return new OrderDto(newOrder);
  }
}

export default new OrderService();
