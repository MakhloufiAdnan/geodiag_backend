import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';

/**
 * @file Gère la logique métier pour les compagnies.
 */
class CompanyService {
    /**
     * Méthode privée pour s'assurer que l'utilisateur a les droits d'administrateur.
     * @param {object} authenticatedUser - L'utilisateur extrait du token JWT.
     * @private
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Accès refusé. Droits administrateur requis.');
            error.statusCode = 403; 
            throw error;
        }
    }

    /**
     * Récupère toutes les compagnies (accessible uniquement aux admins).
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<Array<CompanyDto>>} Une liste de compagnies.
     */
    async getAllCompanies(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser); 
        const companies = await companyRepository.findAll();
        return companies.map(company => new CompanyDto(company));
    }

    /**
     * Récupère une compagnie par son ID (accessible uniquement aux admins).
     * @param {string} id - L'ID de la compagnie.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<CompanyDto|null>} La compagnie ou null si non trouvée.
     */
    async getCompanyById(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const company = await companyRepository.findById(id);
        return company ? new CompanyDto(company) : null;
    }
}

export default new CompanyService();