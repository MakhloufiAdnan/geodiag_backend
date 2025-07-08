export async function validateWebhook(req, res, next) {
    // 1. Vérifier que la clé secrète du webhook est bien configurée
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('❌ La clé secrète du webhook Stripe (STRIPE_WEBHOOK_SECRET) n\'est pas définie.');
        // C'est une erreur serveur, car l'application est mal configurée.
        return res.status(500).send('Erreur de configuration du serveur.');
    }

    // 2. Récupérer la signature depuis les en-têtes
    const signature = req.headers['stripe-signature'];

    try {
        // 3. Utiliser la librairie Stripe pour construire et valider l'événement.
        // C'est ici que le corps brut (req.body, qui est un Buffer grâce à express.raw()) est essentiel.
        const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

        // 4. Si la validation réussit, on attache l'événement vérifié à la requête.
        // Le contrôleur suivant pourra l'utiliser en toute sécurité.
        req.webhookEvent = event;
        
        console.log('✅ Webhook Stripe validé avec succès.');
        next();

    } catch (err) {
        console.error('❌ Échec de la validation du webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
}