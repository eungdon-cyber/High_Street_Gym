import express from "express";
import { SessionModel } from "../models/SessionModel.mjs"; // Session data
import { AuthenticationController } from "./AuthenticationController.mjs"; // For restricting access
import { SessionActivityLocationUserModel } from "../models/SessionActivityLocationUserModel.mjs";
import { ActivityModel } from "../models/ActivityModel.mjs";
import { UserModel } from "../models/UserModel.mjs";
import { LocationModel } from "../models/LocationModel.mjs";
import { BookingModel } from "../models/BookingModel.mjs"; // Add this import

export class SessionController {
    static routes = express.Router();

    static {        
        // View all sessions (Public)
        this.routes.get(
            "/",
            this.viewAllSessions            
        );

        // View a specific session by ID (Public)
        this.routes.get(
            "/:id",
            this.viewSessionById
        );

        // Unified CRUD operations (Trainer/Admin only)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["trainer", "admin"]),
            this.handleSessionAction
        );

        // Unified CRUD operations for specific session (Trainer/Admin only)
        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["trainer", "admin"]),
            this.handleSessionAction
        );

        // XML Export for trainer's weekly sessions
        this.routes.get(
            "/export/xml/weekly",
            AuthenticationController.restrict(["trainer"]),
            this.exportWeeklySessionsXML
        );
    }

    /**
     * View all sessions (Public access)
     * 
     * Handles the logic for fetching all sessions based on provided filters such as date range and trainer.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders sessions.ejs and sends HTML to the client.
     */
    static async viewAllSessions(req, res) {
        try {
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const trainerId = req.query.trainerId || null;
            const activityId = req.query.activityId || null;
            const locationId = req.query.locationId || null;
            
    
            // Fetch all sessions (no filters by default)
            let sessions = await SessionActivityLocationUserModel.getAll();
            // console.log("All Sessions:", sessions)

            // Fetch all users
            let allUsers = await UserModel.getAll();

            // Filter users to only include trainers (for trainer dropdown)
            let users = allUsers.filter(user => user.role === 'trainer');

            if (!sessions || !Array.isArray(sessions)) {
                console.error("Error: sessions is not an array or is undefined.");
                sessions = [];  // Default to an empty array to prevent further issues
            }   

            // Use the shared filtering function
            sessions = SessionController.filterSessions(sessions, startDate, endDate, trainerId, activityId, locationId);                                        

            // Group the sessions by year, month, and day
            const groupedSessions = SessionController.groupSessionsByDay(sessions);
    
            // Fetch activities, locations, and users
            const activities = await ActivityModel.getAll();
            const locations = await LocationModel.getAll();
    
            // Render the filtered and grouped sessions to the view
            res.render("sessions", {
                groupedSessions: groupedSessions,
                activities: activities,
                locations: locations,
                users: users, // Trainers only (for trainer dropdown)
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                selectedSession: null,
                startDate: startDate,
                endDate: endDate,
                trainerId: trainerId,
                activityId: activityId || null,
                locationId: locationId || null,
                message: req.query.message, // Pass message for success notifications
                showWarning: req.query.showWarning === 'true',
                warningData: req.query.showWarning === 'true' ? {
                    sessionId: req.query.sessionId,
                    message: `This training session has ${req.query.bookingCount} active member booking(s) that will be automatically cancelled and removed from the system.`
                } : null,
                showCaution: req.query.showCaution === 'true',
                cautionData: req.query.showCaution === 'true' ? {
                    sessionId: req.query.sessionId,
                    message: `This training session has ${req.query.bookingCount} active member booking(s) that will be automatically updated to match the new session schedule, date, time, and location.`,
                    sessionDate: req.query.sessionDate,
                    sessionTime: req.query.sessionTime,
                    activityId: req.query.activityId,
                    locationId: req.query.locationId,
                    userId: req.query.userId
                } : null,
                currentPage: 'sessions'
            });
        } catch (error) {
            console.error("Error fetching sessions:", error);
            return res.status(500).render("status", {  // Remove .ejs
                status: "Error Loading Sessions",
                message: "Unable to retrieve the training sessions. Please try again or contact support if the problem persists.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }    
    
    /**
     * Static method to filter sessions using the same logic for both display and export
     * 
     * @param {Array} sessions - Array of session objects to filter
     * @param {string} startDate - Start date filter (optional)
     * @param {string} endDate - End date filter (optional)
     * @param {string} trainerId - Trainer ID filter (optional)
     * @param {string} activityId - Activity ID filter (optional)
     * @param {string} locationId - Location ID filter (optional)
     * @returns {Array} - Filtered sessions
     */
    static filterSessions(sessions, startDate = null, endDate = null, trainerId = null, activityId = null, locationId = null) {
        // Filter out past sessions
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
        let filteredSessions = sessions.filter(sessionItem => {
            const sessionDate = new Date(sessionItem.session.sessionDate);
            sessionDate.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
            return sessionDate >= currentDate; // This line excludes current day sessions!
        });

        // Apply trainer filter if specified
        if (trainerId) {
            filteredSessions = filteredSessions.filter(sessionItem => 
                sessionItem.session.trainerId == trainerId
            );
        }

        // Apply activity filter if specified
        if (activityId) {
            filteredSessions = filteredSessions.filter(sessionItem => 
                sessionItem.activity.id == activityId
            );
        }

        // Apply location filter if specified
        if (locationId) {
            filteredSessions = filteredSessions.filter(sessionItem => 
                sessionItem.location.id == locationId
            );
        }

        // Apply date filters if specified - use string comparison to avoid timezone issues
        if (startDate) {
            filteredSessions = filteredSessions.filter(sessionItem => {
                const sessionDateStr = sessionItem.session.sessionDate; // This should be in YYYY-MM-DD format
                return sessionDateStr >= startDate; // String comparison for dates
            });
        }
        
        if (endDate) {
            filteredSessions = filteredSessions.filter(sessionItem => {
                const sessionDateStr = sessionItem.session.sessionDate; // This should be in YYYY-MM-DD format
                return sessionDateStr <= endDate; // String comparison for dates
            });
        }

        return filteredSessions;
    }

    /**
     * Static method to group sessions by year, month, and day
     * 
     * @param {Array} sessions - Array of session objects to group
     * @returns {Object} - Grouped sessions
     */
    static groupSessionsByDay(sessions) {
        // console.log("All Sessions:", sessions);  
        const grouped = {};

        if (!Array.isArray(sessions)) {
            console.error("Expected an array for sessions, but got:", typeof sessions);
            return grouped;  // Return empty object to avoid breaking the code
        }

        sessions.forEach((sessionItem) => {

            const sessionDate = new Date(sessionItem.session.sessionDate);
            // console.log("sessionDate:", sessionDate)    // Debugging

            const year = sessionDate.getFullYear();
            // console.log("year:", year)    // Debugging
            const month = sessionDate.getMonth() + 1; // Month is 0-indexed, so add 1
            const dayOfWeek = sessionDate.toLocaleString("en-AU", { 
                weekday: "long", 
                timeZone: "Australia/Brisbane" 
            });
            const dayOfMonth = sessionDate.getDate();

            const yearMonthKey = `${year}-${month < 10 
                ? `0${month}` 
                : month}`; // Format as "YYYY-MM"
            const formattedDate = `${year}-${month < 10 
                ? `0${month}` 
                : month}-${dayOfMonth < 10 ? `0${dayOfMonth}` : dayOfMonth}`;
            const dayKey = `${formattedDate} - ${dayOfWeek}`;

            // Ensure year-month group exists
            if (!grouped[yearMonthKey]) {
                grouped[yearMonthKey] = {};
            }

            // Ensure day of week group exists within year-month group
            if (!grouped[yearMonthKey][dayKey]) {
                grouped[yearMonthKey][dayKey] = [];
            }

            // Add session to the corresponding day group
            grouped[yearMonthKey][dayKey].push(sessionItem);
            // console.log("Sessinon Item:", sessionItem); // Degugging
            
        });

        return grouped;
    }
        
    /**
     * View a specific session (Public access)
     * Fetches session details by ID and renders it to the view.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders sessions.ejs and sends HTML to the client.
     */
    static async viewSessionById(req, res) {
        try {
            // Fetch session with related data by ID
            const sessionDetails = await SessionActivityLocationUserModel.getBySessionId(req.params.id);
            if (!sessionDetails) {
                return res.status(404).render("status", {
                    status: "Session Not Found",
                    message: "The requested training session could not be found. It may have been deleted or the link may be incorrect.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            // console.log("Fetched Session:", sessionDetails);  // Debugging log
            
            // Ensure sessionDetails is always an array
            const sessionArray = Array.isArray(sessionDetails)
                ? sessionDetails
                : [sessionDetails]; // Wrap in array if not already

            // Fetch all activities, locations, and users
            const activities = await ActivityModel.getAll();
            const locations = await LocationModel.getAll();
            let allUsers = await UserModel.getAll();
            
            // Filter users to only include trainers (same as viewAllSessions)
            let users = allUsers.filter(user => user.role === 'trainer');
            const sessions = await SessionModel.getAll();

            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const trainerId = req.query.trainerId || null;
            const activityId = req.query.activityId || null;
            const locationId = req.query.locationId || null;

            // Fetch all sessions for the list (same logic as viewAllSessions)
            let allSessions = await SessionActivityLocationUserModel.getAll();
            
            // Use the shared filtering function (same as viewAllSessions)
            allSessions = SessionController.filterSessions(allSessions, startDate, endDate, trainerId, activityId, locationId);

            // Group all sessions by day
            const groupedSessions = SessionController.groupSessionsByDay(allSessions);

            // Render the session details to the 'sessions.ejs' view with selectedSession
            res.render("sessions", { 
                selectedSession: sessionArray[0], // Pass the first item if it's an array (since there's only one session)
                groupedSessions: groupedSessions, // Added groupedSessions
                activities: activities,           // Added activities
                locations: locations,             // Added locations
                users: users,                     // Added users (for the Trainer dropdown)
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                startDate: startDate,
                endDate: endDate,
                trainerId: trainerId,
                activityId: activityId || null,
                locationId: locationId || null,
                sessions: sessions,
                message: req.query.message, // Pass message for success notifications
                showWarning: req.query.showWarning === 'true',
                warningData: req.query.showWarning === 'true' ? {
                    sessionId: req.query.sessionId,
                    message: `This training session has ${req.query.bookingCount} active member booking(s) that will be automatically cancelled and removed from the system.`
                } : null,
                showCaution: req.query.showCaution === 'true',
                cautionData: req.query.showCaution === 'true' ? {
                    sessionId: req.query.sessionId,
                    message: `This training session has ${req.query.bookingCount} active member booking(s) that will be automatically updated to match the new session schedule, date, time, and location.`,
                    sessionDate: req.query.sessionDate,
                    sessionTime: req.query.sessionTime,
                    activityId: req.query.activityId,
                    locationId: req.query.locationId,
                    userId: req.query.userId
                } : null,
                currentPage: 'sessions'
            });

        } catch (error) {
            console.error("Error fetching session details:", error);
            return res.status(500).render("status", {
                status: "Error Loading Session",
                message: "Unable to retrieve the requested session details. Please try again or contact support if the problem persists.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }
      
    /**
     * Unified handler for session CRUD operations
     * Handles create, update, and delete operations based on action parameter
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles session CRUD operations and redirects or renders status page.
     */
    static async handleSessionAction(req, res) {
        try {
            const action = req.body.action;
            const sessionId = req.params.id;
            let newSessionId = null; // Declare at function level for create action
            
            // Extract filter parameters - use both query and body to preserve original filtered state
            // This ensures we return to the same filtered view the user was originally on
            const startDate = req.query.startDate || req.body.startDate || null;
            const endDate = req.query.endDate || req.body.endDate || null;
            const trainerId = req.query.trainerId || req.body.trainerId || null;
            const activityId = req.query.activityId || req.body.activityId || null;
            const locationId = req.query.locationId || req.body.locationId || null;
            
            // Clean up date values - remove empty strings and ensure proper format
            const cleanStartDate = startDate && startDate.trim() !== '' ? startDate : null;
            const cleanEndDate = endDate && endDate.trim() !== '' ? endDate : null;
            

            switch (action) {
                case 'create':
                    // Extract data from the form submission
                    let {
                        sessionDate,
                        sessionTime,
                        activityId,
                        locationId,
                        userId
                    } = req.body;
                    
                    // Clean up form data (handle arrays and leading commas)
                    activityId = Array.isArray(activityId) ? activityId[1] : activityId;
                    locationId = Array.isArray(locationId) ? locationId[1] : locationId;
                    activityId = activityId ? activityId.toString().replace(/^,/, '') : null;
                    locationId = locationId ? locationId.toString().replace(/^,/, '') : null;

                    // Validate the data
                    if (!sessionDate || !sessionTime || !activityId || !locationId || !userId) {
                        return res.status(400).render("status.ejs", {
                            status: "Missing Required Information",
                            message: "Please fill in all required fields: Session Date, Time, Activity, Location, and Trainer must be selected to create a new training session.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check if session date is in the past
                    const today = new Date();
                    const sessionDateTime = new Date(sessionDate + ' ' + sessionTime);
                    
                    if (sessionDateTime < today) {
                        return res.status(400).render("status.ejs", {
                            status: "Invalid Session Date",
                            message: "Cannot create training sessions for past dates. Please select a future date and time for the session.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check for duplicate session
                    const existingSessionForCreate = await SessionModel.checkSessionExists
                    (
                        activityId,
                        userId,
                        locationId,
                        sessionDate,
                        sessionTime
                    );
                    if (existingSessionForCreate) {
                        return res.status(400).render("status.ejs", {
                            status: "Duplicate Session Conflict",
                            message: "A training session with the same activity, trainer, location, date, and time already exists in the schedule. Please choose a different time slot or modify the existing session.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Create new session
                    const newSession = new SessionModel(
                        null,           // ID will be auto-generated
                        activityId,     // activity ID
                        userId,         // trainer ID
                        locationId,     // location ID
                        sessionDate,    // session date
                        sessionTime,    // session time
                        0               // deleted flag (0 for not deleted)
                    );

                    const createResult = await SessionModel.create(newSession);
                    newSessionId = createResult.insertId; // Assign to function-level variable
                    break;

                case 'update':
                    // Validate ownership: trainers can only update their own sessions
                    if (req.authenticatedUser.role === 'trainer') {
                        const sessionToUpdate = await SessionModel.getById(sessionId);
                        if (sessionToUpdate.trainerId !== req.authenticatedUser.id) {
                            return res.render("status.ejs", {
                                status: "Access Restricted",
                                message: "As a trainer, you can only modify training sessions that you are assigned to teach. Please contact an administrator if you need to update sessions assigned to other trainers.",
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser
                            });
                        }
                    }
                    
                    // Check for associated bookings first
                    const associatedBookingsForUpdate = await SessionController.getAssociatedBookings(sessionId);
                    
                    if (associatedBookingsForUpdate.length > 0) {
                        // Check if user has acknowledged the caution
                        if (req.body.acknowledgeBookingUpdate !== 'true') {
                            // Instead of redirecting, render sessions page with caution data
                            const sessionDetails = await SessionActivityLocationUserModel.getBySessionId(sessionId);
                            let allSessions = await SessionActivityLocationUserModel.getAll();
                            
                            // Filter out past sessions
                            const currentDate = new Date();
                            allSessions = allSessions.filter(sessionItem => {
                                const sessionDate = new Date(sessionItem.session.sessionDate);
                                return sessionDate >= currentDate;
                            });
                            
                            // Group sessions by day
                            const groupedSessions = SessionController.groupSessionsByDay(allSessions);
                            
                            // Fetch activities, locations, and users
                            const activities = await ActivityModel.getAll();
                            const locations = await LocationModel.getAll();
                            let allUsers = await UserModel.getAll();
                            let users = allUsers.filter(user => user.role === 'trainer');
                            
                            return res.render("sessions", {
                                groupedSessions: groupedSessions,
                                activities: activities,
                                locations: locations,
                                users: users,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                selectedSession: sessionDetails,
                                startDate: null,
                                endDate: null,
                                trainerId: null,
                                activityId: null,
                                locationId: null,
                                message: null,
                                showWarning: false,
                                warningData: null,
                                showCaution: true,
                                cautionData: {
                                    message: `This session has ${associatedBookingsForUpdate.length} active member booking(s) that will be automatically updated to reflect the new session details, and all associated booking information will be synchronized with the changes.`,
                                    sessionId: sessionId,
                                    sessionDate: req.body.sessionDate,
                                    sessionTime: req.body.sessionTime,
                                    activityId: req.body.activityId,
                                    locationId: req.body.locationId,
                                    userId: req.body.userId
                                }
                            });
                        }
                        
                        // User has acknowledged, proceed with update
                        await SessionController.updateAssociatedBookings(sessionId, req.body);
                    }

                    // Extract data from the form submission
                    const updateData = {
                        sessionDate: req.body.sessionDate,
                        sessionTime: req.body.sessionTime,
                        activityId: Array.isArray(req.body.activityId) ? req.body.activityId[1] : req.body.activityId,
                        locationId: Array.isArray(req.body.locationId) ? req.body.locationId[1] : req.body.locationId,
                        userId: req.body.userId
                    };
                    
                    // Clean up any leading commas or empty values
                    updateData.activityId = updateData.activityId ? updateData.activityId.toString().replace(/^,/, '') : null;
                    updateData.locationId = updateData.locationId ? updateData.locationId.toString().replace(/^,/, '') : null;
                    

                    // Validate the data
                    if (!updateData.sessionDate || !updateData.sessionTime || !updateData.activityId || !updateData.locationId || !updateData.userId) {
                        return res.status(400).render("status.ejs", {
                            status: "Missing Required Information",
                            message: "Please fill in all required fields: Session Date, Time, Activity, Location, and Trainer must be selected to update the training session.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check for duplicate session (excluding current session)
                    const existingSessionForUpdate = await SessionModel.checkSessionExists(
                        updateData.activityId, 
                        updateData.userId, 
                        updateData.locationId, 
                        updateData.sessionDate, 
                        updateData.sessionTime, 
                        sessionId // Exclude current session from duplicate check
                    );
                    if (existingSessionForUpdate) {
                        return res.status(400).render("status.ejs", {
                            status: "Duplicate Session Conflict",
                            message: "A training session with the same activity, trainer, location, date, and time already exists in the schedule. Please choose a different time slot or modify the existing session.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Update the session
                    const updatedSession = new SessionModel(
                        sessionId,
                        updateData.activityId,
                        updateData.userId,
                        updateData.locationId,
                        updateData.sessionDate,
                        updateData.sessionTime,
                        0
                    );

                    await SessionModel.update(updatedSession);
                    break;

                case 'delete':
                    // Validate ownership: trainers can only delete their own sessions
                    if (req.authenticatedUser.role === 'trainer') {
                        const sessionToDelete = await SessionModel.getById(sessionId);
                        if (sessionToDelete.trainerId !== req.authenticatedUser.id) {
                            return res.render("status.ejs", {
                                status: "Access Restricted",
                                message: "As a trainer, you can only remove training sessions that you are assigned to teach. Please contact an administrator if you need to delete sessions assigned to other trainers.",
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser
                            });
                        }
                    }
                    
                    // Check for associated bookings first
                    const associatedBookingsForDelete = await SessionController.getAssociatedBookings(sessionId);
                    
                    if (associatedBookingsForDelete.length > 0) {
                        // Check if user has acknowledged the warning
                        if (req.body.acknowledgeBookingRemoval !== 'true') {
                            // Instead of redirecting, render sessions page with warning data
                            const sessionDetails = await SessionActivityLocationUserModel.getBySessionId(sessionId);
                            let allSessions = await SessionActivityLocationUserModel.getAll();
                            
                            // Filter out past sessions
                            const currentDate = new Date();
                            allSessions = allSessions.filter(sessionItem => {
                                const sessionDate = new Date(sessionItem.session.sessionDate);
                                return sessionDate >= currentDate;
                            });
                            
                            // Group sessions by day
                            const groupedSessions = SessionController.groupSessionsByDay(allSessions);
                            
                            // Fetch activities, locations, and users
                            const activities = await ActivityModel.getAll();
                            const locations = await LocationModel.getAll();
                            let allUsers = await UserModel.getAll();
                            let users = allUsers.filter(user => user.role === 'trainer');
                            
                            return res.render("sessions", {
                                groupedSessions: groupedSessions,
                                activities: activities,
                                locations: locations,
                                users: users,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                selectedSession: sessionDetails,
                                startDate: null,
                                endDate: null,
                                trainerId: null,
                                activityId: null,
                                locationId: null,
                                message: null,
                                showWarning: true,
                                warningData: {
                                    message: `This session has ${associatedBookingsForDelete.length} active member booking(s) that will be automatically cancelled and removed from the schedule.`,
                                    sessionId: sessionId
                                },
                                showCaution: false,
                                cautionData: null
                            });
                        }
                        
                        // User has acknowledged, proceed with removal
                        await SessionController.removeAssociatedBookings(sessionId);
                    }

                    await SessionModel.delete(sessionId);
                    break;

                default:
                    return res.status(400).render("status.ejs", {
                        status: "Error",
                        message: "Invalid action specified.",
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

            // Get current filter parameters to preserve them in redirects
            // Check both query parameters (GET) and body parameters (POST form data)
            // Note: Variables already declared at the beginning of the function
            
            
            // Build query parameters for redirects
            const buildQueryParams = (baseMessage) => {
                const params = [];
                if (baseMessage) params.push(`message=${baseMessage}`);
                if (startDate) params.push(`startDate=${startDate}`);
                if (endDate) params.push(`endDate=${endDate}`);
                if (trainerId) params.push(`trainerId=${trainerId}`);
                if (activityId) params.push(`activityId=${activityId}`);
                if (locationId) params.push(`locationId=${locationId}`);
                return params.length > 0 ? '?' + params.join('&') : '';
            };

            // Smart filter preservation - preserve safe filters but avoid over-filtering
            const buildSmartQueryParams = (baseMessage) => {
                const params = [];
                if (baseMessage) params.push(`message=${baseMessage}`);
                
                // Always preserve date filters (safe)
                if (cleanStartDate) {
                    params.push(`startDate=${cleanStartDate}`);
                }
                if (cleanEndDate) {
                    params.push(`endDate=${cleanEndDate}`);
                }
                
                // Preserve trainerId only if it's for "My Sessions" (current user)
                // This avoids over-filtering when viewing other trainers' sessions
                if (trainerId && req.authenticatedUser && trainerId == req.authenticatedUser.id) {
                    params.push(`trainerId=${trainerId}`);
                }
                
                // Don't preserve activityId and locationId to avoid over-filtering
                // These can cause the session list to disappear if the new/updated session
                // doesn't match the exact activity/location filters
                return params.length > 0 ? '?' + params.join('&') : '';
            };

            // Redirect with appropriate success message and smart filter preservation
            if (action === 'create' && newSessionId) {
                const redirectUrl = `/sessions/${newSessionId}${buildSmartQueryParams('session_created')}`;
                return res.redirect(redirectUrl);
            } else if (action === 'update' && sessionId) {
                const redirectUrl = `/sessions/${sessionId}${buildSmartQueryParams('session_updated')}`;
                return res.redirect(redirectUrl);
            } else if (action === 'delete') {
                const redirectUrl = `/sessions${buildSmartQueryParams('session_deleted')}`;
                return res.redirect(redirectUrl);
            } else {
                const redirectUrl = `/sessions${buildQueryParams()}`;
                return res.redirect(redirectUrl);
            }

        } catch (error) {
            console.error("Error in handleSessionAction:", error);
            res.status(500).render("status.ejs", {
                status: "Error",
                message: "Error processing session action",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }


    /**
     * Gets all bookings associated with a specific session
     * @param {number} sessionId - The ID of the session
     * @returns {Promise<BookingModel[]>} Array of associated bookings
     */
    static async getAssociatedBookings(sessionId) {
        try {
            return await BookingModel.getBySessionId(sessionId);
        } catch (error) {
            console.error("Error getting associated bookings:", error);
            return [];
        }
    }

    /**
     * Updates all bookings associated with a session when session details change
     * @param {number} sessionId - The ID of the session being updated
     * @param {Object} sessionData - The new session data
     * @returns {Promise<number>} Number of bookings updated
     */
    static async updateAssociatedBookings(sessionId, sessionData) {
        try {
            // Get all bookings for this session
            const associatedBookings = await BookingModel.getBySessionId(sessionId);
            
            let updatedCount = 0;
            
            // Update each booking with the new session details
            for (const booking of associatedBookings) {
                // Create updated booking with new session details
                const updatedBooking = new BookingModel(
                    booking.id,
                    booking.memberId,
                    sessionId, // Keep the same session ID
                    booking.deleted
                );
                
                // Update the booking in the database
                await BookingModel.update(booking.id, updatedBooking);
                updatedCount++;
            }
            
            return updatedCount;
        } catch (error) {
            console.error("Error updating associated bookings:", error);
            return 0;
        }
    }

    /**
     * Removes all bookings associated with a session when the session is deleted
     * @param {number} sessionId - The ID of the session being deleted
     * @returns {Promise<number>} Number of bookings removed
     */
    static async removeAssociatedBookings(sessionId) {
        try {
            // Get all bookings for this session
            const associatedBookings = await BookingModel.getBySessionId(sessionId);
            
            let removedCount = 0;
            
            // Delete each booking associated with this session
            for (const booking of associatedBookings) {
                await BookingModel.delete(booking.id);
                removedCount++;
            }
            
            return removedCount;
        } catch (error) {
            console.error("Error removing associated bookings:", error);
            return 0;
        }
    }

    /**
     * Export trainer's weekly sessions as XML for calendar import
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Sends XML data to the client for download.
     */
    static async exportWeeklySessionsXML(req, res) {
        try {
            // Get filter parameters from query (same as the main sessions page)
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;
            const trainerId = req.query.trainerId || req.authenticatedUser.id; // Use authenticated user if no trainer specified
            const activityId = req.query.activityId || null;
            const locationId = req.query.locationId || null;

            // Get all sessions and apply the same filtering logic as the main page
            let allSessions = await SessionActivityLocationUserModel.getAll();
            
            // Use the shared filtering function (same as main page)
            allSessions = SessionController.filterSessions(allSessions, startDate, endDate, trainerId, activityId, locationId);

            // Get the trainer details for the XML
            const trainer = await UserModel.getById(trainerId);
            if (!trainer) {
                return res.status(404).render("status.ejs", {
                    status: "Trainer not found",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            // Generate XML content with the filtered sessions
            const xmlContent = generateSessionsXML(allSessions, trainer, startDate, endDate);

            // Create a descriptive filename based on the filters
            let filename = "sessions";
            if (trainerId !== req.authenticatedUser.id) {
                filename += `-${trainer.firstName}-${trainer.lastName}`;
            }
            if (startDate && endDate) {
                filename += `-${startDate}-to-${endDate}`;
            } else if (startDate) {
                filename += `-from-${startDate}`;
            } else if (endDate) {
                filename += `-until-${endDate}`;
            }
            filename += ".xml";

            // Set response headers for XML download
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(xmlContent);

        } catch (error) {
            console.error("Error exporting weekly sessions XML:", error);
            res.status(500).render("status.ejs", {
                status: "Export Error",
                message: "Failed to export weekly sessions. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }
}

    /**
     * Generate XML content for trainer's weekly sessions
     * @param {Array} sessions - Array of SessionActivityLocationUserModel instances
     * @param {Object} trainer - Trainer user object
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {string} XML content
     */
    function generateSessionsXML(sessions, trainer, startDate, endDate) {

        // Create period description based on available dates
        let periodDescription = "";
        if (startDate && endDate) {
            periodDescription = `<period>
                <start>${startDate}</start>
                <end>${endDate}</end>
            </period>`;
        } else if (startDate) {
            periodDescription = `<period>
                <start>${startDate}</start>
                <end>No end date specified</end>
            </period>`;
        } else if (endDate) {
            periodDescription = `<period>
                <start>No start date specified</start>
                <end>${endDate}</end>
            </period>`;
        } else {
            periodDescription = `<period>
                <start>All future sessions</start>
                <end>No date range specified</end>
            </period>`;
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <weekly_sessions>
        <header>
            <title>Sessions - ${trainer.firstName} ${trainer.lastName}</title>
            ${periodDescription}
            <trainer>
                <name>${trainer.firstName} ${trainer.lastName}</name>
                <email>${trainer.email}</email>
            </trainer>
            <exported>${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }).replace(',', '')}</exported>
            <total_sessions>${sessions.length}</total_sessions>
        </header>`;

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

        const renderSession = (sessionItem) => {
            const session = sessionItem.session;
            const activity = sessionItem.activity;
            const location = sessionItem.location;
            
            if (!session || !activity || !location) {
                console.warn("Skipping session due to missing data:", sessionItem);
                return "";
            }

            const eventId = `session_${session.id}`;
            const sessionDateTime = new Date(`${session.sessionDate}T${session.sessionTime}`);
            const endDateTime = new Date(sessionDateTime.getTime() + (60 * 60 * 1000));

            return `
            <session>
                <id>${eventId}</id>
                <title>${escapeXML(activity.name)}</title>
                <location>${escapeXML(location.name)}</location>
                <start>${formatLocalDateTime(sessionDateTime)}</start>
                <end>${formatLocalDateTime(endDateTime)}</end>
                <activity>
                    <name>${escapeXML(activity.name)}</name>
                </activity>
                <location_details>
                    <name>${escapeXML(location.name)}</name>
                </location_details>
            </session>`;
        };

        const getWeekRange = (dateString) => {
            if (!dateString) return null;
            const date = new Date(`${dateString}T00:00:00`);
            if (isNaN(date.getTime())) return null;
            const day = date.getDay();
            const diffToMonday = day === 0 ? -6 : 1 - day;
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

        const weekGroups = new Map();
        sessions.forEach(sessionItem => {
            const range = getWeekRange(sessionItem.session?.sessionDate);
            if (!range) return;
            if (!weekGroups.has(range.key)) {
                weekGroups.set(range.key, { range, sessions: [] });
            }
            weekGroups.get(range.key).sessions.push(sessionItem);
        });

        const weekEntries = Array.from(weekGroups.values()).sort((a, b) => {
            if (a.range.startISO === b.range.startISO) {
                return a.range.endISO.localeCompare(b.range.endISO);
            }
            return a.range.startISO.localeCompare(b.range.startISO);
        });

        const multipleWeeks = weekEntries.length > 1;

        xml += `
        <sessions>`;

        if (multipleWeeks) {
            weekEntries.forEach(({ range, sessions: sessionsInWeek }) => {
                xml += `
            <week start="${range.startISO}" end="${range.endISO}" label="${range.label}">
                ${sessionsInWeek.map(renderSession).join("")}
            </week>`;
            });
        } else {
            xml += sessions.map(renderSession).join("");
        }

        xml += `
        </sessions>
    </weekly_sessions>`;

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





