import express from "express";
import { ActivityModel } from "../models/ActivityModel.mjs";
import { SessionModel } from "../models/SessionModel.mjs";
import { AuthenticationController } from "./AuthenticationController.mjs";

export class ActivityController {
    static routes = express.Router();

    static {
        // ✅ Fetch all activities (Public)
        this.routes.get(
            "/",
            this.viewAllActivities
        );

        // ✅ Fetch a specific activity by ID (Public)
        this.routes.get(
            "/:id",
            this.viewActivityById
        );

        // ✅ Unified form handling for create, update, and delete (Admin only)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["admin"]),
            this.handleActivityAction
        );

        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["admin"]),
            this.handleActivityAction
        );
    }

    /**
     * Fetch all activities.
     * This method handles the route to fetch all activities from the database and render them on the view.
     * 
     * @param {Request} req - The request object containing client request data.
     * @param {Response} res - The response object used to send a response back to the client.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders activities.ejs and sends HTML to the client.
     */
    static async viewAllActivities(req, res) {
        try {
            const activityName = req.query.activityName || null;
            const message = req.query.message || null;
            let activities = await ActivityModel.getAll();
            
            // Apply activity name filter if provided
            if (activityName) {
                activities = activities.filter(activity => 
                    activity.name.toLowerCase().includes(activityName.toLowerCase())
                );
            }
            
            res.render("activities", { 
                activities, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                selectedActivity: null,
                currentPage: 'activities',
                activityName: activityName,
                message: message,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null,
                fromSessions: false,
                sessionId: null
            });
        } catch (error) {
            console.error("Error fetching activities:", error);
            res.render("status", {
                status: "Error",
                message: "Unable to load activities",
                details: "There was a problem retrieving the activities list. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Fetch a specific activity by ID.
     * This method handles the route to fetch a single activity from the database and render its details.
     * 
     * @param {Request} req - The request object containing client request data, including the activity ID.
     * @param {Response} res - The response object used to send a response back to the client.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders activities.ejs and sends HTML to the client.
     */
    static async viewActivityById(req, res) {
        try {
            const activity = await ActivityModel.getById(req.params.id);
            if (!activity) {
                return res.status(404).render("status", {
                    status: "Activity Not Found",
                    message: "The requested activity could not be found. It may have been deleted or the ID may be incorrect.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            console.log("Fetched Activity:", activity);
    
            const activities = await ActivityModel.getAll();

            res.render("activities", {
                selectedActivity: activity, 
                activities: activities, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                currentPage: 'activities',
                activityName: null,
                message: null,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null,
            });
        } catch (error) {
            console.error("Error fetching activity details:", error);
            res.render("status", {
                status: "Error",
                message: "Unable to load activity details",
                details: "There was a problem retrieving the activity information. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Unified handler for create, update, and delete actions (Admin only).
     * This method handles all form submissions based on the action parameter.
     * 
     * @param {Request} req - The request object containing the client input data.
     * @param {Response} res - The response object used to send a response back to the client.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders activities.ejs and sends HTML to the client.
     */
    static async handleActivityAction(req, res) {
        try {
            const { name, description, action } = req.body;
            const activityId = req.params.id;

            // Validate Activity Name
            if (!/^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(name)) {
                return res.status(400).render("status", {
                    status: "Activity Name Validation Failed",
                    message: "The activity name you entered is not valid. Activity names must start with a letter and can only contain letters, numbers, dashes, apostrophes, and spaces. Please check your input and try again.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            // Validate Description
            if (!/^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(description)) {
                return res.status(400).render("status", {
                    status: "Activity Description Validation Failed",
                    message: "The activity description you entered is not valid. Descriptions must start with a letter and can contain letters, numbers, spaces, dashes, apostrophes, and basic punctuation. Please check your input and try again.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            switch (action) {
                case 'create':
                    await ActivityModel.create({ name, description });
                    res.redirect("/activities?message=activity_created");
                    break;
                case 'update':
                    if (!activityId) {
                        return res.status(400).render("status", {
                            status: "Activity Update Failed - Missing ID",
                            message: "Cannot update activity: No activity ID was provided. Please select an activity from the list and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Check for associated sessions before updating
                    const associatedSessionsForUpdate = await SessionModel.getByActivityId(activityId);
                    if (associatedSessionsForUpdate.length > 0) {
                        // Check if user has acknowledged the caution
                        if (req.body.acknowledgeActivityUpdate !== 'true') {
                            // Instead of rendering status page, redirect back with caution data
                            const activity = await ActivityModel.getById(activityId);
                            const activities = await ActivityModel.getAll();
                            
                            return res.render("activities", {
                                activities,
                                selectedActivity: activity,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                currentPage: 'activities',
                                activityName: null,
                                message: null,
                                showWarning: false,
                                warningData: null,
                                showCaution: true,
                                cautionData: {
                                    message: `This activity has ${associatedSessionsForUpdate.length} active training session(s) that will be automatically updated to reflect the new activity details, and all associated member bookings will be synchronized with the changes.`,                                    
                                    activityId: activityId,
                                    name: name,
                                    description: description
                                }
                            });
                        }
                    }
                    
                    await ActivityModel.update(activityId, { name, description });
                    res.redirect("/activities?message=activity_updated");
                    break;
                case 'delete':
                    if (!activityId) {
                        return res.status(400).render("status", {
                            status: "Activity Deletion Failed - Missing ID",
                            message: "Cannot delete activity: No activity ID was provided. Please select an activity from the list and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Check for associated sessions before deleting
                    const associatedSessionsForDelete = await SessionModel.getByActivityId(activityId);
                    if (associatedSessionsForDelete.length > 0) {
                        // Check if user has acknowledged the warning
                        if (req.body.acknowledgeActivityRemoval !== 'true') {
                            // Instead of rendering status page, redirect back with warning data
                            const activity = await ActivityModel.getById(activityId);
                            const activities = await ActivityModel.getAll();
                            
                            return res.render("activities", {
                                activities,
                                selectedActivity: activity,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                currentPage: 'activities',
                                activityName: null,
                                message: null,
                                showWarning: true,
                                warningData: {
                                    message: `This activity has ${associatedSessionsForDelete.length} active training session(s) that will be automatically cancelled and removed from the schedule, along with all associated member bookings.`,
                                    activityId: activityId
                                }
                            });
                        }
                    }
                    
                    await ActivityModel.delete(activityId);
                    res.redirect("/activities?message=activity_deleted");
                    break;
                default:
                    return res.status(400).render("status", {
                        status: "Unknown Activity Action",
                        message: `The action "${action}" is not recognized. Valid actions are: create, update, or delete. Please check your request and try again.`,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

            // Remove the generic redirect since each case now handles its own redirect
        } catch (error) {
            console.error("Error handling activity action:", error);
            return res.status(500).render("status", {
                status: "Activity Operation Failed",
                message: "An unexpected error occurred while processing your activity request. Please try again, and if the problem persists, contact the administrator.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }
}

