/**
 * @file Initialise et exporte l'instance unique de pg-boss.
 * @module worker/boss
 * @description
 * Ce module crée une seule instance de PgBoss. Plutôt que d'utiliser une
 * configuration statique, il utilise directement la variable d'environnement
 * DATABASE_URL. Cela garantit que pg-boss se connecte à la bonne base de
 * données, que ce soit en environnement de développement, de test ou de production.
 */
import PgBoss from 'pg-boss';
import 'dotenv/config';

// Vérifier que la variable d'environnement est définie
if (!process.env.DATABASE_URL) {
  throw new Error(
    "FATAL: La variable d'environnement DATABASE_URL est requise pour pg-boss."
  );
}

/**
 * @constant {PgBoss} boss - L'instance unique et partagée de pg-boss,
 * configurée avec la chaîne de connexion de l'environnement actuel.
 */
const boss = new PgBoss(process.env.DATABASE_URL);

export default boss;
