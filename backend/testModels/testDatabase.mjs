import { DatabaseModel } from "../models/DatabaseModel.mjs";

(async () => {
    try {
        console.log("Testing database connection...");

        // Ensure connection pool is set up
        await DatabaseModel.connection.getConnection();
        console.log("Database connection established.");

        // Execute a test query
        const result = await DatabaseModel.query("SELECT 1 + 1 AS test");
        console.log("Test query successful:", result);
    } catch (error) {
        console.error("Database connection failed:", error);
    } finally {
        process.exit(); // Ensure the process exits after execution
    }
})();
