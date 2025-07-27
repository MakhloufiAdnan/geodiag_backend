export class LicenseDto {
  /**
   * @param {object} license - L'objet licence brut provenant de la base de données.
   */
  constructor(license) {
    this.licenseId = license.license_id;
    this.orderId = license.order_id;
    this.companyId = license.company_id;
    this.qrCodePayload = license.qr_code_payload;
    this.status = license.status;
    this.expiresAt = license.expires_at;
  }
}
