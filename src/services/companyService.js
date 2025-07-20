import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';
import { NotFoundException } from '../exceptions/apiException.js';

/**
 * @file Gère la logique métier pour les compagnies.
 * @description L'autorisation est désormais gérée par un middleware en amont.
 * @class CompanyService
 */
class CompanyService {
    /**
     * Récupère toutes les compagnies.
     * @returns {Promise<Array<CompanyDto>>} Une liste de compagnies formatée via DTO.
     */
    async getAllCompanies() {
        const companies = await companyRepository.findAll();
        return companies.map(company => new CompanyDto(company));
    }

    /**
     * Récupère une compagnie par son ID.
     * @param {string} id - L'ID de la compagnie.
     * @returns {Promise<CompanyDto>} La compagnie formatée via DTO.
     * @throws {NotFoundException} Si aucune compagnie n'est trouvée pour cet ID.
     */
    async getCompanyById(id) {
        const company = await companyRepository.findById(id);
        if (!company) {
            throw new NotFoundException('Compagnie non trouvée.');
    }
        return new CompanyDto(company);
    }
}

export default new CompanyService();