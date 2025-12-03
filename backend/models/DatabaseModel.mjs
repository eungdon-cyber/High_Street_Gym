import mysql from "mysql2/promise";

export class DatabaseModel {
    static connection;

    static {
        this.connection = mysql.createPool({
            host: "localhost",
            user: "root",  
            password: "0000",  
            database: "high_street_gym",
            waitForConnections: true,// Allows queuing of requests if all connections are in use.
            connectionLimit: 10, // Maximum number of connections in the pool.
            queueLimit: 0, // Controls how many queries can wait if connections are full (0 means unlimited).
            dateStrings: true, // Ensures date/time values are returned as strings instead of JS Date objects.
            nestTables: true // Allows nested structures when performing complex joins.
        });
    }

    /**
     * Executes a SQL query with optional parameters.
     * @param {string} sql - The SQL query string.
     * @param {Array} values - Optional query parameters.
     * @returns {Promise<Array>} Promise that resolves to an array of database rows returned by the SQL query, or rejects if the query fails.
     */
    static query(sql, values = []) {
        return this.connection.query(sql, values)
            .then(([result]) => result)
            .catch(error => {
                console.error("Database query error:", error);
                throw error;
            });
    }

    /**
     * Converts JavaScript Date object to MySQL DATE format (YYYY-MM-DD).
     * @param {Date} date - JavaScript Date object.
     * @returns {string} Date string formatted as YYYY-MM-DD in Australian timezone for MySQL compatibility.
     */
    static toMySqlDate(date) {
        const year = date.toLocaleString("en-AU", { year: "numeric", timeZone: "Australia/Brisbane" });
        const month = date.toLocaleString("en-AU", { month: "2-digit", timeZone: "Australia/Brisbane" });
        const day = date.toLocaleString("en-AU", { day: "2-digit", timeZone: "Australia/Brisbane" });
        return [year, month, day].join("-");
    }
}
