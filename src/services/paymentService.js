import stripe from 'stripe';
import paymentRepository from '../repositories/paymentRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import companyRepository from '../repositories/companyRepository.js';
import offerRepository from '../repositories/offerRepository.js';
import processedWebhookRepository from '../repositories/processedWebhookRepository.js';
import licenseService from './licenseService.js';
import { LicenseDto } from '../dtos/licenseDto.js';
import {
  ForbiddenException,
  NotFoundException,
  ApiException,
  ConflictException,
} from '../exceptions/ApiException.js';

import logger from '../config/logger.js';
import { withTransaction } from '../utils/dbTransaction.js';
import boss from '../worker/boss.js'; // Import de pg-boss

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @file Gère la logique métier liée au processus de paiement.
 * @description Ce service orchestre la création de sessions de paiement, la mise en file d'attente
 * des webhooks et le traitement des paiements réussis.
 */
class PaymentService {
  /**
   * Crée une session de paiement Stripe pour une commande en attente.
   * Valide les droits de l'utilisateur et l'existence des entités associées.
   *
   * @param {string} orderId - L'ID de la commande à payer.
   * @param {object} authenticatedUser - L'utilisateur authentifié qui initie le paiement.
   * @property {string} authenticatedUser.role - Le rôle de l'utilisateur.
   * @property {string} authenticatedUser.companyId - L'ID de la compagnie de l'utilisateur.
   * @returns {Promise<{sessionId: string, url: string}>} L'ID et l'URL de la session de paiement Stripe.
   * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur ou n'a pas accès à la commande.
   * @throws {NotFoundException} Si la commande ou l'offre associée n'est pas trouvée.
   */
  async createCheckoutSession(orderId, authenticatedUser) {
    if (!authenticatedUser || authenticatedUser.role !== 'admin') {
      throw new ForbiddenException(
        'Seul un administrateur peut initier un paiement.'
      );
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
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `Licence Geodiag - ${offer.name}` },
            unit_amount: Math.round(offer.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        orderId: order.order_id,
        companyId: order.company_id,
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Met en file d'attente un événement webhook pour un traitement asynchrone.
   * Gère l'idempotence en vérifiant si l'événement a déjà été traité.
   *
   * @param {object} event - L'objet événement complet et validé de Stripe.
   * @returns {Promise<void>}
   * @throws {ConflictException} Si l'événement webhook est un doublon.
   */
  async queuePaymentWebhook(event) {
    // La persistance du webhook en base de données pour l'idempotence
    // est une opération qui nécessite une transaction.
    // L'appel à la méthode create est déplacé dans une transaction pour éviter
    // les erreurs de client de base de données.
    try {
      await withTransaction(async (client) => {
        await processedWebhookRepository.create(event.id, client);
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('Événement déjà traité.');
      }
      throw err;
    }

    // Si l'événement est un paiement réussi et qu'il n'est pas un doublon,
    // on publie un événement pour que le worker puisse le traiter.
    // L'appel à boss.publish DOIT être en dehors de la transaction
    // pour éviter les problèmes d'intégration.
    if (event.type === 'checkout.session.completed') {
      await boss.publish('payment-succeeded', event.data.object);
    }

    logger.info(
      { eventId: event.id, eventType: event.type },
      "Événement mis en file d'attente avec succès."
    );
  }

  /**
   * Traite un paiement réussi. Cette méthode est maintenant le "publisher" de l'événement.
   * Crée le paiement, met à jour la commande, et génère la licence.
   *
   * @param {object} session - L'objet session de Stripe, payload de la tâche.
   * @returns {Promise<{success: boolean, license: LicenseDto}>} Le résultat de l'opération.
   * @throws {ApiException} Si une erreur survient durant le traitement.
   */
  async processSuccessfulPayment(session) {
    const orderId = session.metadata.orderId;
    let license, updatedOrder, company, offer;

    try {
      // Toutes les opérations de base de données sont encapsulées dans une transaction.
      // La transaction gère la création du paiement, la mise à jour de la commande et la création de la licence.
      ({
        newLicense: license,
        updatedOrder,
        company,
        offer,
      } = await withTransaction(async (client) => {
        const paymentData = {
          order_id: orderId,
          gateway_ref: session.payment_intent,
          amount: session.amount_total / 100,
          status: 'completed',
          method: 'card',
        };
        await paymentRepository.create(paymentData, client);

        const order = await orderRepository.updateStatus(
          orderId,
          'completed',
          client
        );
        if (!order)
          throw new NotFoundException(`Commande ${orderId} non trouvée.`);

        const associatedOffer = await offerRepository.findById(
          order.offer_id,
          client
        );
        if (!associatedOffer)
          throw new NotFoundException(`Offre ${order.offer_id} non trouvée.`);

        const companyForOrder = await companyRepository.findById(
          order.company_id,
          client
        );
        if (!companyForOrder)
          throw new NotFoundException(
            `Compagnie ${order.company_id} non trouvée.`
          );

        const newLicense = await licenseService.createLicenseForOrder(
          order,
          associatedOffer,
          client
        );

        return {
          newLicense,
          updatedOrder: order,
          offer: associatedOffer,
          company: companyForOrder,
        };
      }));

      const eventPayload = {
        order: updatedOrder,
        company: company,
        offer: offer,
        license: license,
      };

      // PUBLICATION DE L'ÉVÉNEMENT
      // La publication de l'événement a lieu ici, APRES le succès de la transaction.
      await boss.publish('payment-succeeded', eventPayload);

      logger.info(
        { orderId },
        `Traitement de la commande terminé. Événement 'payment-succeeded' publié.`
      );
      return {
      success: true,
      license: new LicenseDto(license),
      notificationPayload: eventPayload, 
    };
    } catch (error) {
      logger.error(
        { err: error, orderId },
        `Échec du traitement du paiement pour la commande.`
      );

      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException(
        500,
        `Une erreur interne est survenue lors du traitement de la commande ${orderId}.`
      );
    }
  }
}

export default new PaymentService();
