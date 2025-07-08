import offerService from '../services/offerService.js';

class OfferController {
    async getAllOffers(req, res, next) {
        try {
            const offers = await offerService.getAllOffers(req.user);
            res.status(200).json(offers);
        } catch (error) {
            next(error);
        }
    }
}

export default new OfferController();