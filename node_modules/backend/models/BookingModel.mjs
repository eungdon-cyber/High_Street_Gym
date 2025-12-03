import { DatabaseModel } from "../models/DatabaseModel.mjs";

export class BookingModel extends DatabaseModel {
    /**
     * Constructor to initialize a BookingModel instance
     * @param {number} id - The unique ID for the booking.
     * @param {number} memberId - The ID of the member making the booking.
     * @param {number} sessionId - The ID of the session being booked.
     * @param {number} deleted - Flag indicating if the booking is deleted (0 = active, 1 = deleted).
     */
    constructor(id, memberId, sessionId, deleted) {
        super();
        this.id = id;
        this.memberId = memberId;
        this.sessionId = sessionId;
        this.deleted = deleted;
    }

    /**
     * Converts a database row to a BookingModel instance.
     * Handles both nested structures (e.g., when using joins) and flat structures.
     * 
     * @param {Object} row - A database row representing a booking.
     * @returns {BookingModel} A new instance of BookingModel with the provided database row data.
     */
    static tableToModel(row) {
        const data = row.bookings || row; // Handles nested structures if nestTables: true
        return new BookingModel(
            data["id"],
            data["member_id"],
            data["session_id"],
            data["deleted"]
        );
    }

    /**
     * Creates a new booking entry in the database.
     * Ensures that the member is not already booked for the same session.
     * 
     * @param {BookingModel} booking - The BookingModel instance to be created.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing insert operation details and new booking ID.
     */
    static async create(booking) {
        const existingBooking = await this.checkBookingExists(booking.memberId, booking.sessionId);
        if (existingBooking) {
            return Promise.reject(`Member ID ${booking.memberId} is already booked for Session ID ${booking.sessionId}.`);
        }

        return this.query(`
            INSERT INTO bookings (member_id, session_id, deleted)
            VALUES (?, ?, 0)
        `, [booking.memberId, booking.sessionId]);
    }

    /**
     * Checks if a member already has a booking for a specific session.
     * 
     * @param {number} memberId - The ID of the member.
     * @param {number} sessionId - The ID of the session.
     * @returns {Promise<boolean>} Promise that resolves to true if the member already has a booking for the session, false otherwise.
     */
    static async checkBookingExists(memberId, sessionId) {
        return this.query(
            "SELECT id FROM bookings WHERE member_id = ? AND session_id = ? AND deleted = 0",
            [memberId, sessionId]
        ).then(result => result.length > 0);
    }

    /**
     * Retrieves a booking by its unique ID.
     * 
     * @param {number} id - The unique ID of the booking.
     * @returns {Promise<BookingModel>} Promise that resolves to the booking with the specified ID, or rejects if not found.
     */
    static getById(id) {
        return this.query("SELECT * FROM bookings WHERE id = ? AND deleted = 0", [id])
            .then(result => result.length > 0 
                ? this.tableToModel(result[0]) 
                : Promise.reject("Booking not found"));
    }

    /**
     * Retrieves all active bookings.
     * 
     * @returns {Promise<BookingModel[]>} Promise that resolves to an array of all active bookings.
     */
    static getAll() {
        return this.query("SELECT * FROM bookings WHERE deleted = 0")
            .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Retrieves all bookings for a specific member.
     * 
     * @param {number} memberId - The ID of the member whose bookings are to be retrieved.
     * @returns {Promise<BookingModel[]>} Promise that resolves to an array of bookings for the specified member.
     */
    static getByMemberId(memberId) {
        return this.query("SELECT * FROM bookings WHERE member_id = ? AND deleted = 0", [memberId])
            .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Retrieves all bookings for a specific session.
     * 
     * @param {number} sessionId - The ID of the session whose bookings are to be retrieved.
     * @returns {Promise<BookingModel[]>} Promise that resolves to an array of bookings for the specified session.
     */
    static getBySessionId(sessionId) {
        return this.query("SELECT * FROM bookings WHERE session_id = ? AND deleted = 0", [sessionId])
            .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Updates an existing booking with new data.
     * 
     * @param {number} id - The unique ID of the booking to be updated.
     * @param {BookingModel} booking - The updated BookingModel instance.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing update operation details.
     */
    static update(id, booking) {
        return this.query(`
            UPDATE bookings
            SET member_id = ?, session_id = ?
            WHERE id = ?
        `, [
            booking.memberId,
            booking.sessionId,
            id
        ]);
    }

    /**
     * Soft deletes a booking by setting its 'deleted' flag to 1.
     * 
     * @param {number} id - The unique ID of the booking to be deleted.
     * @returns {Promise<mysql.OkPacket>} Promise that resolves to MySQL result packet containing soft delete operation details.
     */
    static delete(id) {
        return this.query("UPDATE bookings SET deleted = 1 WHERE id = ?", [id]);
    }

    /**
     * Searches for bookings within a specific date range.
     * 
     * @param {string} startDate - The start date of the date range.
     * @param {string} endDate - The end date of the date range.
     * @returns {Promise<BookingModel[]>} Promise that resolves to an array of bookings within the specified date range.
     */
    static searchByDateRange(startDate, endDate) {
        return this.query(`
            SELECT * FROM bookings 
            WHERE deleted = 0
        `).then(result => result.map(row => this.tableToModel(row)));
    }
}
