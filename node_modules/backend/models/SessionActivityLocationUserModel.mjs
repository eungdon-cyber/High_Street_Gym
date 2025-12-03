import { DatabaseModel } from "./DatabaseModel.mjs";
import { SessionModel } from "./SessionModel.mjs";  // Replaced ClassModel with SessionModel
import { ActivityModel } from "./ActivityModel.mjs";
import { LocationModel } from "./LocationModel.mjs";
import { UserModel } from "./UserModel.mjs";  // Removed the trainer import as it's no longer used

/**
 * Represents a model that joins session, activity, location, and user (trainer) data.
 * It is used to fetch session details along with related activity, location, and trainer data.
 */
export class SessionActivityLocationUserModel extends DatabaseModel {

    /**
     * Creates an instance of the SessionActivityLocationUserModel.
     * @param {SessionModel} session - The session associated with the model.
     * @param {ActivityModel} activity - The activity associated with the session.
     * @param {LocationModel} location - The location associated with the session.
     * @param {UserModel} user - The user (trainer) associated with the session.
     */
    constructor(session, activity, location, user) {
        super();
        this.session = session;
        this.activity = activity;
        this.location = location;
        this.user = user;
    }

    /**
     * Converts a database row into an instance of SessionActivityLocationUserModel.
     * @param {Object} row - The database row containing session, activity, location, and user data.
     * @returns {SessionActivityLocationUserModel} An instance of SessionActivityLocationUserModel with the provided database row data containing session, activity, location, and trainer information.
     */
    static tableToModel(row) {
        return new SessionActivityLocationUserModel(
            SessionModel.tableToModel(row.sessions || row),  // Mapping session data
            ActivityModel.tableToModel(row.activities || row),
            LocationModel.tableToModel(row.locations || row),
            UserModel.tableToModel(row.users || row)  // Mapping user data
        );
    }

    /**
     * Fetch all session sessions along with activity, location, and trainer details.
     * @returns {Promise<Array<SessionActivityLocationUserModel>>} Promise that resolves to an array of all active sessions with complete activity, location, and trainer details, sorted by date and time.
     */
    static getAll() {
        return this.query(`
            SELECT * FROM sessions
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON sessions.trainer_id = users.id
            WHERE sessions.deleted = 0
            AND activities.deleted = 0 
            AND locations.deleted = 0 
            AND users.deleted = 0  
            ORDER BY sessions.session_date ASC, sessions.session_time ASC
        `)
        .then(result => result.map(row => this.tableToModel(row)))
        .catch(error => {
            console.error("Query failed:", error);
            throw error;
        });
    }

    /**
     * Fetch a specific session by session ID with activity, location, and trainer details.
     * @param {number} sessionId
     * @returns {Promise<SessionActivityLocationUserModel>} Promise that resolves to the session with complete activity, location, and trainer details for the specified session ID, or rejects if not found.
     */
    static getBySessionId(sessionId) {
        return this.query(`
            SELECT 
                sessions.*, 
                activities.*, 
                locations.*, 
                users.* 
            FROM sessions
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON sessions.trainer_id = users.id
            WHERE sessions.id = ? AND sessions.deleted = 0
        `, [sessionId])
        .then(result => 
            result.length > 0
                ? this.tableToModel(result[0])
                : Promise.reject("Session not found")
        );
    }

    /**
     * Fetch all sessions assigned to a specific trainer.
     * @param {number} trainerId
     * @returns {Promise<Array<SessionActivityLocationUserModel>>} Promise that resolves to an array of sessions with complete details for the specified trainer, sorted by date and time.
     */
    static getByTrainerId(trainerId) {
        return this.query(`
            SELECT 
                sessions.*, 
                activities.*, 
                locations.*, 
                users.* 
            FROM sessions
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON sessions.trainer_id = users.id
            WHERE sessions.trainer_id = ? AND sessions.deleted = 0
            ORDER BY sessions.session_date ASC, sessions.session_time ASC
        `, [trainerId])
        .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Fetch all sessions assigned to a specific trainer within a date range.
     * @param {number} trainerId
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Array<SessionActivityLocationUserModel>>} Promise that resolves to an array of sessions with complete details for the specified trainer within the given date range, sorted by date and time.
     */
    static getByTrainerIdAndDateRange(trainerId, startDate, endDate) {
        return this.query(`
            SELECT 
                sessions.*, 
                activities.*, 
                locations.*, 
                users.* 
            FROM sessions
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON sessions.trainer_id = users.id
            WHERE sessions.trainer_id = ? 
            AND sessions.session_date >= ? 
            AND sessions.session_date <= ?
            AND sessions.deleted = 0
            ORDER BY sessions.session_date ASC, sessions.session_time ASC
        `, [trainerId, startDate, endDate])
        .then(result => result.map(row => this.tableToModel(row)));
    }
}
