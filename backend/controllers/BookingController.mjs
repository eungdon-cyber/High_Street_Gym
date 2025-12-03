import express from "express";
import { BookingModel } from "../models/BookingModel.mjs"; // Booking data
import { AuthenticationController } from "./AuthenticationController.mjs"; // For restricting access
import { BookingSessionActivityLocationUserModel } from "../models/BookingSessionActivityLocationUserModel.mjs"
import { SessionModel } from "../models/SessionModel.mjs"; // Session related data
import { SessionActivityLocationUserModel } from "../models/SessionActivityLocationUserModel.mjs"; // Session with related data
import { SessionController } from "./SessionController.mjs"; // For filtering sessions
import { UserModel } from "../models/UserModel.mjs"; // User model for trainers
import { ActivityModel } from "../models/ActivityModel.mjs";
import { LocationModel } from "../models/LocationModel.mjs";

export class BookingController {
    static routes = express.Router();

    static {
        // Define routes for booking management
        this.routes.get(
            "/",
            AuthenticationController.restrict(["member", "admin"]),
            this.viewAllBookings
        );
        this.routes.get(
            "/:id",
            AuthenticationController.restrict(["member", "admin"]),
            this.viewBookingById
        );
        // Unified CRUD operations (Member/Admin)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["member", "admin"]),
            this.handleBookingAction
        );

