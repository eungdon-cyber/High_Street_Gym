import { DatabaseModel } from "./DatabaseModel.mjs";
import bcrypt from "bcrypt"

// Define user roles as constants
export const USER_ROLE_MEMBER = "member";
export const USER_ROLE_TRAINER = "trainer";
export const USER_ROLE_ADMIN = "admin";

export class UserModel extends DatabaseModel {
    /**
     * Creates an instance of the UserModel.
     * @param {number|null} id - The ID of the user (null if not yet created).
     * @param {string} email - The email address of the user.
     * @param {string} password - The password of the user.
     * @param {string} role - The role of the user (e.g., "admin", "trainer", "member").
     * @param {string} firstName - The first name of the user.
     * @param {string} lastName - The last name of the user.
     * @param {number} deleted - The deletion status of the user (0 for active, 1 for deleted).
     * @param {string|null} authenticationKey - The authentication key for the user.
     */
    constructor(id, email, password, role, firstName, lastName, deleted, authenticationKey = null) {
        super();
        this.id = id;
        this.email = email;
        this.password = password;
        this.role = role;
        this.firstName = firstName;
        this.lastName = lastName;
        this.deleted = deleted;
        this.authenticationKey = authenticationKey;
    }

    /**
     * Converts a table row into a UserModel object.
     * @param {Object} row - Database row object.
     * @returns {UserModel} A UserModel instance created from the provided database row data.
     */
    static tableToModel(row) {
        return new UserModel(
            row["id"],
            row["email"],
            row["password"],
            row["role"],
            row["first_name"],  // Database column (snake_case) → maps to firstName (camelCase)
            row["last_name"],   // Database column (snake_case) → maps to lastName (camelCase)
            row["deleted"],
            row["authentication_key"]
        );
    }

    /**
     * Retrieves all users that are not deleted.
     * @returns {Promise<Array<UserModel>>} Promise that resolves to an array of all active users, sorted by role (admin, trainer, member) and then by name.
     */
    static async getAll() {
        return this.query(`
            SELECT * FROM users 
            WHERE deleted = 0 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'trainer' THEN 2 
                    WHEN 'member' THEN 3 
                    ELSE 4 
                END,
                last_name, first_name
        `)
            .then(results => results.map(row => this.tableToModel(row.users))); // Corrected 'row' to 'row.users'
    }

    /**
     * Retrieves a user by their ID.
     * @param {number} id - User ID.
     * @returns {Promise<UserModel>} Promise that resolves to the user with the specified ID, or rejects if not found.
     */
    static async getById(id) {
        return this.query("SELECT * FROM users WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].users)  // Corrected 'row' to 'row.users'
                    : Promise.reject("User not found")
            );
    }

    /**
     * Retrieves a user by their email address.
     * @param {string} email - User email address.
     * @returns {Promise<UserModel>} Promise that resolves to the user with the specified email address, or rejects if not found.
     */
    static async getByEmail(email) {
        return this.query("SELECT * FROM users WHERE email = ? AND deleted = 0", [email])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].users)  // Corrected 'row' to 'row.users'
                    : Promise.reject("User not found")
            );
    }

    /**
     * Retrieves users by role.
     * @param {string} role - User role.
     * @returns {Promise<Array<UserModel>>} Promise that resolves to an array of users with the specified role.
     */
    static async getByRole(role) {
        return this.query("SELECT * FROM users WHERE role = ? AND deleted = 0", [role])
            .then(results => results.map(row => this.tableToModel(row.users)));  // Corrected 'row' to 'row.users'
    }

    /**
     * Retrieves a user by their authentication key.
     * @param {string} authenticationKey - User authentication key.
     * @returns {Promise<UserModel>} Promise that resolves to the user with the specified authentication key, or rejects if not found.
     */
    static async getByAuthenticationKey(authenticationKey) {
        return this.query("SELECT * FROM users WHERE authentication_key = ? AND deleted = 0", [authenticationKey])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].users)
                    : Promise.reject("not found")
            );
    }

    /**
     * Creates a new user in the database.
     * @param {UserModel} user - User object.
     * @returns {Promise<Object>} Promise that resolves to an object containing the insertId of the newly created user.
     */
    static async create(user) {

    // Hash the password before saving the user
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        return this.query(
            `INSERT INTO users (email, password, role, first_name, last_name, deleted) 
            VALUES (?, ?, ?, ?, ?, 0)`,
            [
                user.email,
                hashedPassword,
                user.role,
                user.firstName, // This should match the parameter name
                user.lastName   // This should match the parameter name
            ]
        ).then(result => ({ insertId: result.insertId }));
    }

/**
 * Updates an existing user's details.
 * If a password is provided, it will be hashed before updating.
 * 
 * @param {number} id - The ID of the user to update.
 * @param {UserModel} user - The updated UserModel object.
 * @returns {Promise<mysql.ResultSetHeader>} Promise that resolves to the MySQL result packet containing update information (affectedRows, changedRows, etc.).
 */
    static async update(id, user) {
        // If password is provided, hash it
        if (user.password) {
            const saltRounds = 10;
            user.password = await bcrypt.hash(user.password, saltRounds);
        }

        // Build the query dynamically based on whether password is provided
        if (user.password) {
        return this.query(
            `UPDATE users
            SET email = ?, password = ?, role = ?, first_name = ?, last_name = ?, authentication_key = ?, deleted = ?
            WHERE id = ?`,
            [
                user.email,
                user.password,
                user.role,
                user.firstName,  // Match camelCase with firstName
                user.lastName,   // Match camelCase with lastName
                user.authenticationKey || null,  // Handle authentication key
                user.deleted || 0,  // Ensure deleted is either 0 or the value passed in the request
                id  // Ensure the ID passed as parameter is used in the WHERE clause
            ]
        );
        } else {
            // Don't update password if not provided
            return this.query(
                `UPDATE users
                SET email = ?, role = ?, first_name = ?, last_name = ?, authentication_key = ?, deleted = ?
                WHERE id = ?`,
                [
                    user.email,
                    user.role,
                    user.firstName,  // Match camelCase with firstName
                    user.lastName,   // Match camelCase with lastName
                    user.authenticationKey || null,  // Handle authentication key
                    user.deleted || 0,  // Ensure deleted is either 0 or the value passed in the request
                    id  // Ensure the ID passed as parameter is used in the WHERE clause
                ]
            );
        }
    }

    /**
     * Updates a user object directly (used for API authentication).
     * @param {UserModel} user - User object to update.
     * @returns {Promise<mysql.ResultSetHeader>} Promise that resolves to the MySQL result packet containing update information.
     */
    static async update(user) {
        return this.query(
            `UPDATE users
            SET email = ?, password = ?, role = ?, first_name = ?, last_name = ?, authentication_key = ?, deleted = ?
            WHERE id = ?`,
            [
                user.email,
                user.password,
                user.role,
                user.firstName,  // Use camelCase property
                user.lastName,   // Use camelCase property
                user.authenticationKey || null,
                user.deleted || 0,
                user.id
            ]
        );
    }

    /**
     * Soft deletes a user by ID.
     * @param {number} id - User ID.
     * @returns {Promise<mysql.ResultSetHeader>} Promise that resolves to the MySQL result packet containing delete information (affectedRows, etc.) after soft-deleting the user.
     */
    static async delete(id) {
        try {
            const result = await this.query("UPDATE users SET deleted = 1 WHERE id = ?", [id]);
            if (result.affectedRows === 0) {
                throw new Error("User not found");
            }
            return result;
        } catch (error) {
            console.error("Error in UserModel.delete:", error);
            throw error;
        }
    }
}
