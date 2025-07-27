import nodemailer from "nodemailer";
import { ApiException } from "../exceptions/apiException.js";
import logger from "../config/logger.js";

/**
 * @file Gère l'envoi d'emails transactionnels via un transporteur SMTP.
 * @class EmailService
 */
class EmailService {
  constructor() {
    // La configuration du transporteur est effectuée une seule fois à l'instanciation.
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Envoie l'email de confirmation de licence avec la facture en pièce jointe.
   * @param {object} company - L'objet compagnie destinataire (doit contenir `email` et `name`).
   * @param {object} license - L'objet de la licence créée (doit contenir `expires_at`, `qr_code_payload`, `order_id`).
   * @param {Buffer} invoicePdfBuffer - Le buffer contenant le PDF de la facture.
   * @throws {ApiException} Si l'envoi de l'email échoue.
   */
  async sendLicenseAndInvoice(company, license, invoicePdfBuffer) {
    const mailOptions = {
      from: `Geodiag <${process.env.EMAIL_FROM}>`,
      to: company.email,
      subject: `Votre licence Geodiag pour ${company.name} est activée !`,
      html: `<h1>Bonjour ${company.name},</h1>
                   <p>Votre licence est désormais active et sera valide jusqu'au <strong>${new Date(
                     license.expires_at
                   ).toLocaleDateString("fr-FR")}</strong>.</p>
                   <p>Votre QR code d'activation est : <strong>${
                     license.qr_code_payload
                   }</strong></p>
                   <p>Vous trouverez votre facture en pièce jointe de cet email.</p>
                   <p>L'équipe Geodiag vous remercie de votre confiance.</p>`,
      attachments: [
        {
          filename: `facture-geodiag-${license.order_id}.pdf`,
          content: invoicePdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };
    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(
        { to: company.email, orderId: license.order_id },
        "✅ Email de confirmation envoyé avec succès."
      );
    } catch (error) {
      logger.error(
        { err: error, recipient: company.email },
        `❌ Erreur critique lors de l'envoi de l'email.`
      );
      throw new ApiException(
        500,
        `Échec de l'envoi de l'email de confirmation.`
      );
    }
  }
}

export default new EmailService();
