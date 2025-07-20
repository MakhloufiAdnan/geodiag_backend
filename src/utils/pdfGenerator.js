import PDFDocument from 'pdfkit';

/**
 * Génère une facture PDF simple sous forme de Buffer.
 * @param {object} order - L'objet commande de la base de données.
 * @param {object} company - L'objet compagnie du client.
 * @param {object} offer - L'objet offre correspondant à la commande.
 * @returns {Promise<Buffer>} Une promesse qui se résout avec le Buffer du PDF.
 */
export const generateInvoicePdf = (order, company, offer) => {
    return new Promise((resolve, reject) => {
        try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // En-tête du document
        doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('FACTURE', { align: 'center' })
            .moveDown(2);

        // Informations sur le client et la facture
        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Facturé à :', 50, 120)
            .font('Helvetica')
            .text(company.name, 50, 140)
            .text(company.address || 'Adresse non fournie', 50, 160)
            .text(company.email, 50, 180);

        const invoiceDate = new Date(order.created_at).toLocaleDateString('fr-FR');
        doc
            .font('Helvetica-Bold')
            .text('Numéro de facture :', 300, 120)
            .font('Helvetica')
            .text(order.order_number, 450, 120)
            .font('Helvetica-Bold')
            .text('Date :', 300, 140)
            .font('Helvetica')
            .text(invoiceDate, 450, 140)
            .moveDown(5);

        // Ligne de séparation
        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, 250).lineTo(550, 250).stroke();

        // En-têtes du tableau des articles
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('DESCRIPTION', 60, 270)
            .text('PRIX UNITAIRE', 450, 270, { align: 'right' });
        
        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, 290).lineTo(550, 290).stroke();

        // Articles de la facture
        doc
            .fontSize(10)
            .font('Helvetica')
            .text(`Abonnement Geodiag - ${offer.name} (${offer.duration_months} mois)`, 60, 310)
            .text(`${order.amount} €`, 450, 310, { align: 'right' });
        
        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, 330).lineTo(550, 330).stroke();

        // Total
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('TOTAL :', 300, 400)
            .text(`${order.amount} €`, 450, 400, { align: 'right' });

        // Pied de page
        doc
            .fontSize(10)
            .font('Helvetica-Oblique')
            .text('Merci pour votre confiance.', 50, 700, { align: 'center', width: 500 });

        doc.end();
        } catch (error) {
            if (error instanceof Error) {
                reject(error);
            } else {
                reject(new Error(String(error))); // Convertit la valeur en string au cas où
            }
        }
    });
};