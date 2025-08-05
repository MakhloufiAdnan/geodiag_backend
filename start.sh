# @file         start.sh
# @description  Script de démarrage pour le conteneur de l'application.
#               Ce script assure que la base de données est prête avant de
#               lancer les migrations, puis démarre l'application Node.js.
#
# @requires     DATABASE_URL - Une variable d'environnement contenant l'URL de
#               connexion complète à la base de données PostgreSQL.

# Configure le shell pour qu'il quitte immédiatement si une commande échoue.
set -e

# --- Attente de la Base de Données ---
# Boucle qui met en pause l'exécution du script jusqu'à ce que la base de
# données soit prête à accepter des connexions. C'est essentiel dans un
# environnement conteneurisé où les services démarrent en parallèle.
echo "Waiting for database to be ready..."
until pg_isready --dbname="$DATABASE_URL" --quiet; do
  echo "PostgreSQL is unavailable - sleeping for 2 seconds..."
  sleep 2
done
echo "✅ Database is up and running!"

# --- Application des Migrations ---
# Une fois la base de données accessible, cette commande applique toutes les
# migrations de base de données qui n'ont pas encore été exécutées,
# garantissant que le schéma est à jour avec le code.
echo "Running database migrations..."
npm run migrate up
echo "✅ Migrations applied successfully."

# --- Démarrage de l'Application ---
# 'exec' remplace le processus shell actuel par le processus de l'application.
# C'est une bonne pratique qui assure que les signaux du système (comme
# l'arrêt du conteneur) sont correctement transmis à l'application Node.js.
echo "🚀 Starting application..."
exec npm start