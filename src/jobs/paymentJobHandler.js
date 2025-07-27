import paymentService from "../services/paymentService.js";

/**
 * @file Gestionnaire pour la tâche de traitement d'un paiement réussi.
 * @description Ce module est appelé par le worker pour chaque tâche de type 'process_successful_payment'.
 * @param {object} job - L'objet job fourni par pg-boss, contenant les données (payload).
 */
const paymentJobHandler = async (job) => {
  logger.info(`Processing job ${job.id} | Type: ${job.name}`);

  // Le 'payload' de la tâche est la session Stripe que nous avons enregistrée
  const session = job.data;

  // Appel de la méthode de service existante qui contient toute la logique métier.
  // Si cette méthode lève une exception, pg-boss l'interceptera automatiquement
  // et marquera la tâche comme échouée.
  await paymentService.processSuccessfulPayment(session);

  logger.info(`✅ Job ${job.id} completed successfully.`);
};

export default paymentJobHandler;
