export class CompanyDto {
  /**
   * @param {object} company - L'objet compagnie brut provenant de la base de données.
   */
  constructor(company) {
    this.companyId = company.company_id;
    this.name = company.name;
    this.address = company.address;
    this.email = company.email;
    this.phoneNumber = company.phone_number;
  }
}
