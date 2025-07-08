import { db } from '../db/index.js';

class PaymentRepository {
    async create(paymentData, dbClient = db) {
        const { order_id, gateway_ref, amount, status, method } = paymentData;
        const { rows } = await dbClient.query(
            `INSERT INTO payments (order_id, gateway_ref, amount, status, method)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [order_id, gateway_ref, amount, status, method],
        );
        return rows[0];
    }
}
export default new PaymentRepository();