import logger from '../config/logger.js';
import { generateInvoicePdf } from '../utils/pdfGenerator.js';
import emailService from '../services/emailService.js';

/**
 * @file Gère la notification client suite à un paiement réussi.
 * @module jobs/notificationJobHandler
 * @description
 * Ce handler est abonné à l'événement 'payment-succeeded'. Sa seule responsabilité
 * est de générer la facture et d'envoyer l'email de confirmation. Il est conçu
 * pour être exécuté par un worker pg-boss.
 */

/**
 * Traite un événement 'payment-succeeded' pour envoyer une notification.
 * @param {object} job - L'objet événement fourni par pg-boss.
 * @param {object} job.data - Le payload de l'événement, contenant les détails de la commande, licence, etc.
 * @returns {Promise<void>}
 * @throws {Error} Relance l'erreur si l'envoi de l'email échoue, pour permettre à pg-boss de réessayer.
 */
async function notificationJobHandler(job) {
  const { order, company, offer, license } = job.data;

  logger.info({ orderId: order.order_id }, `Événement 'payment-succeeded' reçu. Traitement de la notification.`);

  if (!company) {
    logger.warn({ orderId: order.order_id }, "Compagnie non trouvée dans le payload de l'événement, impossible d'envoyer l'email.");
    // On ne relance pas d'erreur, car c'est une situation finale qui ne peut être résolue par un retry.
    return;
  }

  try {
    const invoicePdfBuffer = await generateInvoicePdf(order, company, offer);
    await emailService.sendLicenseAndInvoice(company, license, invoicePdfBuffer);
    logger.info({ orderId: order.order_id }, `Email de confirmation pour la licence envoyé avec succès.`);
  } catch (error) {
    logger.error({ err: error, orderId: order.order_id }, "Échec de l'envoi de la notification post-paiement.");
    // On relance l'erreur pour que pg-boss puisse planifier une nouvelle tentative
    // selon la politique de retry configurée.
    throw error;
  }
}

export default notificationJobHandler;
