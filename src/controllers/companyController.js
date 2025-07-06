import companyService from '../services/companyService.js';
import { CompanyDto } from '../dtos/companyDto.js'; 

class CompanyController {
    async getAllCompanies(req, res, next) {
        try {

            // Passe req.user au service pour la vérification des droits
            const companies = await companyService.getAllCompanies(req.user);
            res.status(200).json(companies);
        } catch (error) {
            next(error);
        }
    }

    async getCompanyById(req, res, next) {
        try {
            // Passe req.user au service
            const company = await companyService.getCompanyById(req.params.id, req.user);
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }
            res.status(200).json(company);
        } catch (error) {
            next(error);
        }
    }

    async createCompany(req, res, next) {
        try {
            // Passe req.user au service
            const newCompany = await companyService.createCompany(req.body, req.user);
            res.status(201).json(new CompanyDto(newCompany));
        } catch (error) {
            next(error);
        }
    }
}

export default new CompanyController();