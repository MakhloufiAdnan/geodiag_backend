export const typeDefs = `#graphql
    # --- TYPES DE BASE ---

    type User {
        userId: ID!
        email: String!
        firstName: String
        lastName: String
        role: String
        company: Company
    }

    type Company {
        companyId: ID!
        name: String!
        email: String!
    }

    type Offer {
        offerId: ID!
        name: String!
        description: String
        price: Float!
        durationMonths: Int!
    }

    type Order {
        orderId: ID!
        orderNumber: String!
        amount: Float!
        status: String!
        createdAt: String!
        # Relations
        offer: Offer
        company: Company
    }
    
    type License {
        licenseId: ID!
        status: String!
        expiresAt: String!
        qrCodePayload: String!
        # Relations
        order: Order
    }

    # --- TYPES SPÉCIFIQUES AUX OPÉRATIONS ---

    type AuthPayload {
        token: String!
        user: User!
    }
    
    # Type de retour pour l'initiation du paiement
    type CheckoutSessionPayload {
        sessionId: String!
        url: String!
    }

    # Un type pour les métadonnées de pagination
    type PaginationMeta {
        totalItems: Int!
        totalPages: Int!
        currentPage: Int!
        pageSize: Int!
    }

    # Un type qui combine les données et les métadonnées
    type PaginatedUsers {
        data: [User]!
        meta: PaginationMeta!
    }

    # --- QUERIES (Lecture) ---

    type Query {
        # Récupère les offres commerciales (accessible aux admins)
        offers: [Offer!]

        # Récupère une commande par son ID (accessible à l'admin de la compagnie propriétaire)
        order(id: ID!): Order
        
        # Récupère la licence active de la compagnie de l'admin connecté
        myActiveLicense: License
        
        # Récupère les informations de l'utilisateur connecté
        me: User

        # Récupère la liste paginée des utilisateurs
        users(page: Int, limit: Int): PaginatedUsers
    }

    # --- MUTATIONS (Écriture) ---

    type Mutation {
        # --- Authentification ---
        loginCompanyAdmin(email: String!, password: String!): AuthPayload!
        loginTechnician(email: String!, password: String!): AuthPayload!

        # --- Flux d'achat ---
        # Étape 1: Un admin crée une commande à partir d'une offre
        createOrder(offerId: ID!): Order!
        
        # Étape 2: Un admin initie le paiement pour une commande en attente
        createCheckoutSession(orderId: ID!): CheckoutSessionPayload!
    }
`;

