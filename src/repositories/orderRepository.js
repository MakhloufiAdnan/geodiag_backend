import { db } from '../db/index.js';

class OrderRepository {
    async create(orderData, dbClient = db) {
        const { company_id, offer_id, order_number, amount } = orderData;
        const { rows } = await dbClient.query(
            `INSERT INTO orders (company_id, offer_id, order_number, amount, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [company_id, offer_id, order_number, amount]
        );
        return rows[0];
    }
    
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM orders WHERE order_id = $1', [id]);
        return rows[0];
    }

    async updateStatus(orderId, status, dbClient = db) {
        const { rows } = await dbClient.query(
            "UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *",
            [status, orderId]
        );
        return rows[0];
    }
}
export default new OrderRepository();
