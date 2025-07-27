import licenseRepository from "../repositories/licenseRepository.js";
import { v4 as uuidv4 } from "uuid";

/**
 * @file Gère la logique métier spécifique à la création des licences.
 * @class LicenseService
 */
class LicenseService {
  /**
   * Crée une nouvelle licence pour une commande validée.
   * Cette méthode est conçue pour être appelée à l'intérieur d'une transaction
   * de base de données initiée par un autre service (ex: PaymentService).
   * @param {object} order - L'objet commande complet.
   * @param {object} offer - L'objet offre correspondant à la commande.
   * @param {object} dbClient - Le client de base de données transactionnel.
   * @returns {Promise<object>} La nouvelle licence créée (données brutes).
   */
  async createLicenseForOrder(order, offer, dbClient) {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + offer.duration_months);

    const prefix = process.env.QR_CODE_PREFIX || "LIC-";
    const qrPayload = `${prefix}${order.company_id}-${uuidv4()}`;

    const licenseData = {
      order_id: order.order_id,
      company_id: order.company_id,
      qr_code_payload: qrPayload,
      status: "active",
      expires_at: expirationDate,
    };
    return licenseRepository.create(licenseData, dbClient);
  }
}

export default new LicenseService();
