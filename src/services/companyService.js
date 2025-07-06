import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';

class CompanyService {

    /**
     * Méthode privée pour s'assurer que l'utilisateur a les droits d'administrateur.
     * @param {object} authenticatedUser - L'utilisateur extrait du token JWT.
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            const error = new Error('Accès refusé. Droits administrateur requis.');
            error.statusCode = 403; 
            throw error;
        }
    }

    /**
     * Récupère toutes les compagnies. 
     */
    async getAllCompanies(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser); 
        const companies = await companyRepository.findAll();
        return companies.map(company => new CompanyDto(company));
    }

    /**
     * Récupère une compagnie par son ID. 
     */
    async getCompanyById(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const company = await companyRepository.findById(id);
        return company ? new CompanyDto(company) : null;
    }

    /**
     * Crée une compagnie. 
     */
    async createCompany(companyData, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser); 

        const existingCompany = await companyRepository.findByEmail(companyData.email);
        if (existingCompany) {
            const error = new Error('Une entreprise avec cet email existe déjà.');
            error.statusCode = 409; // Conflict
            throw error;
        }

        const newCompany = await companyRepository.create(companyData);
        return new CompanyDto(newCompany);
    }
}

export default new CompanyService();