import { pool } from '../db/index.js';
import stripe from 'stripe';
import paymentRepository from '../repositories/paymentRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import companyRepository from '../repositories/companyRepository.js';
import offerRepository from '../repositories/offerRepository.js';
import licenseService from './licenseService.js';
import emailService from './emailService.js';
import { LicenseDto } from '../dtos/licenseDto.js';
import { ForbiddenException, NotFoundException, ApiException } from '../exceptions/apiException.js';

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @file Gère le processus de paiement, de l'initiation à la confirmation.
 * @class PaymentService
 */
class PaymentService {
    /**
     * Crée une session de paiement Stripe pour une commande en attente.
     * @param {string} orderId - L'ID de la commande à payer.
     * @param {object} authenticatedUser - L'administrateur de la compagnie qui initie le paiement.
     * @returns {Promise<{sessionId: string, url: string}>} L'ID et l'URL de la session de paiement Stripe.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un admin.
     * @throws {NotFoundException} Si la commande ou l'offre associée n'est pas trouvée.
     */
    async createCheckoutSession(orderId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Seul un administrateur peut initier un paiement.');
        }
        const order = await orderRepository.findById(orderId);
        if (!order || order.company_id !== authenticatedUser.companyId) {
            throw new NotFoundException('Commande non trouvée ou accès non autorisé.');
        }
        const offer = await offerRepository.findById(order.offer_id);
        if (!offer) {
            throw new NotFoundException('Offre associée à la commande non trouvée.');
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
            success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        });
        return { sessionId: session.id, url: session.url };
    }

    /**
     * Traite un événement de paiement réussi reçu via un webhook Stripe.
     * Exécute une transaction pour mettre à jour la commande, créer le paiement,
     * créer la licence, et notifier le client par email.
     * @param {object} session - L'objet session de Stripe provenant de l'événement webhook.
     * @returns {Promise<{success: boolean, license: LicenseDto}>} Le résultat de l'opération.
     * @throws {ApiException} Si une étape de la transaction échoue.
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
            if (!updatedOrder) throw new NotFoundException(`Commande ${orderId} non trouvée lors du traitement du webhook.`);

            const offer = await offerRepository.findById(updatedOrder.offer_id);
            if (!offer) throw new NotFoundException(`Offre ${updatedOrder.offer_id} non trouvée lors du traitement du webhook.`);
            
            const newLicense = await licenseService.createLicenseForOrder(updatedOrder, offer, client);
            
            await client.query('COMMIT');
            
            const company = await companyRepository.findById(updatedOrder.company_id);
            if (company) {
                // TODO: Remplacer par une véritable génération de facture PDF.
                const invoicePdfPlaceholder = Buffer.from('Ceci est une facture de test.');
                await emailService.sendLicenseAndInvoice(company, newLicense, invoicePdfPlaceholder);
            }
            return { success: true, license: new LicenseDto(newLicense) };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new ApiException(500, `Échec du traitement du webhook de paiement pour la commande ${orderId}: ${error.message}`);
        } finally {
            client.release();
        }
    }
}
export default new PaymentService();
