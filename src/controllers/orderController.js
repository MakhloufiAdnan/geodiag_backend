import orderService from "../services/orderService.js";

/**
 * @file Gère les requêtes HTTP pour la création de commandes.
 */
class OrderController {
  /**
   * Crée une nouvelle commande à partir d'une offre.
   */
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
