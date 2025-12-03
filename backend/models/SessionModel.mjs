import { DatabaseModel } from "./DatabaseModel.mjs";
import mysql from "mysql2/promise";

export class SessionModel extends DatabaseModel {

    /**
     * Creates an instance of the SessionModel class.
     * @param {number} id - The unique identifier of the session.
     * @param {number} activityId - The ID of the activity associated with the session.
     * @param {number} trainerId - The ID of the trainer leading the session.
     * @param {number} locationId - The ID of the location where the session is held.
     * @param {string} sessionDate - The date of the session (YYYY-MM-DD).
     * @param {string} sessionTime - The time of the session (HH:MM:SS).
     * @param {number} deleted - A flag indicating whether the session is deleted (0 for active, 1 for deleted).
     */
    constructor(id, activityId, trainerId, locationId, sessionDate, sessionTime, deleted) {
        super();
        this.id = id;
        this.activityId = activityId;
        this.trainerId = trainerId;
        this.locationId = locationId;
        this.sessionDate = sessionDate;
        this.sessionTime = sessionTime;
        this.deleted = deleted;
    }

    /**
     * Converts a database row to a SessionModel instance.
     * @param {Object} row - The database row to convert.
     * @returns {SessionModel} A SessionModel instance created from the provided database row data.
     */
    static tableToModel(row) {
        const data = row.sessions || row;  // Use row.sessions if nested, else use row directly
        return new SessionModel(
            data["id"],
            data["activity_id"],
            data["trainer_id"],
            data["location_id"],
            data["session_date"],
            data["session_time"],
            data["deleted"]
        );
    }

    /**
     * Retrieves all active sessions from the database.
     * @returns {Promise<Array<SessionModel>>} Promise that resolves to an array of all active sessions, sorted by date and time.
     */
    static async getAll() {
        return this.query(`
            SELECT * FROM sessions 
            WHERE deleted = 0
            ORDER BY session_date ASC, session_time ASC
        `)
        .then(result => result.map(row => this.tableToModel(row)));
    }
   
    /**
     * @param {number} id 
     * @returns {Promise<SessionModel>} Promise that resolves to the session with the specified ID, or rejects if not found.
     */
    static getById(id) {
        return this.query("SELECT * FROM sessions WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0])
                    : Promise.reject("Session not found")
            );
    }

    /**
     * @param {SessionModel} sessionInstance 
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to the MySQL result packet containing insert information (insertId, affectedRows, etc.).
     */
    static async create(sessionInstance) {
        return this.query(`
            INSERT INTO sessions 
            (activity_id,
            trainer_id,
            location_id,
            session_date,
            session_time,
            deleted)
            VALUES (?, ?, ?, ?, ?, 0)
        `,
            [
                sessionInstance.activityId,
                sessionInstance.trainerId,
                sessionInstance.locationId,
                sessionInstance.sessionDate,
                sessionInstance.sessionTime
            ]
        );
    }

    /**
     * @param {SessionModel} sessionInstance 
     * @returns {Promise<mysql.ResultSetHeader>} Promise that resolves to the MySQL result packet containing update information (affectedRows, changedRows, etc.).
     */
    static async update(sessionInstance) {
        return this.query(`
            UPDATE sessions
            SET activity_id = ?, trainer_id = ?, location_id = ?, 
                session_date = ?, session_time = ?, deleted = ?
            WHERE id = ?
        `, 
        [
            sessionInstance.activityId,
            sessionInstance.trainerId,
            sessionInstance.locationId,
            sessionInstance.sessionDate,
            sessionInstance.sessionTime,
            sessionInstance.deleted,
            sessionInstance.id
        ]);
    }

    /**
     * @param {number} id 
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to the MySQL result packet containing delete information (affectedRows, etc.) after soft-deleting the session.
     */
    static delete(id) {
        return this.query(
            `UPDATE sessions SET deleted = 1 WHERE id = ?`,
            [id]
        );
    }

    /**
     * Checks if a session with the same activity, trainer, location, date, and time already exists.
     * @param {number} activityId - The activity ID
     * @param {number} trainerId - The trainer ID
     * @param {number} locationId - The location ID
     * @param {string} sessionDate - The session date
     * @param {string} sessionTime - The session time
     * @param {number} excludeId - Optional session ID to exclude from check (for updates)
     * @returns {Promise<SessionModel|null>} Promise that resolves to the existing session if a duplicate is found, or null if no duplicate exists.
     */
    static async checkSessionExists(activityId, trainerId, locationId, sessionDate, sessionTime, excludeId = null) {
        let query = `
            SELECT * FROM sessions 
            WHERE activity_id = ? 
            AND trainer_id = ? 
            AND location_id = ? 
            AND session_date = ? 
            AND session_time = ? 
            AND deleted = 0
        `;
        let params = [activityId, trainerId, locationId, sessionDate, sessionTime];

        if (excludeId) {
            query += ` AND id != ?`;
            params.push(excludeId);
        }

        const result = await this.query(query, params);
        return result.length > 0 ? this.tableToModel(result[0]) : null;
    }

    /**
     * Get all sessions for a specific activity.
     * @param {number} activityId - The activity ID
     * @returns {Promise<Array<SessionModel>>} Promise that resolves to an array of sessions for the specified activity, sorted by date and time.
     */
    static async getByActivityId(activityId) {
        return this.query(`
            SELECT * FROM sessions 
            WHERE activity_id = ? AND deleted = 0
            ORDER BY session_date ASC, session_time ASC
        `, [activityId])
        .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Get all sessions for a specific location.
     * @param {number} locationId - The location ID
     * @returns {Promise<Array<SessionModel>>} Promise that resolves to an array of sessions for the specified location, sorted by date and time.
     */
    static async getByLocationId(locationId) {
        return this.query(`
            SELECT * FROM sessions 
            WHERE location_id = ? AND deleted = 0
            ORDER BY session_date ASC, session_time ASC
        `, [locationId])
        .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Get all sessions for a specific trainer.
     * @param {number} trainerId - The trainer ID
     * @returns {Promise<Array<SessionModel>>} Promise that resolves to an array of sessions for the specified trainer, sorted by date and time.
     */
    static async getByTrainerId(trainerId) {
        return this.query(`
            SELECT * FROM sessions 
            WHERE trainer_id = ? AND deleted = 0
            ORDER BY session_date ASC, session_time ASC
        `, [trainerId])
        .then(result => result.map(row => this.tableToModel(row)));
    }
}
