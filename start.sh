# 'set -e' garantit que le script s'arrêtera immédiatement si une commande échoue.
set -e

# Crée le répertoire .ssh s'il n'existe pas
mkdir -p /app/.ssh

# Configure la clé privée SSH
echo "$PROD_SSH_PRIVATE_KEY" > /app/.ssh/id_ed25519
chmod 600 /app/.ssh/id_ed25519

# Scanne et ajoute la clé du serveur aux hôtes de confiance.
# Cette méthode est plus robuste et forcera la mise à jour du cache Docker.
ssh-keyscan ssh-assistantsinistregeodiag.alwaysdata.net >> /app/.ssh/known_hosts

echo "Starting SSH tunnel for PostgreSQL..."
ssh -N -L 5433:localhost:5432 assistantsinistregeodiag@ssh-assistantsinistregeodiag.alwaysdata.net &

# Récupère l'ID du processus (PID) du tunnel SSH
TUNNEL_PID=$!

# Met en place un "trap" pour un arrêt propre
trap "echo 'Stopping SSH tunnel...'; kill $TUNNEL_PID" SIGINT SIGTERM

echo "Tunnel established with PID $TUNNEL_PID. Waiting for it to be ready..."
sleep 5

echo "Starting application with 'npm start'..."
exec npm start