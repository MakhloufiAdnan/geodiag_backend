import offerService from '../services/offerService.js';

class OfferController {
    async getPublicOffers(req, res, next) {
        try {
            const offers = await offerService.getPublicOffers();
            res.status(200).json(offers);
        } catch (error) {
            next(error);
        }
    }
}
export default new OfferController();