export class UserDto {
  /**
   * @param {object} user - L'objet utilisateur brut provenant de la base de données.
   */
  constructor(user) {
    this.userId = user.user_id;
    this.companyId = user.company_id;
    this.email = user.email;
    this.firstName = user.first_name;
    this.lastName = user.last_name;
    this.role = user.role;
    this.isActive = user.is_active;
  }
}
