import companyRepository from '../repositories/companyRepository.js';
import { CompanyDto } from '../dtos/companyDto.js';

class CompanyService {
    async getAllCompanies() {
        const companies = await companyRepository.findAll();
        return companies.map(company => new CompanyDto(company));
    }

    async getCompanyById(id) {
        const company = await companyRepository.findById(id);
        return company ? new CompanyDto(company) : null;
    }

    async createCompany(companyData) {
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