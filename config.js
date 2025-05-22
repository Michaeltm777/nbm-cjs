const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test database connection
pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log("Connected to database");
    connection.release();
});

const churchInfo = {
    location: "United Kingdom",
    email: "info@church-nbm.com",
    whatsapp: "+44 7868 782886",
    phone: "+44 330 122 44 99",
    registrationNumber: "12213379",
};

module.exports = {
    db: pool,
    churchInfo,
};
