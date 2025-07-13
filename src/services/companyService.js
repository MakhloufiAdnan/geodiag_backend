import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';
import { ForbiddenException, NotFoundException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour les compagnies.
 * @class CompanyService
 */
class CompanyService {
    /**
     * Vérifie si l'utilisateur authentifié a le rôle d'administrateur.
     * @private
     * @param {object} authenticatedUser - L'objet utilisateur issu du token.
     * @throws {ForbiddenException} Si l'utilisateur n'est pas un administrateur.
     */
    #ensureIsAdmin(authenticatedUser) {
        if (!authenticatedUser || authenticatedUser.role !== 'admin') {
            throw new ForbiddenException('Accès refusé. Droits administrateur requis.');
        }
    }

    /**
     * Récupère toutes les compagnies. Accessible uniquement aux administrateurs.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<Array<CompanyDto>>} Une liste de compagnies formatée via DTO.
     */
    async getAllCompanies(authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser); 
        const companies = await companyRepository.findAll();
        return companies.map(company => new CompanyDto(company));
    }

    /**
     * Récupère une compagnie par son ID. Accessible uniquement aux administrateurs.
     * @param {string} id - L'ID de la compagnie.
     * @param {object} authenticatedUser - L'utilisateur qui effectue la requête.
     * @returns {Promise<CompanyDto>} La compagnie formatée via DTO.
     * @throws {NotFoundException} Si aucune compagnie n'est trouvée pour cet ID.
     */
    async getCompanyById(id, authenticatedUser) {
        this.#ensureIsAdmin(authenticatedUser);
        const company = await companyRepository.findById(id);
        if (!company) {
            throw new NotFoundException('Compagnie non trouvée.');
        }
        return new CompanyDto(company);
    }
}

export default new CompanyService();