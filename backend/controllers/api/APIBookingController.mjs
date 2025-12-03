import express from "express";
import { BookingModel } from "../../models/BookingModel.mjs";
import { SessionModel } from "../../models/SessionModel.mjs";
import { BookingSessionActivityLocationUserModel } from "../../models/BookingSessionActivityLocationUserModel.mjs";
import { BookingController } from "../BookingController.mjs";
import { APIAuthenticationController } from "./APIAuthenticationController.mjs";

export class APIBookingController {
    static routes = express.Router();

    static {
        this.routes.get(
            "/self",
            APIAuthenticationController.restrict(["member", "admin"]),
            this.viewMyBookings
        );
        this.routes.get(
            "/:id(\\d+)",
            APIAuthenticationController.restrict(["member", "admin"]),
            this.viewBookingById
        );
        this.routes.post(
            "/",
            APIAuthenticationController.restrict(["member", "admin"]),
            this.createBooking
        );
        this.routes.delete(
            "/:id(\\d+)",
            APIAuthenticationController.restrict(["member", "admin"]),
            this.cancelBooking
        );
        this.routes.get(
            "/export/xml/history",
            APIAuthenticationController.restrict(["member", "admin"]),
            this.exportBookingHistoryXML
        );
    }

    /**
     * @openapi
     * /bookings/self:
     *   get:
     *     summary: "Get authenticated member's bookings"
     *     tags: [Bookings]
     *     description: "Retrieve a list of all active bookings for the authenticated member"
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: query
     *         name: includePast
     *         schema:
     *           type: string
     *           enum: ["true", "false"]
     *         description: "If 'true', includes past bookings in the results. Default is 'false' (only future bookings)."
     *         required: false
     *     responses:
     *       200:
     *         $ref: '#/components/responses/BookingsList'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewMyBookings(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const memberId = req.authenticatedUser.id;
            const includePast = req.query.includePast === 'true';
            const bookingDetails = await BookingSessionActivityLocationUserModel.getByMemberId(memberId);
            
            // Filter out past bookings unless includePast is true
            const filteredBookings = includePast ? bookingDetails : BookingController.filterBookings(bookingDetails);
            
            // Transform the data to include all relevant information
            const bookings = filteredBookings.map(item => {
                const trainerName = item.trainer && item.trainer.firstName && item.trainer.lastName
                    ? `${item.trainer.firstName} ${item.trainer.lastName}`
                    : null;
                
                return {
                    id: item.booking.id,
                    memberId: item.booking.memberId,
                    sessionId: item.booking.sessionId,
                    activityId: item.session.activityId,
                    activityName: item.activity ? item.activity.name : null,
                    trainerId: item.session.trainerId,
                    trainerName: trainerName,
                    locationId: item.session.locationId,
                    locationName: item.location ? item.location.name : null,
                    sessionDate: item.session.sessionDate,
                    sessionTime: item.session.sessionTime,
                    deleted: item.booking.deleted
                };
            });
            
            res.status(200).json(bookings);
        } catch (error) {
            console.error("Error fetching member bookings:", error);
            res.status(500).json({ message: "Failed to retrieve bookings" });
        }
    }

    /**
     * @openapi
     * /bookings/{id}:
     *   get:
     *     summary: "Get a specific booking"
     *     tags: [Bookings]
     *     description: "Retrieve a specific booking with full session, activity, location, and trainer details. Members can only view their own bookings."
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The booking ID
     *     responses:
     *       200:
     *         $ref: '#/components/responses/BookingCreated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewBookingById(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const bookingId = parseInt(req.params.id, 10);
            if (Number.isNaN(bookingId)) {
                return res.status(400).json({ message: "Invalid booking ID" });
            }

            const bookingItem = await BookingSessionActivityLocationUserModel.getByBookingId(bookingId);
            if (!bookingItem) {
                return res.status(404).json({ message: "Booking not found" });
            }

            const isAdmin = req.authenticatedUser.role === "admin";
            if (!isAdmin && bookingItem.booking.memberId !== req.authenticatedUser.id) {
                return res.status(403).json({ message: "Access forbidden - you can only view your own bookings" });
            }

            const trainerName = bookingItem.trainer && bookingItem.trainer.firstName && bookingItem.trainer.lastName
                ? `${bookingItem.trainer.firstName} ${bookingItem.trainer.lastName}`
                : null;
            const memberName = bookingItem.user && bookingItem.user.firstName && bookingItem.user.lastName
                ? `${bookingItem.user.firstName} ${bookingItem.user.lastName}`
                : null;

            const booking = {
                id: bookingItem.booking.id,
                memberId: bookingItem.booking.memberId,
                memberName,
                sessionId: bookingItem.session.id,
                activityId: bookingItem.session.activityId,
                activityName: bookingItem.activity ? bookingItem.activity.name : null,
                activityDescription: bookingItem.activity ? bookingItem.activity.description : null,
                trainerId: bookingItem.session.trainerId,
                trainerName,
                locationId: bookingItem.session.locationId,
                locationName: bookingItem.location ? bookingItem.location.name : null,
                locationAddress: bookingItem.location ? bookingItem.location.address : null,
                sessionDate: bookingItem.session.sessionDate,
                sessionTime: bookingItem.session.sessionTime,
                deleted: bookingItem.booking.deleted
            };

            res.status(200).json(booking);
        } catch (error) {
            console.error("Error fetching booking:", error);
            res.status(500).json({ message: "Failed to load booking" });
        }
    }

    /**
     * @openapi
     * /bookings:
     *   post:
     *     summary: "Create a new booking"
     *     tags: [Bookings]
     *     description: "Create a booking for the authenticated member by selecting a session. Members can only create bookings for themselves."
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/BookingInput'
     *     responses:
     *       201:
     *         $ref: '#/components/responses/BookingCreated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       409:
     *         $ref: '#/components/responses/Conflict'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async createBooking(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            // Extract sessionId from request body
            const { sessionId } = req.body;
            
            if (!sessionId) {
                return res.status(400).json({ message: "sessionId is required" });
            }

            // Verify that the session exists
            let session;
            try {
                session = await SessionModel.getById(sessionId);
            } catch (error) {
                if (error === "Session not found" || error.message === "Session not found") {
                    return res.status(404).json({ message: "Session not found" });
                }
                throw error;
            }

            // Members can only create bookings for themselves
            // Extract memberId from authenticated user
            const memberId = req.authenticatedUser.id;

            // Create booking using BookingModel
            const booking = new BookingModel(null, memberId, sessionId, 0);
            const result = await BookingModel.create(booking);

            // Get the created booking using the insertId from the result
            const createdBooking = await BookingModel.getById(result.insertId);
            res.status(201).json(createdBooking);
        } catch (error) {
            // Handle duplicate booking error
            if (error.includes && error.includes("already booked")) {
                return res.status(409).json({ message: "You are already booked for this session" });
            }
            console.error("Error creating booking:", error);
            res.status(500).json({ message: "Failed to create booking" });
        }
    }

    /**
     * @openapi
     * /bookings/{id}:
     *   delete:
     *     summary: "Cancel a booking"
     *     tags: [Bookings]
     *     description: "Cancel a booking by ID. Only the member who owns the booking can cancel it."
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The booking ID
     *     responses:
     *       200:
     *         $ref: '#/components/responses/SuccessMessage'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async cancelBooking(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const bookingId = req.params.id;
            
            // Get the booking to verify ownership
            let booking;
            try {
                booking = await BookingModel.getById(bookingId);
            } catch (error) {
                if (error.message === "Booking not found" || error === "not found") {
                    return res.status(404).json({ message: "Booking not found" });
                }
                throw error;
            }

            // Check if the authenticated user is the member who owns this booking
            // Admins can cancel any booking, members can only cancel their own
            if (req.authenticatedUser.role !== "admin" && booking.memberId !== req.authenticatedUser.id) {
                return res.status(403).json({ 
                    message: "Access forbidden - you can only cancel your own bookings" 
                });
            }

            // Cancel the booking (soft delete)
            await BookingModel.delete(bookingId);
            res.status(200).json({ message: "Booking canceled successfully" });
        } catch (error) {
            console.error(`Error canceling booking with ID ${req.params.id}:`, error);
            res.status(500).json({ message: "Failed to cancel booking" });
        }
    }

    /**
     * @openapi
     * /bookings/export/xml/history:
     *   get:
     *     summary: "Export member's booking history as XML"
     *     tags: [Bookings]
     *     description: "Export the authenticated member's booking history as XML for fitness tracking applications. Includes activity data, session details, location, and trainer information."
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: query
     *         name: onlyPast
     *         schema:
     *           type: string
     *           enum: ["true", "false"]
     *         description: "If 'true', exports only previous (past) bookings. Default is 'false' (all bookings)."
     *         required: false
     *     responses:
     *       200:
     *         description: XML file containing member's booking history
     *         content:
     *           application/xml:
     *             schema:
     *               type: string
     *               example: |
     *                 <?xml version="1.0" encoding="UTF-8"?>
     *                 <booking_history>
     *                   <header>
     *                     <title>Booking History - John Doe</title>
     *                     <member>
     *                       <name>John Doe</name>
     *                       <email>member@hsg.com</email>
     *                     </member>
     *                   </header>
     *                   <bookings>...</bookings>
     *                 </booking_history>
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async exportBookingHistoryXML(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            // Only members can export their own bookings (admins can export any member's)
            const memberId = req.authenticatedUser.id;

            // Get all bookings for the member using BookingSessionActivityLocationUserModel
            // This includes full session, activity, location, and trainer details
            let bookings = await BookingSessionActivityLocationUserModel.getByMemberId(memberId);

            // Filter for previous bookings only (past sessions) if requested
            const onlyPast = req.query.onlyPast === 'true';
            if (onlyPast) {
                // Filter to get only past bookings (sessions that have already occurred)
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                bookings = bookings.filter(bookingItem => {
                    const sessionDate = new Date(bookingItem.session.sessionDate);
                    sessionDate.setHours(0, 0, 0, 0);
                    return sessionDate < currentDate; // Keep only past bookings
                });
            }

            // Generate XML content
            const xmlContent = APIBookingController.generateBookingsXML(bookings, req.authenticatedUser);

            // Create filename with member name
            const memberName = `${req.authenticatedUser.firstName}-${req.authenticatedUser.lastName}`.replace(/\s+/g, '-');
            const filename = `booking-history-${memberName}.xml`;

            // Set response headers for XML download
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(xmlContent);
        } catch (error) {
            console.error("Error exporting booking history XML:", error);
            console.error("Error stack:", error.stack);
            res.status(500).json({ 
                message: "Failed to export booking history",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Generate XML content for member's booking history
     * @param {Array} bookings - Array of BookingSessionActivityLocationUserModel instances
     * @param {Object} user - User object (member)
     * @returns {string} XML content
     */
    static generateBookingsXML(bookings, user) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <booking_history>
        <header>
            <title>Booking History - ${user.firstName} ${user.lastName}</title>
            <member>
                <name>${user.firstName} ${user.lastName}</name>
                <email>${user.email}</email>
                <role>${user.role}</role>
            </member>
            <exported_at>${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }).replace(',', '')}</exported_at>
            <total_bookings>${bookings.length}</total_bookings>
        </header>
        <bookings>`;

        bookings.forEach(bookingItem => {
            const booking = bookingItem.booking;
            const session = bookingItem.session;
            const activity = bookingItem.activity;
            const location = bookingItem.location;
            const trainer = bookingItem.trainer; // Use the trainer from the session, not the user (member)
            
            // Skip if required data is missing
            if (!booking || !session || !activity || !location || !trainer) {
                console.warn("Skipping booking due to missing data:", bookingItem);
                return;
            }
            
            // Create a unique booking ID
            const bookingId = `booking_${booking.id}`;
            
            // Format date and time
            const sessionDateTime = new Date(`${session.sessionDate}T${session.sessionTime}`);
            
            xml += `
            <booking>
                <id>${bookingId}</id>
                <booking_date>${booking.createdAt || 'N/A'}</booking_date>
                <session>
                    <id>session_${session.id}</id>
                    <date>${session.sessionDate}</date>
                    <time>${session.sessionTime}</time>
                    <datetime>${sessionDateTime.toISOString()}</datetime>
                </session>
                <activity>
                    <name>${APIBookingController.escapeXML(activity.name || 'Unknown Activity')}</name>
                    <description>${APIBookingController.escapeXML(activity.description || '')}</description>
                </activity>
                <location>
                    <name>${APIBookingController.escapeXML(location.name || 'Unknown Location')}</name>
                    <address>${APIBookingController.escapeXML(location.address || '')}</address>
                </location>
                <trainer>
                    <name>${APIBookingController.escapeXML(trainer.firstName || '')} ${APIBookingController.escapeXML(trainer.lastName || '')}</name>
                    <email>${APIBookingController.escapeXML(trainer.email || '')}</email>
                </trainer>
            </booking>`;
        });

        xml += `
        </bookings>
    </booking_history>`;

        return xml;
    }

    /**
     * Escape special characters for XML
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeXML(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}   