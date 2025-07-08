export class OfferDto {
    constructor(offer) {
        this.offerId = offer.offer_id;
        this.name = offer.name;
        this.description = offer.description;
        this.price = offer.price;
        this.durationMonths = offer.duration_months;
        this.maxUsers = offer.max_users;
    }
}