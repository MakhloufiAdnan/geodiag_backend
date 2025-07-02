import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {};

// Si la variable DATABASE_URL existe 
if (process.env.DATABASE_URL) {
    dbConfig.connectionString = process.env.DATABASE_URL;
    dbConfig.ssl = {
        rejectUnauthorized: false
    };
} else {
    dbConfig.host = process.env.DB_HOST;
    dbConfig.port = process.env.DB_PORT;
    dbConfig.user = process.env.DB_USER;
    dbConfig.password = process.env.DB_PASSWORD;
    dbConfig.database = process.env.DB_DATABASE;
}

export default dbConfig;