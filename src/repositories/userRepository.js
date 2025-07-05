import { db } from '../db/index.js';

class UserRepository {
    async findAll(limit, offset) {
        const { rows } = await db.query(
            'SELECT * FROM users ORDER BY last_name, first_name LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return rows;
    }

    async countAll() {
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        return parseInt(rows[0].count, 10);
    }

    async findById(id) {
        const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);
        return rows[0];
    }

    async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    }

    async create(userData, dbClient = db) { // Accepte un client optionnel
        const { company_id, email, password_hash, first_name, last_name, role } = userData;
        const { rows } = await dbClient.query( // Utilise le client ou la connexion par défaut
            `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
            [company_id, email, password_hash, first_name, last_name, role]
        );
        return rows[0];
    }

    async update(id, userData) {
        // Liste blanche des champs modifiables pour la sécurité.
        const updatableFields = ['first_name', 'last_name', 'email', 'role', 'is_active'];

        const fieldsToUpdate = Object.keys(userData)
            .filter(key => updatableFields.includes(key));

        if (fieldsToUpdate.length === 0) {
            return this.findById(id); // Si rien à mettre à jour, renvoyer l'utilisateur actuel.
        }

        // Construction dynamique de la requête "SET".
        const setClause = fieldsToUpdate
            .map((key, index) => `"${key}" = $${index + 1}`)
            .join(', ');

        const values = fieldsToUpdate.map(key => userData[key]);
        const queryParams = [...values, id];

        const { rows } = await db.query(
            `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = $${queryParams.length} RETURNING *`,
            queryParams
        );
        return rows[0];
    }

    async delete(id) {
        const { rows } = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id]);
        return rows[0];
    }
}

export default new UserRepository();