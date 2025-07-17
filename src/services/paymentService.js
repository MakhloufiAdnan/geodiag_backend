import { pool } from '../db/index.js';
import stripe from 'stripe';
import paymentRepository from '../repositories/paymentRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import companyRepository from '../repositories/companyRepository.js';
import offerRepository from '../repositories/offerRepository.js';
import processedWebhookRepository from '../repositories/processedWebhookRepository.js';
import jobRepository from '../repositories/jobRepository.js';
import licenseService from './licenseService.js';
import emailService from './emailService.js';
import { LicenseDto } from '../dtos/licenseDto.js';
import { ForbiddenException, NotFoundException, ApiException, ConflictException } from '../exceptions/apiException.js';
import logger from '../config/logger.js';

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
     */
    async createCheckoutSession(orderId, authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Seul un administrateur peut initier un paiement.');
        }

        const order = await orderRepository.findById(orderId);
        if (!order) {
            throw new NotFoundException('Commande non trouvée.');
        }

        if (order.company_id !== authenticatedUser.companyId) {
            throw new ForbiddenException('Accès non autorisé à cette commande.');
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
            metadata: { 
                orderId: order.order_id, 
                companyId: order.company_id 
            },
            success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        });

        return { sessionId: session.id, url: session.url };
    }

    /**
     * Met en file d'attente un événement webhook pour traitement asynchrone.
     * Cette méthode est idempotente.
     * @param {object} event - L'objet événement complet de Stripe.
     * @throws {ConflictException} Si l'événement a déjà été traité.
     */
    async queuePaymentWebhook(event) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Étape 1: Vérification d'idempotence et insertion atomique
            // Tente d'insérer l'ID de l'événement. Si la contrainte unique échoue,
            // cela signifie que l'événement a déjà été reçu.
            try {
                await processedWebhookRepository.create(event.id, client);
            } catch (err) {
                if (err.code === '23505') { // Code d'erreur PostgreSQL pour violation de contrainte unique
                    throw new ConflictException("Événement déjà traité.");
                }
                throw err; // Relance les autres erreurs
            }

            // Étape 2: Création de la tâche si l'événement nous intéresse
            if (event.type === 'checkout.session.completed') {
                await jobRepository.create(
                    'process_successful_payment',
                    event.data.object, // Le payload de la tâche est la session Stripe
                    client
                );
            }

            await client.query('COMMIT');
            logger.info({ eventId: event.id, eventType: event.type }, 'Événement mis en file d\'attente avec succès.');
        } catch (error) {
            await client.query('ROLLBACK');

            // Ne relance pas l'erreur de conflit pour que le contrôleur puisse renvoyer 200
            if (error instanceof ConflictException) {
                throw error;
            }
            logger.error({ err: error, eventId: event.id }, `Erreur lors de la mise en file d'attente de l'événement webhook.`);
            throw new ApiException(500, `Échec de la mise en file d'attente de l'événement webhook.`);
        } finally {
            client.release();
        }
    }

    /**
     * Traite un paiement réussi.
     * Cette méthode est maintenant conçue pour être appelée par un worker en arrière-plan,
     * qui récupère les tâches de la table 'jobs'.
     * @param {object} session - L'objet session de Stripe provenant de la file d'attente.
     * @returns {Promise<{success: boolean, license: LicenseDto}>} Le résultat de l'opération.
     * @throws {ApiException} Si une étape de la transaction échoue.
     */
    async processSuccessfulPayment(session) {
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
            if (!updatedOrder) throw new NotFoundException(`Commande ${orderId} non trouvée lors du traitement.`);

            const offer = await offerRepository.findById(updatedOrder.offer_id, client);
            if (!offer) throw new NotFoundException(`Offre ${updatedOrder.offer_id} non trouvée lors du traitement.`);

            const newLicense = await licenseService.createLicenseForOrder(updatedOrder, offer, client);

            await client.query('COMMIT');

            // Les opérations externes (comme l'envoi d'email) se produisent APRÈS que la transaction soit validée.
            const company = await companyRepository.findById(updatedOrder.company_id);
            if (company) {

                // Génération de facture PDF.
                const invoicePdfPlaceholder = Buffer.from('Ceci est une facture de test.');
                await emailService.sendLicenseAndInvoice(company, newLicense, invoicePdfPlaceholder);
            }
            logger.info({ orderId }, `Traitement de la commande terminé avec succès.`);
            return { success: true, license: new LicenseDto(newLicense) };
        } catch (error) {
            await client.query('ROLLBACK');

            logger.error({ err: error, orderId }, `Échec du traitement du paiement pour la commande.`);
            throw new ApiException(500, `Échec du traitement du paiement pour la commande ${orderId}: ${error.message}`);
        } finally {
            client.release();
        }
    }
}

export default new PaymentService();