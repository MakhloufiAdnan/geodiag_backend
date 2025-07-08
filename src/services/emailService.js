import nodemailer from 'nodemailer';

/**
 * @file Gère l'envoi d'emails transactionnels.
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_PORT == 465,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
    }

    /**
     * Envoie l'email de confirmation de licence avec la facture.
     * @param {object} company - L'objet compagnie destinataire.
     * @param {object} license - L'objet de la licence créée.
     * @param {Buffer} invoicePdfBuffer - Le buffer contenant le PDF de la facture.
     */
    async sendLicenseAndInvoice(company, license, invoicePdfBuffer) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: company.email,
            subject: `Votre licence Geodiag pour ${company.name} est activée !`,
            html: `<h1>Bonjour ${company.name},</h1><p>Votre licence est active jusqu'au <strong>${new Date(license.expires_at).toLocaleDateString('fr-FR')}</strong>.</p><p>QR code: <strong>${license.qr_code_payload}</strong></p><p>Facture en pièce jointe.</p>`,
            attachments: [{ filename: `facture-${license.order_id}.pdf`, content: invoicePdfBuffer, contentType: 'application/pdf' }],
        };
        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de confirmation envoyé à ${company.email}`);
        } catch (error) {
            console.error(`❌ Erreur lors de l'envoi de l'email à ${company.email}:`, error);
        }
    }
}

export default new EmailService();