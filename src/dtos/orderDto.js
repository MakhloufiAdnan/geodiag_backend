export class OrderDto {

    /**
     * @param {object} order - L'objet commande brut provenant de la base de données.
     */
    constructor(order) {
        this.orderId = order.order_id;
        this.companyId = order.company_id;
        this.offerId = order.offer_id;
        this.orderNumber = order.order_number;
        this.amount = order.amount;
        this.status = order.status;
        this.createdAt = order.created_at;
    }
}
