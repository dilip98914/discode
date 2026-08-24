import mysql from 'mysql';

const connection = mysql.createPool({
    connectionLimit: Number(process.env.MAX_DB_CONN) || 50,
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'toor',
    database: process.env.DATABASE_NAME || 'discode'
});

export = connection;
