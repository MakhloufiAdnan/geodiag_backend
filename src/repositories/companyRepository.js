import { db } from '../db/index.js';

class CompanyRepository {
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM companies WHERE company_id = $1', [id]);
        return rows[0];
    }

    async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM companies WHERE email = $1', [email]);
        return rows[0];
    }

    async findAll() {
        const { rows } = await db.query('SELECT * FROM companies ORDER BY name');
        return rows;
    }

    async create(companyData, dbClient = db) { // Accepte un client optionnel
        const { name, address, email, phone_number } = companyData;
        const { rows } = await dbClient.query( // Utilise le client ou la connexion par défaut
            `INSERT INTO companies (name, address, email, phone_number)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
            [name, address, email, phone_number]
        );
        return rows[0];
    }
}

export default new CompanyRepository();