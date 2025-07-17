import DataLoader from 'dataloader';
import companyRepository from '../repositories/companyRepository.js';
import offerRepository from '../repositories/offerRepository.js';
import orderRepository from '../repositories/orderRepository.js';

/**
 * Fonction de "batching" pour les compagnies.
 * Elle prend un tableau d'ID et doit retourner un tableau de compagnies dans le même ordre.
 */
const batchCompanies = async (companyIds) => {
    logger.debug(`Batching companies for IDs: ${companyIds}`);
    const companies = await companyRepository.findByIds(companyIds); 

    // Mappe les résultats pour garantir le même ordre que les IDs d'entrée
    const companyMap = new Map(companies.map(c => [c.company_id, c]));
    return companyIds.map(id => companyMap.get(id) || null);
};

/**
 * Fonction de "batching" pour les offres.
 */
const batchOffers = async (offerIds) => {
    logger.debug(`Batching offers for IDs: ${offerIds}`);
    const offers = await offerRepository.findByIds(offerIds); 
    const offerMap = new Map(offers.map(o => [o.offer_id, o]));
    return offerIds.map(id => offerMap.get(id) || null);
};

/**
 * Fonction de "batching" pour les commandes.
 */
const batchOrders = async (orderIds) => {
    logger.debug(`Batching orders for IDs: ${orderIds}`);
    const orders = await orderRepository.findByIds(orderIds); 
    const orderMap = new Map(orders.map(o => [o.order_id, o]));
    return orderIds.map(id => orderMap.get(id) || null);
};


// Exporte une fonction qui crée de nouvelles instances de dataloader pour chaque requête.
// Crucial pour éviter la mise en cache entre différents utilisateurs.
export const createDataLoaders = () => ({
    companyLoader: new DataLoader(batchCompanies),
    offerLoader: new DataLoader(batchOffers),
    orderLoader: new DataLoader(batchOrders),
});