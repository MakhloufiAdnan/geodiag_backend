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
import { generateInvoicePdf } from '../utils/pdfGenerator.js';
import {
  ForbiddenException,
  NotFoundException,
  ApiException,
  ConflictException,
} from '../exceptions/apiException.js';

import logger from '../config/logger.js';
import { withTransaction } from '../utils/dbTransaction.js';

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
   * En environnement de test, traite l'événement de manière synchrone pour simplifier les assertions.
   *
   * @param {object} event - L'objet événement complet et validé de Stripe.
   * @returns {Promise<void>}
   * @throws {ConflictException} Si l'événement webhook est un doublon.
   */
  async queuePaymentWebhook(event) {
    // En environnement de test, permet de contourner la file d'attente pour un résultat immédiat.
    if (process.env.NODE_ENV === 'test') {
      logger.info(
        'Environnement de test détecté. Traitement synchrone du webhook.'
      );
      if (event.type === 'checkout.session.completed') {
        await this.processSuccessfulPayment(event.data.object);
      }
      return;
    }

    // En production, utilisation d'une transaction pour garantir l'atomicité de l'opération.
    await withTransaction(async (client) => {
      try {
        // Tente d'insérer l'ID de l'événement. Échoue si déjà présent.
        await processedWebhookRepository.create(event.id, client);
      } catch (err) {
        if (err.code === '23505') {
          // Violation de contrainte unique
          throw new ConflictException('Événement déjà traité.');
        }
        throw err; // Relance les autres erreurs
      }

      // Si l'événement est un paiement réussi, on crée une tâche pour le worker.
      if (event.type === 'checkout.session.completed') {
        await jobRepository.create(
          'process_successful_payment',
          event.data.object, // Le payload de la tâche est la session Stripe
          client
        );
      }
    });

    logger.info(
      { eventId: event.id, eventType: event.type },
      "Événement mis en file d'attente avec succès."
    );
  }

  /**
   * Traite un paiement réussi. Cette méthode est appelée par un worker.
   * Crée le paiement, met à jour la commande, génère la licence, et envoie un email de confirmation.
   *
   * @param {object} session - L'objet session de Stripe, payload de la tâche.
   * @returns {Promise<{success: boolean, license: LicenseDto}>} Le résultat de l'opération.
   * @throws {ApiException} Si une erreur survient durant le traitement.
   */
  async processSuccessfulPayment(session) {
    const orderId = session.metadata.orderId;

    try {
      // Toutes les opérations de base de données sont encapsulées dans une transaction.
      const { newLicense, updatedOrder, offer } = await withTransaction(
        async (client) => {
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

          const license = await licenseService.createLicenseForOrder(
            order,
            associatedOffer,
            client
          );

          return {
            newLicense: license,
            updatedOrder: order,
            offer: associatedOffer,
          };
        }
      );

      // Les opérations externes (email, PDF) sont effectuées APRÈS le succès de la transaction.
      const company = await companyRepository.findById(updatedOrder.company_id);
      if (company) {
        try {
          logger.info({ orderId }, 'Génération de la facture PDF...');
          const invoicePdfBuffer = await generateInvoicePdf(
            updatedOrder,
            company,
            offer
          );
          await emailService.sendLicenseAndInvoice(
            company,
            newLicense,
            invoicePdfBuffer
          );
        } catch (emailError) {
          //Log l'erreur mais ne la relance pas. Le paiement est réussi
          // même si la notification échoue.
          logger.error(
            { err: emailError, orderId },
            "Échec de l'envoi de l'email après un paiement réussi."
          );
        }
      } else {
        logger.warn(
          { companyId: updatedOrder.company_id, orderId },
          "Compagnie non trouvée après paiement, l'email n'a pas pu être envoyé."
        );
      }

      logger.info(
        { orderId },
        `Traitement de la commande terminé avec succès.`
      );
      return { success: true, license: new LicenseDto(newLicense) };
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
