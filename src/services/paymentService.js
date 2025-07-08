import { pool } from '../db/index.js';
import stripe from 'stripe';
import paymentRepository from '../repositories/paymentRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import companyRepository from '../repositories/companyRepository.js';
import offerService from './offerService.js';
import licenseService from './licenseService.js';
import emailService from './emailService.js';
import { LicenseDto } from '../dtos/licenseDto.js';

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @file Gère le processus de paiement, de l'initiation à la confirmation.
 */
class PaymentService {
    /**
     * Crée une session de paiement Stripe pour une commande.
     * @param {string} orderId - L'ID de la commande à payer.
     * @param {object} authenticatedUser - L'utilisateur qui initie le paiement.
     * @returns {Promise<{sessionId: string, url: string}>} L'ID et l'URL de la session de paiement.
     */
    async createCheckoutSession(orderId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Seul un administrateur peut initier un paiement.');
            error.statusCode = 403;
            throw error;
        }
        const order = await orderRepository.findById(orderId);
        if (!order || order.company_id !== authenticatedUser.companyId) {
            const error = new Error('Commande non trouvée ou accès non autorisé.');
            error.statusCode = 404;
            throw error;
        }
        const offer = await offerService.getOfferById(order.offer_id);
        if (!offer) {
            const error = new Error('Offre associée à la commande non trouvée.');
            error.statusCode = 404;
            throw error;
        }
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: `Licence Geodiag - ${offer.name}` },
                    unit_amount: Math.round(offer.price * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: { orderId: order.order_id, companyId: order.company_id },
            success_url: process.env.PAYMENT_SUCCESS_URL,
            cancel_url: process.env.PAYMENT_CANCEL_URL,
        });
        return { sessionId: session.id, url: session.url };
    }

    /**
     * Gère un paiement réussi reçu via un webhook.
     * @param {object} session - L'objet session de Stripe.
     * @returns {Promise<{success: boolean, license: LicenseDto}>} Le résultat de l'opération.
     */
    async handleSuccessfulPayment(session) {
        const orderId = session.metadata.orderId;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const paymentData = {
                order_id: orderId,
                gateway_ref: session.payment_intent,
                amount: session.amount_total / 100,
                status: 'completed',
                method: 'card',
            };
            await paymentRepository.create(paymentData, client);
            const updatedOrder = await orderRepository.updateStatus(orderId, 'completed', client);
            if (!updatedOrder) throw new Error("Commande non trouvée.");
            const offer = await offerService.getOfferById(updatedOrder.offer_id);
            if (!offer) throw new Error("Offre associée non trouvée.");
            const newLicense = await licenseService.createLicenseForOrder(updatedOrder, offer, client);
            await client.query('COMMIT');
            
            const company = await companyRepository.findById(updatedOrder.company_id);
            if (company) {
                const invoicePdfPlaceholder = Buffer.from('Ceci est une facture de test.');
                await emailService.sendLicenseAndInvoice(company, newLicense, invoicePdfPlaceholder);
            }
            return { success: true, license: new LicenseDto(newLicense) };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error("Échec du traitement du webhook de paiement.");
        } finally {
            client.release();
        }
    }
}
export default new PaymentService();