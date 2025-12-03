import { DatabaseModel } from "./DatabaseModel.mjs";

export class LocationModel extends DatabaseModel {

    /**
     * Creates an instance of the LocationModel.
     * 
     * @param {number} id - The unique identifier for the location.
     * @param {string} name - The name of the location (e.g., "Downtown Gym").
     * @param {string} address - The physical address of the location.
     * @param {boolean} deleted - The status indicating whether the location is deleted or active (0 for active, 1 for deleted).
     */
    constructor(id, name, address, deleted) {
        super();
        this.id = id;
        this.name = name;
        this.address = address;
        this.deleted = deleted;
    }

    /**
     * Converts a table row into a LocationModel object.
     * @param {Object} row - Database row object.
     * @returns {LocationModel} An instance of LocationModel with the provided database row data.
     */
    static tableToModel(row) {
        return new LocationModel(
            row["id"],
            row["name"],
            row["address"],
            row["deleted"]
        );
    }

    /**
     * Retrieves all locations that are not deleted.
     * @returns {Promise<Array<LocationModel>>} Promise that resolves to an array of all active locations, sorted by name.
     */
    static async getAll() {
        return this.query("SELECT * FROM locations WHERE deleted = 0 ORDER BY name")
            .then(results => results.map(row => this.tableToModel(row.locations)));
    }

    /**
     * Retrieves a location by its ID.
     * @param {number} id - Location ID.
     * @returns {Promise<LocationModel>} Promise that resolves to the location with the specified ID, or rejects if not found.
     */
    static async getById(id) {
        return this.query("SELECT * FROM locations WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].locations)
                    : Promise.reject("Location not found - check this message")
            );
    }

    /**
     * Retrieves locations by search term (name or address).
     * @param {string} term - Search keyword.
     * @returns {Promise<Array<LocationModel>>} Promise that resolves to an array of locations matching the search term in name or address.
     */
    static async getBySearch(term) {
        return this.query(`
            SELECT * FROM locations
            WHERE deleted = 0
            AND (name LIKE ? OR address LIKE ?)
        `, [`%${term}%`, `%${term}%`])
            .then(results => results.map(row => this.tableToModel(row.locations || row)));
    }

    /**
     * Creates a new location.
     * @param {LocationModel} location - Location object.
     * @returns {Promise<void>} Promise that resolves when the new location is successfully inserted into the database.
     */
    static async create(name, address) {
        return this.query(
            `INSERT INTO locations (name, address, deleted) VALUES (?, ?, 0)`,
            [name, address]
        );
    }

    /**
     * Updates an existing location.
     * @param {LocationModel} location - Updated location object.
     * @returns {Promise<void>} Promise that resolves when the location is successfully updated in the database.
     */
    static async update(id, location) {
        return this.query(
            "UPDATE locations SET name = ?, address = ? WHERE id = ?",
            [location.name, location.address, id]  // Fix parameter order
        );
    }
    

    /**
     * Soft deletes a location by ID.
     * @param {number} id - Location ID.
     * @returns {Promise<void>} Promise that resolves when the location is successfully marked as deleted (soft delete).
     */
    static async delete(id) {
        return this.query("UPDATE locations SET deleted = 1 WHERE id = ?", [id])
            .then(result => result.affectedRows > 0 ? result : Promise.reject("Location not found"));
    }
}
