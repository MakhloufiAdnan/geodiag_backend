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
     * Récupère une liste paginée de toutes les compagnies.
     * @param {number} page - Le numéro de la page actuelle.
     * @param {number} limit - Le nombre d'éléments par page.
     * @returns {Promise<object>} Un objet contenant les données et les métadonnées de pagination.
     */
    async getAllCompanies(page, limit) {
        const offset = (page - 1) * limit;

        const [companies, totalItems] = await Promise.all([
            companyRepository.findAll(limit, offset),
            companyRepository.countAll()
        ]);

        return {
            data: companies.map(company => new CompanyDto(company)),
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                pageSize: limit,
            },
        };
    }

    /**
     * Récupère une compagnie par son ID.
     * @param {string} id - L'ID de la compagnie.
     * @returns {Promise<CompanyDto>} La compagnie formatée via DTO.
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