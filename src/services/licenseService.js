import licenseRepository from '../repositories/licenseRepository.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @file Gère la logique métier spécifique aux licences.
 */
class LicenseService {
    /**
     * Crée une nouvelle licence pour une commande validée.
     * @param {object} order - L'objet commande.
     * @param {object} offer - L'objet offre correspondant.
     * @param {object} client - Le client de base de données pour la transaction.
     * @returns {Promise<object>} La nouvelle licence créée.
     */
    async createLicenseForOrder(order, offer, client) {
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + offer.duration_months);
        const prefix = process.env.QR_CODE_PREFIX || 'LIC-';
        const qrPayload = `${prefix}${order.company_id}-${uuidv4()}`;
        const licenseData = {
            order_id: order.order_id,
            company_id: order.company_id,
            qr_code_payload: qrPayload,
            status: 'active',
            expires_at: expirationDate,
        };
        return licenseRepository.create(licenseData, client);
    }
}

export default new LicenseService();