/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.sql(`
    -- ########## 0. FONCTION TRIGGER POUR LA MISE À JOUR AUTOMATIQUE ##########
    -- Cette fonction met à jour le champ 'updated_at' à la date/heure actuelle.
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- ########## 1. DÉFINITION DES TYPES ENUMÉRÉS ##########

    CREATE TYPE user_role AS ENUM ('admin', 'technician');
    CREATE TYPE license_status AS ENUM ('active', 'expired', 'revoked');
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'closed', 'resolved');
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
    CREATE TYPE energy_type AS ENUM ('diesel', 'gasoline', 'electric', 'hybrid', 'other'); 
    CREATE TYPE measurement_value_status AS ENUM ('in_tolerance', 'out_of_tolerance'); 
    CREATE TYPE submission_status AS ENUM ('new', 'read', 'archived');
    CREATE TYPE payment_method AS ENUM ('card', 'paypal', 'transfer'); 
    CREATE TYPE vehicle_image_category AS ENUM ('front_axle', 'rear_axle', 'vin_plate', 'damage', 'other');

    -- ########## 2. TABLES PRINCIPALES (COEUR DE L'APPLICATION) ##########

    CREATE TABLE companies (
        company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(50) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role user_role NOT NULL DEFAULT 'technician',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE offers (
        offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration_months INT NOT NULL,
        max_users INT,
        is_public BOOLEAN NOT NULL DEFAULT true, -- Pour pouvoir masquer des offres
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_offers BEFORE UPDATE ON offers FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE orders (
        order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE RESTRICT,
        offer_id UUID NOT NULL REFERENCES offers(offer_id) ON DELETE RESTRICT,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status order_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE payments (
        payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        gateway_ref VARCHAR(255), -- Référence externe (ex: Stripe, PayPal)
        amount DECIMAL(10, 2) NOT NULL,
        status payment_status NOT NULL,
        method payment_method NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE licenses (
        license_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT, -- Une licence par commande
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        qr_code_payload TEXT UNIQUE NOT NULL,
        status license_status NOT NULL DEFAULT 'active',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ########## TABLE POUR LA GESTION DES SESSIONS VIA REFRESH TOKENS ##########

    CREATE TABLE refresh_tokens (
        token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        -- Stockage d'un hash du token
        token_hash VARCHAR(255) NOT NULL,
        -- Date d'expiration du refresh token
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ########## 3. TABLES DE DONNÉES (VÉHICULES & MESURES) ##########

    CREATE TABLE brands (
        brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE manufacturer_data (
        manufacturer_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- JSONB stocke les données brutes d'Autodata/HaynesPro: specs, tailles de roues préconisées, etc.
        data JSONB NOT NULL
    );

    CREATE TABLE models (
        model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id UUID NOT NULL REFERENCES brands(brand_id) ON DELETE RESTRICT,
        manufacturer_data_id UUID REFERENCES manufacturer_data(manufacturer_data_id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        year_start INT,
        year_end INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_models BEFORE UPDATE ON models FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE vehicles (
        vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model_id UUID NOT NULL REFERENCES models(model_id) ON DELETE RESTRICT,
        registration VARCHAR(15) UNIQUE NOT NULL,
        vin VARCHAR(17) UNIQUE NOT NULL,
        first_registration_date DATE NOT NULL,
        energy energy_type NOT NULL,
        mileage INT NOT NULL,
        current_wheel_size VARCHAR(50),
        -- JSONB pour les options: ADAS, chassis sport, 4 roues directrices, etc.
        options JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_vehicles BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE measurement_reports (
        report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL, -- SET NULL si le technicien est supprimé
        report_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- La table qui définit chaque mesure possible
    CREATE TABLE measurement_definitions (
        definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Code unique pour la mesure (ex: 'camber_front_left')
        code VARCHAR(100) UNIQUE NOT NULL,
        -- Nom lisible pour l'affichage (ex: 'Carrossage Avant Gauche')
        label VARCHAR(255) NOT NULL,
        -- Unité de la mesure ('degrés', 'mm', 'min')
        unit VARCHAR(20) NOT NULL,
        description TEXT
    );

    CREATE TABLE measurement_values (
        value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES measurement_reports(report_id) ON DELETE CASCADE,
        measurement_definition_id UUID NOT NULL REFERENCES measurement_definitions(definition_id),
        measured_value DECIMAL(10, 2),
        manufacturer_min_value DECIMAL(10, 2),
        manufacturer_max_value DECIMAL(10, 2),
        status measurement_value_status NOT NULL,
        sensor_raw_data JSONB
    );

    CREATE TABLE vehicle_images (
        image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        s3_url TEXT NOT NULL, -- URL vers le bucket S3
        category vehicle_image_category NOT NULL,
        description TEXT,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE interpretation_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model_id UUID REFERENCES models(model_id) ON DELETE SET NULL,
        measurement_definition_id UUID NOT NULL REFERENCES measurement_definitions(definition_id),
        condition VARCHAR(100) NOT NULL, -- ex: 'less_than_min', 'greater_than_max'
        interpretation_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ########## 4. TABLES POUR LE SITE WEB (SUPPORT, CONTACT) ##########

    CREATE TABLE contact_submissions (
        submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_name VARCHAR(255) NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status submission_status NOT NULL DEFAULT 'new',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id UUID REFERENCES users(user_id) ON DELETE SET NULL
    );

    CREATE TABLE support_tickets (
        ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        created_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        assigned_to_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        subject VARCHAR(255) NOT NULL,
        status ticket_status NOT NULL DEFAULT 'open',
        priority ticket_priority NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TRIGGER set_timestamp_support_tickets BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

    CREATE TABLE ticket_messages (
        message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ########## 5. TABLES POUR LA GESTION OFFLINE-FIRST ##########

    CREATE TABLE offline_data_cache (
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        manufacturer_data_id UUID NOT NULL REFERENCES manufacturer_data(manufacturer_data_id) ON DELETE CASCADE,
        downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, manufacturer_data_id)
    );

    -- ########## 6. INDEX POUR L'OPTIMISATION DES REQUÊTES ##########

    -- Accélération de la recherche de user par email
    CREATE INDEX idx_users_email ON users(email);

    -- Accélération de la recherche de licence par QR code ou statut
    CREATE INDEX idx_licenses_qr_code ON licenses(qr_code_payload);
    CREATE INDEX idx_licenses_status ON licenses(status);

    -- Accélération de la recherche de véhicule par immatriculation ou VIN
    CREATE INDEX idx_vehicles_registration ON vehicles(registration);
    CREATE INDEX idx_vehicles_vin ON vehicles(vin);

    -- Accélération de la recherche d'historique de rapports par véhicule ou technicien
    CREATE INDEX idx_measurement_reports_vehicle_id ON measurement_reports(vehicle_id);
    CREATE INDEX idx_measurement_reports_user_id ON measurement_reports(user_id);

    -- Accélération des jointures
    CREATE INDEX idx_users_company_id ON users(company_id);
    CREATE INDEX idx_models_brand_id ON models(brand_id);
    CREATE INDEX idx_orders_company_id ON orders(company_id);
    CREATE INDEX idx_payments_order_id ON payments(order_id);
    CREATE INDEX idx_support_tickets_company_id ON support_tickets(company_id);
    CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
    CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX idx_measurement_values_definition_id ON measurement_values(measurement_definition_id);
    CREATE INDEX idx_interpretation_rules_definition_id ON interpretation_rules(measurement_definition_id);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
    -- ########## 6. SUPPRESSION DES INDEX ##########
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_licenses_qr_code;
    DROP INDEX IF EXISTS idx_licenses_status;
    DROP INDEX IF EXISTS idx_vehicles_registration;
    DROP INDEX IF EXISTS idx_vehicles_vin;
    DROP INDEX IF EXISTS idx_measurement_reports_vehicle_id;
    DROP INDEX IF EXISTS idx_measurement_reports_user_id;
    DROP INDEX IF EXISTS idx_users_company_id;
    DROP INDEX IF EXISTS idx_models_brand_id;
    DROP INDEX IF EXISTS idx_orders_company_id;
    DROP INDEX IF EXISTS idx_payments_order_id;
    DROP INDEX IF EXISTS idx_support_tickets_company_id;
    DROP INDEX IF EXISTS idx_ticket_messages_ticket_id;
    DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
    DROP INDEX IF EXISTS idx_measurement_values_definition_id;
    DROP INDEX IF EXISTS idx_interpretation_rules_definition_id;

    -- ########## 5. SUPPRESSION DES TABLES (ORDRE INVERSE DE CRÉATION) ##########

    -- Tables pour la gestion Offline-First
    DROP TABLE IF EXISTS offline_data_cache;
    
    -- Tables pour le site web (Support, Contact)
    DROP TABLE IF EXISTS ticket_messages;
    DROP TABLE IF EXISTS support_tickets;
    DROP TABLE IF EXISTS contact_submissions;
    
    -- Tables de données (Véhicules & Mesures)
    DROP TABLE IF EXISTS interpretation_rules;
    DROP TABLE IF EXISTS vehicle_images;
    DROP TABLE IF EXISTS measurement_values;
    DROP TABLE IF EXISTS measurement_definitions;
    DROP TABLE IF EXISTS measurement_reports;
    DROP TABLE IF EXISTS vehicles;
    DROP TABLE IF EXISTS models;
    DROP TABLE IF EXISTS manufacturer_data;
    DROP TABLE IF EXISTS brands;

    -- Table pour la gestion des sessions
    DROP TABLE IF EXISTS refresh_tokens;

    -- Tables principales (Coeur de l'application)
    DROP TABLE IF EXISTS licenses;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS offers;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS companies;

    -- ########## 2. SUPPRESSION DES TYPES ENUMÉRÉS ##########
    DROP TYPE IF EXISTS vehicle_image_category;
    DROP TYPE IF EXISTS payment_method;
    DROP TYPE IF EXISTS submission_status;
    DROP TYPE IF EXISTS measurement_value_status;
    DROP TYPE IF EXISTS energy_type;
    DROP TYPE IF EXISTS ticket_priority;
    DROP TYPE IF EXISTS ticket_status;
    DROP TYPE IF EXISTS order_status;
    DROP TYPE IF EXISTS payment_status;
    DROP TYPE IF EXISTS license_status;
    DROP TYPE IF EXISTS user_role;

    -- ########## 1. SUPPRESSION DE LA FONCTION TRIGGER ##########
    DROP FUNCTION IF EXISTS trigger_set_timestamp();
    `);
};