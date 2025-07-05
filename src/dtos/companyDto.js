export class CompanyDto {
    constructor(company) {
        this.companyId = company.company_id;
        this.name = company.name;
        this.address = company.address;
        this.email = company.email;
        this.phoneNumber = company.phone_number;
    }
}