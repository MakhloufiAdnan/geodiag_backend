import { pool } from '../db/index.js';

/**
 * @file Fournit un wrapper pour exécuter des opérations dans une transaction de base de données.
 * @description Centralise la logique de BEGIN, COMMIT, ROLLBACK et de libération du client.
 * Cela garantit que les opérations sont atomiques et que les connexions sont toujours
 * retournées au pool, même en cas d'erreur.
 */

/**
 * Exécute une fonction de rappel à l'intérieur d'une transaction de base de données.
 * Si la fonction de rappel réussit, la transaction est validée (COMMIT).
 * Si elle échoue, la transaction est annulée (ROLLBACK).
 *
 * @param {function(import('pg').PoolClient): Promise<any>} callback - La fonction à exécuter.
 * Elle reçoit le client de base de données transactionnel en tant qu'argument et doit retourner une promesse.
 * @returns {Promise<any>} Le résultat retourné par la fonction de callback.
 * @throws Relance l'erreur originale si la transaction échoue.
 *
 * @example
 * const newUser = await withTransaction(async (client) => {
 * const res = await client.query('INSERT INTO users (name) VALUES ($1) RETURNING *', ['John']);
 * return res.rows[0];
 * });
 */
export async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        
        // Relance l'erreur pour que la couche de service ou le contrôleur puisse la gérer
        throw error;
    } finally {
      
        // Assure que la connexion est toujours libérée et retournée au pool
        client.release();
    }
}