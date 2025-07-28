import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';
import { NotFoundException } from '../exceptions/ApiException.js';
import { createPaginatedResponse } from '../utils/paginationUtils.js';

/**
 * @file Gère la logique métier pour les compagnies.
 */
class CompanyService {
  /**
   * Récupère une liste paginée de toutes les compagnies.
   * @param {number} page - Le numéro de la page actuelle.
   * @param {number} limit - Le nombre d'éléments par page.
   * @returns {Promise<object>} Un objet de réponse paginée structuré.
   */
  async getAllCompanies(page, limit) {
    const offset = (page - 1) * limit;

    // CORRECTION : Utilisation de l'utilitaire de pagination.
    const [companies, totalItems] = await Promise.all([
      companyRepository.findAll(limit, offset),
      companyRepository.countAll(),
    ]);

    const companyDtos = companies.map((company) => new CompanyDto(company));

    return createPaginatedResponse({
      data: companyDtos,
      totalItems,
      page,
      limit,
      baseUrl: '/api/companies',
    });
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
