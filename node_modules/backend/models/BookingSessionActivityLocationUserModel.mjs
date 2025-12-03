import { DatabaseModel } from "./DatabaseModel.mjs";
import { BookingModel } from "./BookingModel.mjs";
import { SessionModel } from "./SessionModel.mjs";
import { ActivityModel } from "./ActivityModel.mjs";
import { LocationModel } from "./LocationModel.mjs";
import { UserModel } from "./UserModel.mjs";

/**
 * Represents a join model that combines Booking, Session, Activity, Location, User (member), and Trainer data.
 * This model does not modify the database but is used to fetch related booking information.
 */
export class BookingSessionActivityLocationUserModel extends DatabaseModel {
    
    /**
     * Creates an instance of the BookingSessionActivityLocationUserModel.
     * @param {BookingModel} booking - The booking associated with the session.
     * @param {SessionModel} session - The session associated with the booking.
     * @param {ActivityModel} activity - The activity of the session.
     * @param {LocationModel} location - The location of the session.
     * @param {UserModel} user - The user (member) who made the booking.
     * @param {UserModel} trainer - The trainer who leads the session.
     */
    constructor(booking, session, activity, location, user, trainer) {
        super();
        this.booking = booking;
        this.session = session;
        this.activity = activity;
        this.location = location;
        this.user = user;
        this.trainer = trainer;
    }

    /**
     * Converts a database row into a BookingSessionActivityLocationUserModel instance.
     * @param {Object} row - The database row containing the booking, session, activity, location, user, and trainer data.
     * @returns {BookingSessionActivityLocationUserModel} An instance of BookingSessionActivityLocationUserModel with the provided database row data containing booking, session, activity, location, user, and trainer information.
     */
    static tableToModel(row) {
        // Create trainer object from aliased columns
        const trainerData = {
            id: row.trainers.trainer_id,
            first_name: row.trainers.trainer_first_name,
            last_name: row.trainers.trainer_last_name,
            email: row.trainers.trainer_email,
            role: row.trainers.trainer_role,
            deleted: row.trainers.trainer_deleted
        };
        
        return new BookingSessionActivityLocationUserModel(
            BookingModel.tableToModel(row.bookings || row),
            SessionModel.tableToModel(row.sessions || row),
            ActivityModel.tableToModel(row.activities || row),
            LocationModel.tableToModel(row.locations || row),
            UserModel.tableToModel(row.users || row),
            UserModel.tableToModel(trainerData)
        );
    }

    /**
     * Fetch all bookings along with session, activity, location, user, and trainer details.
     * @returns {Promise<Array<BookingSessionActivityLocationUserModel>>} Promise that resolves to an array of all active bookings with complete session, activity, location, user, and trainer details.
     */
    static getAll() {
        return this.query(`
            SELECT 
                bookings.*,
                sessions.*,
                activities.*,
                locations.*,
                users.*,
                trainers.id as trainer_id,
                trainers.first_name as trainer_first_name,
                trainers.last_name as trainer_last_name,
                trainers.email as trainer_email,
                trainers.role as trainer_role,
                trainers.deleted as trainer_deleted
            FROM bookings
            INNER JOIN sessions ON bookings.session_id = sessions.id
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON bookings.member_id = users.id
            INNER JOIN users as trainers ON sessions.trainer_id = trainers.id
            WHERE bookings.deleted = 0 
            AND sessions.deleted = 0
            AND activities.deleted = 0 
            AND locations.deleted = 0 
            AND users.deleted = 0
            AND trainers.deleted = 0
            ORDER BY sessions.session_date ASC, sessions.session_time ASC
        `)
        .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Fetch all bookings for a specific user.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<Array<BookingSessionActivityLocationUserModel>>} Promise that resolves to an array of bookings with complete details for the specified member.
     */
    static getByMemberId(userId) {
        return this.query(`
            SELECT 
                bookings.*,
                sessions.*,
                activities.*,
                locations.*,
                users.*,
                trainers.id as trainer_id,
                trainers.first_name as trainer_first_name,
                trainers.last_name as trainer_last_name,
                trainers.email as trainer_email,
                trainers.role as trainer_role,
                trainers.deleted as trainer_deleted
            FROM bookings
            INNER JOIN sessions ON bookings.session_id = sessions.id
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON bookings.member_id = users.id
            INNER JOIN users as trainers ON sessions.trainer_id = trainers.id
            WHERE bookings.member_id = ? AND bookings.deleted = 0
        `, [userId]).then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Fetch all bookings for a specific session.
     * @param {number} sessionId - The ID of the session.
     * @returns {Promise<Array<BookingSessionActivityLocationUserModel>>} Promise that resolves to an array of bookings with complete details for the specified session.
     */
    static getBySessionId(sessionId) {
        return this.query(`
            SELECT 
                bookings.*,
                sessions.*,
                activities.*,
                locations.*,
                users.*,
                trainers.id as trainer_id,
                trainers.first_name as trainer_first_name,
                trainers.last_name as trainer_last_name,
                trainers.email as trainer_email,
                trainers.role as trainer_role,
                trainers.deleted as trainer_deleted
            FROM bookings
            INNER JOIN sessions ON bookings.session_id = sessions.id
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON bookings.member_id = users.id
            INNER JOIN users as trainers ON sessions.trainer_id = trainers.id
            WHERE bookings.session_id = ? AND bookings.deleted = 0
        `, [sessionId]).then(result => result.map(row => this.tableToModel(row)));
    }
    
    /**
     * Fetch a specific booking by its ID along with session, activity, location, user, and trainer details.
     * @param {number} bookingId - The ID of the booking.
     * @returns {Promise<BookingSessionActivityLocationUserModel | null>} Promise that resolves to the booking with complete session, activity, location, user, and trainer details for the specified booking ID, or null if not found.
     */
    static getByBookingId(bookingId) {
        return this.query(`
            SELECT 
                bookings.*,
                sessions.*,
                activities.*,
                locations.*,
                users.*,
                trainers.id as trainer_id,
                trainers.first_name as trainer_first_name,
                trainers.last_name as trainer_last_name,
                trainers.email as trainer_email,
                trainers.role as trainer_role,
                trainers.deleted as trainer_deleted
            FROM bookings
            INNER JOIN sessions ON bookings.session_id = sessions.id
            INNER JOIN activities ON sessions.activity_id = activities.id
            INNER JOIN locations ON sessions.location_id = locations.id
            INNER JOIN users ON bookings.member_id = users.id
            INNER JOIN users as trainers ON sessions.trainer_id = trainers.id
            WHERE bookings.id = ? AND bookings.deleted = 0
        `, [bookingId]).then(result => 
            result.length > 0 
                ? this.tableToModel(result[0])
                : null
        );
    }
}
