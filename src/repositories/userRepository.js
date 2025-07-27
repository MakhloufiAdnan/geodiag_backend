import { db } from '../db/index.js';

/**
 * @file Gère l'accès et la manipulation des données pour l'entité User.
 */
class UserRepository {
  /**
   * Récupère une liste paginée d'utilisateurs.
   * @param {number} limit - Le nombre d'utilisateurs par page.
   * @param {number} offset - Le décalage pour la pagination.
   * @returns {Promise<Array<object>>} Un tableau d'utilisateurs.
   */
  async findAll(limit, offset) {
    const { rows } = await db.query(
      'SELECT * FROM users ORDER BY last_name, first_name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  }

  /**
   * Compte le nombre total d'utilisateurs.
   * @returns {Promise<number>} Le nombre total d'utilisateurs.
   */
  async countAll() {
    const { rows } = await db.query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count, 10);
  }

  /**
   * Trouve un utilisateur par son ID.
   * @param {string} id - L'ID de l'utilisateur.
   * @returns {Promise<object|undefined>} L'objet utilisateur s'il est trouvé.
   */
  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [
      id,
    ]);
    return rows[0];
  }

  /**
   * Trouve un utilisateur par son email.
   * @param {string} email - L'email de l'utilisateur.
   * @returns {Promise<object|undefined>} L'objet utilisateur s'il est trouvé.
   */
  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    return rows[0];
  }

  /**
   * Crée un nouvel utilisateur.
   * @param {object} userData - Les données de l'utilisateur.
   * @param {object} [dbClient=db] - Client optionnel pour les transactions.
   * @returns {Promise<object>} L'objet de l'utilisateur créé.
   */
  async create(userData, dbClient = db) {
    const { company_id, email, password_hash, first_name, last_name, role } =
      userData;
    const { rows } = await dbClient.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [company_id, email, password_hash, first_name, last_name, role]
    );
    return rows[0];
  }

  /**
   * Met à jour un utilisateur existant.
   * @param {string} id - L'ID de l'utilisateur à mettre à jour.
   * @param {object} userData - Les nouvelles données de l'utilisateur.
   * @returns {Promise<object>} L'objet de l'utilisateur mis à jour.
   */
  async update(id, userData) {
    const updatableFields = [
      'first_name',
      'last_name',
      'email',
      'role',
      'is_active',
    ];
    const fieldsToUpdate = Object.keys(userData).filter((key) =>
      updatableFields.includes(key)
    );
    if (fieldsToUpdate.length === 0) return this.findById(id);

    const setClause = fieldsToUpdate
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(', ');
    const values = fieldsToUpdate.map((key) => userData[key]);
    const queryParams = [...values, id];

    const { rows } = await db.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = $${queryParams.length} RETURNING *`,
      queryParams
    );
    return rows[0];
  }

  /**
   * Supprime un utilisateur.
   * @param {string} id - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<object>} L'objet de l'utilisateur supprimé.
   */
  async delete(id) {
    const { rows } = await db.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
}

export default new UserRepository();
