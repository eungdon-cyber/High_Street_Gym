import express from "express";
import { SessionModel } from "../../models/SessionModel.mjs";
import { SessionActivityLocationUserModel } from "../../models/SessionActivityLocationUserModel.mjs";
import { UserModel } from "../../models/UserModel.mjs";
import { SessionController } from "../SessionController.mjs";
import { APIAuthenticationController } from "./APIAuthenticationController.mjs";

export class APISessionController {
    static routes = express.Router();

    static {
        this.routes.get(
            "/",
            this.viewAllSessions
        );
        
        this.routes.get(
            "/self",
            APIAuthenticationController.restrict(["trainer", "admin"]),
            this.viewMySessions
        );
        this.routes.post(
            "/",
            APIAuthenticationController.restrict(["trainer", "admin"]),
            this.createSession
        );
        this.routes.delete(
            "/:id",
            APIAuthenticationController.restrict(["trainer", "admin"]),
            this.cancelSession
        );
        this.routes.get(
            "/export/xml/weekly",
            APIAuthenticationController.restrict(["trainer", "admin"]),
            this.exportWeeklySessionsXML
        );
    }
    /**
     * Helper method to filter and transform session details into API response format
     * @param {Array} sessionDetails - Raw session details from database
     * @returns {Array} Transformed sessions array
     */
    static transformSessions(sessionDetails) {
        // Filter out past sessions using the same logic as SessionController
        const filteredSessions = SessionController.filterSessions(sessionDetails);
        
        // Transform to include activity name, trainer name, and location name in session object
        return filteredSessions.map(item => ({
            id: item.session.id,
            activityId: item.session.activityId,
            activityName: item.activity.name,
            trainerId: item.session.trainerId,
            trainerName: item.user ? `${item.user.firstName} ${item.user.lastName}` : null,
            locationId: item.session.locationId,
            locationName: item.location ? item.location.name : null,
            sessionDate: item.session.sessionDate,
            sessionTime: item.session.sessionTime,
            deleted: item.session.deleted
        }));
    }

