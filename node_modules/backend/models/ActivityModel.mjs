import { DatabaseModel } from "./DatabaseModel.mjs";

export class ActivityModel extends DatabaseModel {

    /**
     * Constructor for initializing an instance of ActivityModel.
     * @param {number} id - The unique ID of the activity.
     * @param {string} name - The name of the activity.
     * @param {string} description - A description of the activity.
     * @param {number} deleted - Flag to indicate if the activity is deleted (0 = active, 1 = deleted).
     */
    constructor(id, name, description, deleted) {
        super();
        this.id = id;
        this.name = name;
        this.description = description;
        this.deleted = deleted;
    }
    
    /**
     * Converts a database row into an ActivityModel instance.
     * 
     * @param {Object} row - A database row containing activity data.
     * @returns {ActivityModel} An instance of ActivityModel with the provided database row data.
     */
    static tableToModel(row) {
        return new ActivityModel(
            row["id"],
            row["name"],
            row["description"],
            row["deleted"]
        );
    }

    /**
     * Retrieves all activities that are not deleted.
     * @returns {Promise<Array<ActivityModel>>} Promise that resolves to an array of all active activities, sorted by name.
     */
    static getAll() {
        return this.query("SELECT * FROM activities WHERE deleted = 0 ORDER BY name")
            .then(result => result.map(row => this.tableToModel(row.activities)));
    }

    /**
     * Retrieves activities by search term (name or description).
     * @param {string} term - Search keyword.
     * @returns {Promise<Array<ActivityModel>>} Promise that resolves to an array of activities matching the search term in name or description.
     */
    static getBySearch(term) {
        return this.query(`
            SELECT * FROM activities 
            WHERE deleted = 0 
            AND (name LIKE ? OR description LIKE ?)
        `, [`%${term}%`, `%${term}%`])
            .then(result => result.map(row => this.tableToModel(row.activities)));
    }

    /**
     * Retrieves an activity by ID.
     * @param {number} id - Activity ID.
     * @returns {Promise<ActivityModel>} Promise that resolves to the activity with the specified ID, or rejects if not found.
     */
    static getById(id) {
        return this.query("SELECT * FROM activities WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].activities)
                    : Promise.reject("Activity not found")
            );
    }

    /**
     * Updates an existing activity.
     * @param {ActivityModel} activity - Updated activity object.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing update operation details.
     */
    static update(id, activity) {
        return this.query(`
            UPDATE activities
            SET name = ?, description = ?
            WHERE id = ?
        `, [
            activity.name,
            activity.description,
            id
        ]);
    }

    /**
     * Creates a new activity.
     * @param {ActivityModel} activity - Activity object to insert.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing insert operation details and new activity ID.
     */
    static create(activity) {
        return this.query(`
            INSERT INTO activities (name, description, deleted)
            VALUES (?, ?, 0)
        `, [
            activity.name,
            activity.description           
        ]);
    }

    /**
     * Deletes an activity by ID (Soft delete).
     * @param {number} id - Activity ID.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing soft delete operation details.
     */
    static delete(id) {
        return this.query(
            `UPDATE activities SET deleted = 1 WHERE id = ?`,
            [id]
        );
    }
}
