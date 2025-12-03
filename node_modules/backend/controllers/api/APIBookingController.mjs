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

            // Sort bookings chronologically by session date and time
            // Handles missing/invalid dates by placing them at the end
            bookings.sort((a, b) => {
                const dateA = new Date(`${a.session?.sessionDate || ''}T${a.session?.sessionTime || ''}`);
                const dateB = new Date(`${b.session?.sessionDate || ''}T${b.session?.sessionTime || ''}`);
                
                // If either date is invalid, handle edge cases
                if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                if (isNaN(dateA.getTime())) return 1; // Invalid dates go to end
                if (isNaN(dateB.getTime())) return -1;
                
                return dateA - dateB; // Ascending order (oldest first)
            });

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
        // Format exported_at timestamp in YYYY-MM-DD HH:mm:ss format (matching sessions format)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const exportedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        // DTD definition matching the updated structure from diagram
        const dtd = `<!DOCTYPE booking_history [
    <!ELEMENT booking_history (header, week*)>
    <!ELEMENT header (title, exported_at, total_bookings, period, member)>
    <!ELEMENT title (#PCDATA)>
    <!ELEMENT exported_at (#PCDATA)>
    <!ELEMENT total_bookings (#PCDATA)>
    <!ELEMENT period (start, end)>
    <!ELEMENT start (#PCDATA)>
    <!ELEMENT end (#PCDATA)>
    <!ELEMENT member (name, email, id)>
    <!ELEMENT name (#PCDATA)>
    <!ELEMENT email (#PCDATA)>
    <!ELEMENT id (#PCDATA)>
    <!ELEMENT week (booking*)>
    <!ATTLIST week start CDATA #IMPLIED>
    <!ATTLIST week end CDATA #IMPLIED>
    <!ATTLIST week period_label CDATA #IMPLIED>
    <!ELEMENT booking (booking_date, booking_time, datetime, activity, location, trainer, booking_id, session_id)>
    <!ELEMENT booking_date (#PCDATA)>
    <!ELEMENT booking_time (#PCDATA)>
    <!ELEMENT datetime (#PCDATA)>
    <!ELEMENT activity (name, description, id)>
    <!ELEMENT description (#PCDATA)>
    <!ELEMENT location (name, address, id)>
    <!ELEMENT address (#PCDATA)>
    <!ELEMENT trainer (name, email, id)>
    <!ELEMENT booking_id (#PCDATA)>
    <!ELEMENT session_id (#PCDATA)>
]>`;

        // Format datetime in ISO 8601 format without milliseconds/timezone
        const formatLocalDateTime = (date) => {
            if (!date || isNaN(date.getTime())) {
                return '';
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        };

        // Helper function to get week range for a date (Monday to Sunday)
        const getWeekRange = (dateString) => {
            if (!dateString) return null;
            const date = new Date(`${dateString}T00:00:00`);
            if (isNaN(date.getTime())) return null;
            const day = date.getDay(); // 0 (Sun) - 6 (Sat)
            const diffToMonday = day === 0 ? -6 : 1 - day; // Monday as first day
            const monday = new Date(date);
            monday.setDate(date.getDate() + diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            const formatISODate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const dayNum = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${dayNum}`;
            };
            const formatDisplayDate = (d) => {
                const dayNum = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${dayNum}/${month}/${year}`;
            };

            return {
                key: `${formatISODate(monday)}_${formatISODate(sunday)}`,
                startISO: formatISODate(monday),
                endISO: formatISODate(sunday),
                label: `${formatDisplayDate(monday)} - ${formatDisplayDate(sunday)}`
            };
        };

        // Group bookings by week
        const weekGroups = new Map();
        bookings.forEach(bookingItem => {
            const session = bookingItem.session;
            if (!session || !session.sessionDate) return;
            
            const range = getWeekRange(session.sessionDate);
            if (!range) return;
            
            if (!weekGroups.has(range.key)) {
                weekGroups.set(range.key, { range, bookings: [] });
            }
            weekGroups.get(range.key).bookings.push(bookingItem);
        });

        // Sort week entries chronologically
        const weekEntries = Array.from(weekGroups.values()).sort((a, b) => {
            if (a.range.startISO === b.range.startISO) {
                return a.range.endISO.localeCompare(b.range.endISO);
            }
            return a.range.startISO.localeCompare(b.range.startISO);
        });

        // Calculate period start/end from first week's start and last week's end
        let periodStart = 'No bookings available';
        let periodEnd = 'No bookings available';
        if (weekEntries.length > 0) {
            periodStart = weekEntries[0].range.startISO;
            periodEnd = weekEntries[weekEntries.length - 1].range.endISO;
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
${dtd}
<booking_history>
    <header>
        <title>Booking History - ${user.firstName} ${user.lastName}</title>
        <exported_at>${exportedAt}</exported_at>
        <total_bookings>${bookings.length}</total_bookings>
        <period>
            <start>${periodStart}</start>
            <end>${periodEnd}</end>
        </period>
        <member>
            <name>${user.firstName} ${user.lastName}</name>
            <email>${user.email}</email>
            <id>${user.id}</id>
        </member>
    </header>`;

        // Render a single booking
        const renderBooking = (bookingItem) => {
            const booking = bookingItem.booking;
            const session = bookingItem.session;
            const activity = bookingItem.activity;
            const location = bookingItem.location;
            const trainer = bookingItem.trainer;
            
            // Skip if required data is missing
            if (!booking || !session || !activity || !location || !trainer) {
                console.warn("Skipping booking due to missing data:", bookingItem);
                return "";
            }
            
            const bookingId = `booking_${booking.id}`;
            const sessionId = `session_${session.id}`;
            const sessionDateTime = new Date(`${session.sessionDate}T${session.sessionTime}`);
            
            return `
        <booking>
            <booking_date>${session.sessionDate || 'N/A'}</booking_date>
            <booking_time>${session.sessionTime || 'N/A'}</booking_time>
            <datetime>${formatLocalDateTime(sessionDateTime)}</datetime>
            <activity>
                <name>${APIBookingController.escapeXML(activity.name || 'Unknown Activity')}</name>
                <description>${APIBookingController.escapeXML(activity.description || '')}</description>
                <id>${activity.id}</id>
            </activity>
            <location>
                <name>${APIBookingController.escapeXML(location.name || 'Unknown Location')}</name>
                <address>${APIBookingController.escapeXML(location.address || '')}</address>
                <id>${location.id}</id>
            </location>
            <trainer>
                <name>${APIBookingController.escapeXML(trainer.firstName || '')} ${APIBookingController.escapeXML(trainer.lastName || '')}</name>
                <email>${APIBookingController.escapeXML(trainer.email || '')}</email>
                <id>${trainer.id}</id>
            </trainer>
            <booking_id>${bookingId}</booking_id>
            <session_id>${sessionId}</session_id>
        </booking>`;
        };

        // Add week elements with bookings
        if (weekEntries.length > 0) {
            weekEntries.forEach(({ range, bookings: bookingsInWeek }) => {
                // Sort bookings within week by date and time
                bookingsInWeek.sort((a, b) => {
                    const dateA = new Date(`${a.session?.sessionDate || ''}T${a.session?.sessionTime || ''}`);
                    const dateB = new Date(`${b.session?.sessionDate || ''}T${b.session?.sessionTime || ''}`);
                    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    return dateA - dateB;
                });

                xml += `
    <week start="${range.startISO}" end="${range.endISO}" period_label="${range.label}">
${bookingsInWeek.map(renderBooking).join("")}
    </week>`;
            });
        }

        xml += `
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