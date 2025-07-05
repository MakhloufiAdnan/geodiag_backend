import { db } from '../db/index.js';

class VehicleRepository {
    async findById(id) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [id]);
        return rows[0];
    }

    async findByRegistration(registration) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE registration = $1', [registration]);
        return rows[0];
    }
    
    async findByVin(vin) {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE vin = $1', [vin]);
        return rows[0];
    }

    async create(vehicleData) {
        const { model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options } = vehicleData;
        const { rows } = await db.query(
            `INSERT INTO vehicles (model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
            [model_id, registration, vin, first_registration_date, energy, mileage, current_wheel_size, options]
        );
        return rows[0];
    }
}

export default new VehicleRepository();