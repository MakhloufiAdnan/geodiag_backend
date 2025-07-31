# 'set -e' garantit que le script s'arrêtera immédiatement si une commande échoue.
set -e

mkdir -p /app/.ssh
echo "$PROD_SSH_PRIVATE_KEY" > /app/.ssh/id_ed25519
chmod 600 /app/.ssh/id_ed25519

echo "Host *\n  StrictHostKeyChecking no" > /app/.ssh/config
chmod 600 /app/.ssh/config

echo "Starting SSH tunnel in the background..."
ssh -N -L 5433:localhost:5432 assistantsinistregeodiag@ssh-assistantsinistregeodiag.alwaysdata.net &

# Récupère l'ID du processus (PID) du tunnel SSH
TUNNEL_PID=$!

# Met en place une "trap" qui s'assurera de tuer le processus du tunnel
# lorsque le script reçoit un signal de terminaison (SIGINT, SIGTERM).
# C'est crucial pour un arrêt propre du conteneur.
trap "echo 'Stopping SSH tunnel...'; kill $TUNNEL_PID" SIGINT SIGTERM

echo "Tunnel established with PID $TUNNEL_PID. Waiting for it to be ready..."
sleep 5

echo "Starting application with 'npm start'..."

# La 'trap' reste actif et se déclenchera à la fin de l'application.
exec npm start