    /**
     * @openapi
     * /sessions:
     *   get:
     *     summary: "Get all sessions"
     *     tags: [Sessions]
     *     description: "Retrieve a list of all active sessions, sorted by date and time"
     *     responses:
     *       200:
     *         $ref: '#/components/responses/SessionsList'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewAllSessions(req, res) {
        try {
            const sessionDetails = await SessionActivityLocationUserModel.getAll();
            const sessions = APISessionController.transformSessions(sessionDetails);
            res.status(200).json(sessions);
        } catch (error) {
            console.error("Error fetching all sessions:", error);
            res.status(500).json({ message: "Failed to retrieve sessions" });
        }
    }

    /**
     * @openapi
     * /sessions/self:
     *   get:
     *     summary: "Get authenticated trainer's sessions"
     *     tags: [Sessions]
     *     description: "Retrieve a list of all active sessions for the authenticated trainer, sorted by date and time"
     *     security:
     *       - apiKey: []
     *     responses:
     *       200:
     *         $ref: '#/components/responses/SessionsList'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewMySessions(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const trainerId = req.authenticatedUser.id;
            const sessionDetails = await SessionActivityLocationUserModel.getByTrainerId(trainerId);
            const sessions = APISessionController.transformSessions(sessionDetails);
            res.status(200).json(sessions);
        } catch (error) {
            console.error("Error fetching trainer sessions:", error);
            res.status(500).json({ message: "Failed to retrieve sessions" });
        }
    }

    /**
     * @openapi
     * /sessions:
     *   post:
     *     summary: "Create a new session"
     *     tags: [Sessions]
     *     description: "Create a session for the authenticated trainer. Trainers can only create sessions for themselves."
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       description: Session request containing activity, location, date, and time
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SessionInput'
     *     responses:
     *       201:
     *         $ref: '#/components/responses/SessionCreated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async createSession(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            // Extract session details from request body
            const { activityId, locationId, sessionDate, sessionTime } = req.body;
            
            // Validate required fields
            if (!activityId || !locationId || !sessionDate || !sessionTime) {
                return res.status(400).json({ 
                    message: "activityId, locationId, sessionDate, and sessionTime are required" 
                });
            }

            // Trainers can only create sessions for themselves
            // Extract trainerId from authenticated user
            const trainerId = req.authenticatedUser.id;

            // Create session using SessionModel
            const session = new SessionModel(null, activityId, trainerId, locationId, sessionDate, sessionTime, 0);
            const result = await SessionModel.create(session);

            // Get the created session using the insertId from the result
            const createdSession = await SessionModel.getById(result.insertId);
            res.status(201).json(createdSession);
        } catch (error) {
            console.error("Error creating session:", error);
            res.status(500).json({ message: "Failed to create session" });
        }
    }

    /**
     * @openapi
     * /sessions/{id}:
     *   delete:
     *     summary: "Cancel a session"
     *     tags: [Sessions]
     *     description: "Cancel a session by ID. Only the trainer who owns the session can cancel it."
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The session ID
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
    static async cancelSession(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const sessionId = req.params.id;
            
            // Get the session to verify ownership
            let session;
            try {
                session = await SessionModel.getById(sessionId);
            } catch (error) {
                if (error.message === "Session not found" || error === "not found") {
                    return res.status(404).json({ message: "Session not found" });
                }
                throw error;
            }

            // Check if the authenticated user is the trainer who owns this session
            // Admins can cancel any session, trainers can only cancel their own
            if (req.authenticatedUser.role !== "admin" && session.trainerId !== req.authenticatedUser.id) {
                return res.status(403).json({ 
                    message: "Access forbidden - you can only cancel your own sessions" 
                });
            }

            // Cancel the session (soft delete)
            await SessionModel.delete(sessionId);
            res.status(200).json({ message: "Session canceled successfully" });
        } catch (error) {
            console.error(`Error canceling session with ID ${req.params.id}:`, error);
            res.status(500).json({ message: "Failed to cancel session" });
        }
    }

    /**
     * @openapi
     * /sessions/export/xml/weekly:
     *   get:
     *     summary: "Export trainer's weekly sessions as XML"
     *     tags: [Sessions]
     *     description: "Export the authenticated trainer's sessions as XML for calendar import. Supports optional date range filtering via query parameters."
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date
     *         description: Start date for filtering sessions (YYYY-MM-DD format)
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date
     *         description: End date for filtering sessions (YYYY-MM-DD format)
     *     responses:
     *       200:
     *         description: XML file containing trainer's weekly sessions
     *         content:
     *           application/xml:
     *             schema:
     *               type: string
     *               example: |
     *                 <?xml version="1.0" encoding="UTF-8"?>
     *                 <calendar>
     *                   <header>
     *                     <title>Sessions - John Doe</title>
     *                     <trainer>
     *                       <name>John Doe</name>
     *                       <email>trainer@hsg.com</email>
     *                     </trainer>
     *                   </header>
     *                   <sessions>...</sessions>
     *                 </calendar>
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async exportWeeklySessionsXML(req, res) {
        try {
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            // Only trainers can export their own sessions (admins can export any trainer's)
            const trainerId = req.authenticatedUser.id;
            
            // Get optional date range filter parameters
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;

            // Fetch sessions for the trainer
            let sessions;
            try {
                if (startDate && endDate) {
                    sessions = await SessionActivityLocationUserModel.getByTrainerIdAndDateRange(trainerId, startDate, endDate);
                } else {
                    sessions = await SessionActivityLocationUserModel.getByTrainerId(trainerId);
                }
                
                // Ensure sessions is an array
                if (!Array.isArray(sessions)) {
                    sessions = [];
                }
            } catch (dbError) {
                console.error("Database error fetching sessions:", dbError);
                throw dbError;
            }

            // Get trainer details
            const trainer = await UserModel.getById(trainerId);
            if (!trainer) {
                return res.status(404).json({ message: "Trainer not found" });
            }

            // Generate XML content
            const xmlContent = APISessionController.generateSessionsXML(sessions, trainer, startDate, endDate);

            // Create filename with trainer name and date range
            let filename = `sessions-${trainer.firstName}-${trainer.lastName}`;
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
            console.error("Error stack:", error.stack);
            res.status(500).json({ 
                message: "Failed to export weekly sessions",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
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
    static generateSessionsXML(sessions, trainer, startDate, endDate) {
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
                <title>${APISessionController.escapeXML(activity.name || 'Unknown Activity')}</title>
                <location>${APISessionController.escapeXML(location.name || 'Unknown Location')}</location>
                <start>${formatLocalDateTime(sessionDateTime)}</start>
                <end>${formatLocalDateTime(endDateTime)}</end>
                <activity>
                    <name>${APISessionController.escapeXML(activity.name || 'Unknown Activity')}</name>
                </activity>
                <location_details>
                    <name>${APISessionController.escapeXML(location.name || 'Unknown Location')}</name>
                </location_details>
            </session>`;
        };

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