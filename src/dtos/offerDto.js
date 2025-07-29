export class OfferDto {
  /**
   * @param {object} offer - L'objet offre brut provenant de la base de données.
   */
  constructor(offer) {
    this.offerId = offer.offer_id;
    this.name = offer.name;
    this.description = offer.description;
    this.price = offer.price;
    this.durationMonths = offer.duration_months;
    this.maxUsers = offer.max_users;
  }
}
