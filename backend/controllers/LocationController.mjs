import express from "express";
import { LocationModel } from "../models/LocationModel.mjs";
import { SessionModel } from "../models/SessionModel.mjs";
import { AuthenticationController } from "./AuthenticationController.mjs";

export class LocationController {
    static routes = express.Router();

    static {
        // ✅ Fetch all locations (Public)
        this.routes.get("/", this.viewAllLocations);

        // ✅ Fetch a specific location by ID (Public)
        this.routes.get("/:id", this.viewLocationById);

        // ✅ Unified form handling for create, update, and delete (Admin only)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["admin"]),
            this.handleLocationAction
        );

        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["admin"]),
            this.handleLocationAction
        );
    }

    /**
     * View all locations.
     * 
     * This method retrieves all the locations from the LocationModel and renders them on the "locations" page.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders locations.ejs and sends HTML to the client.
     */
    static async viewAllLocations(req, res) {
        try {
            const locationName = req.query.locationName || null;
            const message = req.query.message || null;
            let locations = await LocationModel.getAll();
            
            // Apply location name filter if provided
            if (locationName) {
                locations = locations.filter(location => 
                    location.name.toLowerCase().includes(locationName.toLowerCase())
                );
            }
            
            res.render("locations", { 
                locations, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                selectedLocation: null,
                currentPage: 'locations',
                locationName: locationName,
                message: message,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null
            });
        } catch (error) {
            console.error("Error fetching locations:", error);
            return res.status(500).render("status", {
                status: "Error",
                message: "Unable to load locations",
                details: "There was a problem retrieving the locations list. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    } 

    /**
     * View a specific location by its ID.
     * 
     * This method retrieves a specific location using the ID parameter, and renders it on the "locations" page.
     * 
     * @param {Request} req - The request object containing the location ID as a parameter.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders locations.ejs and sends HTML to the client.
     */
    static async viewLocationById(req, res) {
        try {
            const location = await LocationModel.getById(req.params.id);
            if (!location) {
                return res.status(404).render("status", {
                    status: "Location Not Found",
                    message: `The location with ID "${req.params.id}" could not be found. It may have been deleted or the ID may be incorrect. Please check the location ID and try again, or return to the locations list.`,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            // console.log("Fetched Location:", location);
    
            const locations = await LocationModel.getAll();

            res.render("locations", {
                selectedLocation: location, 
                locations: locations, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                currentPage: 'locations',
                locationName: null,
                message: null,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null
            });
        } catch (error) {
            console.error("Error fetching location details:", error);
            return res.status(500).render("status", {
                status: "Location Loading Failed",
                message: "An error occurred while loading the location details. Please try again, and if the problem persists, contact the administrator.",
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
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles location CRUD operations and redirects or renders status page.
     */
    static async handleLocationAction(req, res) {
        try {
            const { name, address, action } = req.body;
            const locationId = req.params.id;

            // Validate Location Name
            if (!/^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(name)) {
                return res.status(400).render("status", {
                    status: "Location Name Validation Failed",
                    message: "The location name you entered is not valid. Location names must start with a letter and can only contain letters, dashes, apostrophes, and spaces. Please check your input and try again.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            // Validate Location Address
            if (!/^[a-zA-Z0-9][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(address)) {
                return res.status(400).render("status", {
                    status: "Location Address Validation Failed",
                    message: "The location address you entered is not valid. Addresses must start with a letter or number and can contain letters, numbers, spaces, dashes, apostrophes, commas, periods, and hash symbols. Please check your input and try again.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            switch (action) {
                case 'create':
                    await LocationModel.create(name, address);
                    res.redirect("/locations?message=location_created");
                    break;
                case 'update':
                    if (!locationId) {
                        return res.status(400).render("status", {
                            status: "Location Update Failed - Missing ID",
                            message: "Cannot update location: No location ID was provided. Please select a location from the list and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Check for associated sessions before updating
                    const associatedSessionsForUpdate = await SessionModel.getByLocationId(locationId);
                    if (associatedSessionsForUpdate.length > 0) {
                        // Check if user has acknowledged the caution
                        if (req.body.acknowledgeLocationUpdate !== 'true') {
                            // Instead of rendering status page, redirect back with caution data
                            const location = await LocationModel.getById(locationId);
                            const locations = await LocationModel.getAll();
                            
                            return res.render("locations", {
                                locations,
                                selectedLocation: location,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                currentPage: 'locations',
                                locationName: null,
                                message: null,
                                showWarning: false,
                                warningData: null,
                                showCaution: true,
                                cautionData: {
                                    message: `This location has ${associatedSessionsForUpdate.length} active training session(s) that will be automatically updated to reflect the new location details, and all associated member bookings will be synchronized with the changes.`,
                                    locationId: locationId,
                                    name: name,
                                    address: address
                                }
                            });
                        }
                    }
                    
                    await LocationModel.update(locationId, { name, address });
                    res.redirect("/locations?message=location_updated");
                    break;
                case 'delete':
                    if (!locationId) {
                        return res.status(400).render("status", {
                            status: "Location Deletion Failed - Missing ID",
                            message: "Cannot delete location: No location ID was provided. Please select a location from the list and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Check for associated sessions before deleting
                    const associatedSessionsForDelete = await SessionModel.getByLocationId(locationId);
                    if (associatedSessionsForDelete.length > 0) {
                        // Check if user has acknowledged the warning
                        if (req.body.acknowledgeLocationRemoval !== 'true') {
                            // Instead of rendering status page, redirect back with warning data
                            const location = await LocationModel.getById(locationId);
                            const locations = await LocationModel.getAll();
                            
                            return res.render("locations", {
                                locations,
                                selectedLocation: location,
                                currentUser: req.authenticatedUser || { role: 'guest' },
                                isAuthenticated: !!req.authenticatedUser,
                                currentPage: 'locations',
                                locationName: null,
                                message: null,
                                showWarning: true,
                                warningData: {
                                    message: `This location has ${associatedSessionsForDelete.length} active training session(s) that will be automatically cancelled and removed from the schedule, along with all associated member bookings.`,
                                    locationId: locationId
                                }
                            });
                        }
                    }
                    
                    await LocationModel.delete(locationId);
                    res.redirect("/locations?message=location_deleted");
                    break;
                default:
                    return res.status(400).render("status", {
                        status: "Unknown Location Action",
                        message: `The action "${action}" is not recognized. Valid actions are: create, update, or delete. Please check your request and try again.`,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

            // Remove the generic redirect since each case now handles its own redirect
        } catch (error) {
            console.error("Error handling location action:", error);
            return res.status(500).render("status", {
                status: "Location Operation Failed",
                message: "An unexpected error occurred while processing your location request. Please try again, and if the problem persists, contact the administrator.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }


}
