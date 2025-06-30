import { query } from '../db/index.js'; 

class UserRepository {
    async findAll() {
        const { rows } = await query('SELECT * FROM users');
        return rows;
    }
    
    async findById(id) {
        const { rows } = await query('SELECT * FROM users WHERE user_id = $1', [id]);
        return rows[0];
    }
}

export default new UserRepository();