        // Unified CRUD operations for specific booking (Member/Admin)
        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["member", "admin"]),
            this.handleBookingAction
        );

        // XML Export for member's booking history
        this.routes.get(
            "/export/xml/history",
            AuthenticationController.restrict(["member"]),
            this.exportBookingHistoryXML
        );
    }

    /**
     * View all bookings (Admin only)
     * Retrieves and displays all bookings, with optional filtering based on memberId.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders member_bookings.ejs and sends HTML to the client.
     */
    static async viewAllBookings(req, res) {
        try {
            const memberId = req.query.memberId || null;
            const message = req.query.message || null; // Add this line
            const includePast = req.query.includePast === 'true';

            // Fetch all sessions and bookings
            let sessions = await SessionModel.getAll();
            let bookings = await BookingSessionActivityLocationUserModel.getAll();
            // console.log("Fetched Bookings: ", bookings) // Debugging

            // Fetch all users for member and trainer dropdowns
            let users = await UserModel.getAll();
            const members = users.filter(user => user.role === 'member'); // For member filter
            const trainers = users.filter(user => user.role === 'trainer'); // For trainer dropdown

            // Filter out past bookings unless includePast is true
            if (!includePast) {
                bookings = BookingController.filterBookings(bookings);
            }

            // Fetch sessions with related data for the form (same structure as sessions page)
            let sessionsWithData = await SessionActivityLocationUserModel.getAll();
            
            // Filter out past sessions using SessionController's filtering method
            sessionsWithData = SessionController.filterSessions(sessionsWithData);

            // Also filter sessions to show only future dates for date selection form
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            sessions = sessions.filter(session => {
                const sessionDate = new Date(session.sessionDate);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate >= currentDate;
            });

            if (memberId) {
                bookings = bookings.filter(booking => booking.user.id == memberId);
            }

            // Apply activity filter if provided
            const activityId = req.query.activityId || null;
            if (activityId) {
                bookings = bookings.filter(booking => booking.activity.id == activityId);
            }

            // Apply location filter if provided
            const locationId = req.query.locationId || null;
            if (locationId) {
                bookings = bookings.filter(booking => booking.location.id == locationId);
            }

            // Apply date range filters if provided
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            
            if (startDate) {
                bookings = bookings.filter(booking => {
                    const sessionDateStr = booking.session.sessionDate; // This should be in YYYY-MM-DD format
                    return sessionDateStr >= startDate; // String comparison for dates
                });
            }
            
            if (endDate) {
                bookings = bookings.filter(booking => {
                    const sessionDateStr = booking.session.sessionDate; // This should be in YYYY-MM-DD format
                    return sessionDateStr <= endDate; // String comparison for dates
                });
            }

            // Only members can see their own bookings
            if (req.authenticatedUser && req.authenticatedUser.role === 'member') {
                bookings = bookings.filter(booking => booking.user.id == req.authenticatedUser.id); // Filter by logged-in user's ID
            }

            // Group bookings by year, month, and day
            const groupedBookings = BookingController.groupBookingsByDay(bookings);

            // Fetch activities and locations for the form
            const activities = await ActivityModel.getAll();
            const locations = await LocationModel.getAll();

            // Render the grouped bookings to the view
            res.render("member_bookings.ejs", {
                groupedBookings: groupedBookings,
                users: users,
                allUsers: users,  // Add this for the partial
                members: members,
                trainers: trainers,
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                selectedBooking: null,
                selectedSession: { session: { id: null } },  // Dummy session to make partial render
                memberId: memberId,
                activityId: activityId,
                locationId: locationId,
                includePast: includePast,
                bookings,
                sessions: sessionsWithData,
                activities: activities,
                locations: locations,
                currentPage: 'bookings',
                message: message,  // Add this line
                startDate: startDate,
                endDate: endDate
            });
        } catch (error) {
            console.error("Error fetching bookings:", error);
            res.status(500).render("status", {
                status: "Error",
                message: "Unable to load bookings. Please try again or contact support.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Static method to filter bookings, filtering out past bookings
     * 
     * @param {Array} bookings - Array of booking objects to filter (from BookingSessionActivityLocationUserModel)
     * @returns {Array} - Filtered bookings (only future/current bookings)
     */
    static filterBookings(bookings) {
        // Filter out past bookings
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
        return bookings.filter(booking => {
            const sessionDate = new Date(booking.session.sessionDate);
            sessionDate.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
            return sessionDate >= currentDate; // Keep only future or current bookings
        });
    }

    /**
     * Group bookings by year, month, and day
     * @param {Array} bookings - Array of booking objects to group
     * @returns {Object} grouped - Grouped bookings by date
     */
    static groupBookingsByDay(bookings) {
        const grouped = {};

        bookings.forEach((bookingItem) => {
            const bookingDate = new Date(bookingItem.session.sessionDate);

            const year = bookingDate.getFullYear();
            const month = bookingDate.getMonth() + 1;
            const dayOfWeek = bookingDate.toLocaleString("en-AU", { weekday: "long", timeZone: "Australia/Brisbane" });
            const dayOfMonth = bookingDate.getDate();

            const yearMonthKey = `${year}-${month < 10 
                ? `0${month}` 
                : month}`;
            const formattedDate = `${year}-${month < 10 
                ? `0${month}` 
                : month}-${dayOfMonth < 10 ? `0${dayOfMonth}` : dayOfMonth}`;
            const dayKey = `${formattedDate} - ${dayOfWeek}`;

            if (!grouped[yearMonthKey]) {
                grouped[yearMonthKey] = {};
            }

            if (!grouped[yearMonthKey][dayKey]) {
                grouped[yearMonthKey][dayKey] = [];
            }

            grouped[yearMonthKey][dayKey].push(bookingItem);
        });

        return grouped;
    }

    /**
     * View a specific booking by ID (Public)
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders member_bookings.ejs and sends HTML to the client.
     */
    static async viewBookingById(req, res) {
        try {
            const bookingItem = await BookingSessionActivityLocationUserModel.getByBookingId(req.params.id);
            if (!bookingItem) {
                return res.status(404).render("status.ejs", { 
                status: "Booking not found",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
            }
            
            // Fetch all bookings for the list (same logic as viewAllBookings)
            let allBookingsForList = await BookingSessionActivityLocationUserModel.getAll();
            
            // Check if includePast is requested
            const includePastForList = req.query.includePast === 'true';
            
            // Filter out past bookings unless includePast is true
            if (!includePastForList) {
                allBookingsForList = BookingController.filterBookings(allBookingsForList);
            }

            // Apply member filter if provided
            const memberIdForList = req.query.memberId || null;
            if (memberIdForList) {
                allBookingsForList = allBookingsForList.filter(booking => booking.user.id == memberIdForList);
            }

            // Apply activity filter if provided
            const activityIdForList = req.query.activityId || null;
            if (activityIdForList) {
                allBookingsForList = allBookingsForList.filter(booking => booking.activity.id == activityIdForList);
            }

            // Apply location filter if provided
            const locationIdForList = req.query.locationId || null;
            if (locationIdForList) {
                allBookingsForList = allBookingsForList.filter(booking => booking.location.id == locationIdForList);
            }

            // Apply date range filters if provided
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            
            if (startDate) {
                allBookingsForList = allBookingsForList.filter(booking => {
                    const sessionDateStr = booking.session.sessionDate; // This should be in YYYY-MM-DD format
                    return sessionDateStr >= startDate; // String comparison for dates
                });
            }
            
            if (endDate) {
                allBookingsForList = allBookingsForList.filter(booking => {
                    const sessionDateStr = booking.session.sessionDate; // This should be in YYYY-MM-DD format
                    return sessionDateStr <= endDate; // String comparison for dates
                });
            }

            // Only members can see their own bookings
            if (req.authenticatedUser && req.authenticatedUser.role === 'member') {
                allBookingsForList = allBookingsForList.filter(booking => booking.user.id == req.authenticatedUser.id);
            }

            // Group all bookings by day
            const groupedBookingsForList = BookingController.groupBookingsByDay(allBookingsForList);

            const activities = await ActivityModel.getAll();
            const locations = await LocationModel.getAll();

            let users = await UserModel.getAll();
            users = users.filter(user => user.role === 'member');

            // Fetch all users again
            let allUsers = await UserModel.getAll();
            // Filter out only trainers
            let trainers = allUsers.filter(user => user.role === 'trainer');

            // Get all sessions with enhanced data for the form
            let sessionsWithData = await SessionActivityLocationUserModel.getAll();
            
            // Filter out past sessions
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Set to beginning of today for accurate date comparison
            sessionsWithData = sessionsWithData.filter(session => {
                const sessionDate = new Date(session.session.sessionDate);
                sessionDate.setHours(0, 0, 0, 0); // Set to beginning of the day for accurate date comparison
                return sessionDate >= currentDate; // Keep only future sessions
            });

            // Get filter parameters from query string
            const startDateFilter = req.query.startDate || '';
            const endDateFilter = req.query.endDate || '';

            res.render("member_bookings.ejs", {
                selectedBooking: bookingItem,
                groupedBookings: groupedBookingsForList,
                activities: activities,
                locations: locations,
                users: users,
                allUsers: users,  // Add this for the partial
                members: users, // Use the filtered members array
                trainers: trainers, // Add the trainers array
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                memberId: req.query.memberId || null,
                activityId: activityIdForList,
                locationId: locationIdForList,
                includePast: includePastForList,
                sessions: sessionsWithData, // Use enhanced sessions data with related info
                currentPage: 'bookings',
                startDate: startDateFilter,
                endDate: endDateFilter,
                bookings: allBookingsForList
            });
        } catch (error) {
            console.error("Error fetching booking details:", error);
            res.status(500).render("status", {
                status: "Error",
                message: "Unable to load booking details. Please try again or contact support.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }



    /**
     * Unified handler for booking CRUD operations
     * Handles create, update, and delete operations based on action parameter
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles booking CRUD operations and redirects or renders status page.
     */
    static async handleBookingAction(req, res) {
        try {
            const action = req.body.action;
            const bookingId = req.params.id;
            
            // Debug logging
            console.log('Received action:', action);
            console.log('Booking ID:', bookingId);
            console.log('Request body:', req.body);

            switch (action) {
                case 'create':
                    const { sessionId, memberId } = req.body;
                    let userId;

                    // Determine the user ID based on role
                    if (req.authenticatedUser.role === 'member') {
                        // Members can only create bookings for themselves
                        userId = req.authenticatedUser.id;
                    } else if (req.authenticatedUser.role === 'admin') {
                        // Admins can create bookings for any member
                        userId = memberId;
                    } else {
                        return res.status(403).render("status.ejs", {
                            status: "Error",
                            message: "Only members and admins can create bookings.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    if (!sessionId || !userId) {
                        return res.status(400).render("status.ejs", {
                            status: "Missing Required Information",
                            message: "Please select both a training session and a member to create a booking. All required fields must be completed.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check if the booking already exists
                    const existingBooking = await BookingModel.checkBookingExists(userId, sessionId);
                    if (existingBooking) {
                        return res.status(400).render("status.ejs", {
                            status: "Error",
                            message: "You already have a booking for this session!",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    const newBooking = new BookingModel(null, userId, sessionId);
                    await BookingModel.create(newBooking);
                    
                    // Redirect back to bookings page with success message
                    res.redirect('/bookings?message=booking_added');
                    return;
                    break;

                case 'update':
                    const updateData = {
                        sessionId: req.body.sessionId,
                        memberId: req.authenticatedUser.role === 'admin' ? req.body.memberId : req.authenticatedUser.id
                    };

                    if (!updateData.sessionId || !updateData.memberId) {
                        return res.status(400).render("status.ejs", {
                            status: "Error",
                            message: "Session ID and Member ID are required.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    const bookingToUpdate = await BookingModel.getById(bookingId);
                    if (!bookingToUpdate) {
                        return res.status(404).render("status.ejs", {
                            status: "Error",
                            message: "The booking you're trying to update could not be found. It may have been deleted or you may not have permission to access it. Please check your bookings list and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Members can only update their own bookings
                    if (req.authenticatedUser.role === 'member' && bookingToUpdate.memberId !== req.authenticatedUser.id) {
                        return res.status(403).render("status.ejs", {
                            status: "Access Restricted",
                            message: "As a member, you can only modify your own training session bookings. Please contact an administrator if you need to update bookings for other members.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check if the booking already exists (excluding the current booking being updated)
                    const existingUpdateBooking = await BookingModel.checkBookingExists(updateData.memberId, updateData.sessionId);
                    if (existingUpdateBooking && existingUpdateBooking.id != bookingId) {
                        return res.status(400).render("status.ejs", {
                            status: "Error",
                            message: "You already have a booking for this session!",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    const updatedBooking = new BookingModel(
                        bookingId,
                        updateData.memberId,
                        updateData.sessionId
                    );

                    await BookingModel.update(bookingId, updatedBooking);
                    
                    // Redirect back to bookings page with success message
                    res.redirect('/bookings?message=booking_updated');
                    return;
                    break;

                case 'cancel':
                    const booking = await BookingModel.getById(bookingId);
                    if (!booking) {
                        return res.status(404).render("status.ejs", {
                            status: "Error",
                            message: "Booking not found.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Members can only cancel their own bookings
                    if (req.authenticatedUser.role === 'member' && booking.memberId !== req.authenticatedUser.id) {
                        return res.status(403).render("status.ejs", {
                            status: "Access Restricted",
                            message: "As a member, you can only cancel your own training session bookings. Please contact an administrator if you need to cancel bookings for other members.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    await BookingModel.delete(bookingId);
                    
                    // Redirect back to bookings page with success message
                    res.redirect('/bookings?message=booking_cancelled');
                    return;
                    break;

                default:
                    return res.status(400).render("status.ejs", {
                        status: "Error",
                        message: "The action you're trying to perform is not recognized. Please use the buttons on the booking form to update, cancel, or create bookings. If you continue to see this error, please refresh the page and try again.",
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

            res.redirect("/bookings");

        } catch (error) {
            console.error("Error in handleBookingAction:", error);
            res.status(500).render("status", {
                status: "Error",
                message: "We encountered an unexpected error while processing your booking request. This could be due to a temporary server issue or a problem with your request. Please try again in a few moments, and if the problem persists, please contact our support team for assistance.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Export member's booking history as XML for fitness tracking applications
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Sends XML data to the client for download.
     */
    static async exportBookingHistoryXML(req, res) {
        try {
            const memberId = req.authenticatedUser.id;

            // Get all bookings for the member (including past bookings for history)
            let bookings = await BookingSessionActivityLocationUserModel.getAll();
            
            // Filter to only include bookings for this member
            bookings = bookings.filter(booking => booking.user.id == memberId);

            // Generate XML content
            const xmlContent = generateBookingsXML(bookings, req.authenticatedUser);

            // Create filename with member name
            const memberName = `${req.authenticatedUser.firstName}-${req.authenticatedUser.lastName}`.replace(/\s+/g, '-');
            const filename = `booking-history-${memberName}.xml`;

            // Set response headers for XML download
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(xmlContent);

        } catch (error) {
            console.error("Error exporting booking history XML:", error);
            res.status(500).render("status.ejs", {
                status: "Export Error",
                message: "Failed to export booking history. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }
}

    /**
     * Generate XML content for member's booking history
     * @param {Array} bookings - Array of BookingSessionActivityLocationUserModel instances
     * @param {Object} user - User object (member or admin)
     * @returns {string} XML content
     */
    function generateBookingsXML(bookings, user) {
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
                    <name>${escapeXML(activity.name)}</name>
                    <description>${escapeXML(activity.description)}</description>
                </activity>
                <location>
                    <name>${escapeXML(location.name)}</name>
                    <address>${escapeXML(location.address)}</address>
                </location>
                <trainer>
                    <name>${escapeXML(trainer.firstName)} ${escapeXML(trainer.lastName)}</name>
                    <email>${escapeXML(trainer.email)}</email>
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
    function escapeXML(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }



