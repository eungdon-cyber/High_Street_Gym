import express from "express";
import { AuthenticationController } from "./AuthenticationController.mjs";
import { UserModel } from "../models/UserModel.mjs";
import { SessionModel } from "../models/SessionModel.mjs";
import { BookingModel } from "../models/BookingModel.mjs";
import validator from "validator"

export class UserController {
    static routes = express.Router();

    static {
        // ✅ Public registration routes (no authentication required)
        this.routes.get(
            "/register",
            this.viewRegisterPage
        );

        this.routes.post(
            "/register",
            this.register
        );

        // ✅ Fetch all users (Admin only)
        this.routes.get(
            "/",
            AuthenticationController.restrict(["admin"]),
            this.viewAllUsers
        );

        // ✅ Fetch a specific user by ID (Admin only)
        this.routes.get(
            "/:id",
            AuthenticationController.restrict(["admin"]),
            this.viewUserById
        );

        // ✅ Unified form handling for create, update, and delete (Admin only)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["admin"]),
            this.handleUserAction
        );

        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["admin"]),
            this.handleUserAction
        );
    }

    /**
     * View all users (Admin only)
     * Retrieves and displays all users from the database.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders users.ejs and sends HTML to the client.
     */
    static async viewAllUsers(req, res) {
        try {
            const searchKeyword = req.query.searchKeyword || null;
            const userRole = req.query.userRole || null;
            const message = req.query.message || null;
            let users = await UserModel.getAll();
            
            // Apply user name filter if provided
            if (searchKeyword) {
                users = users.filter(user => 
                    user.firstName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                    user.lastName.toLowerCase().includes(searchKeyword.toLowerCase())
                );
            }
            
            // Apply role filter if provided
            if (userRole) {
                users = users.filter(user => user.role === userRole);
            }
            
            // console.log("Fetched Users:", users);  // Log to check user data

            res.render("users", { 
                users, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                selectedUser: null,
                currentPage: 'users',
                searchKeyword: searchKeyword, // Pass the filter value back to the view
                userRole: userRole, // Pass the role filter value back to the view
                message: message,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null
            });
        } catch (error) {
            console.error("Error fetching users:", error);
            return res.status(500).render("status", {
                status: "Error",
                message: "Unable to load users",
                details: "There was a problem retrieving the users list. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * View a specific user by ID (Admin only)
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders users.ejs and sends HTML to the client.
     */
    static async viewUserById(req, res) {
        try {
            const user = await UserModel.getById(req.params.id);
            if (!user) {
                return res.status(404).render("status", {
                    status: "User Not Found",
                    message: `No user found with ID: ${req.params.id}. The user may have been deleted or the ID may be incorrect.`,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            const users = await UserModel.getAll();
            // console.log("Fetched User:", user);  // Log to check user data
            res.render("users", {
                selectedUser: user,                
                users: users,
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                currentPage: 'users',
                searchKeyword: null, // Add this to prevent the ReferenceError
                userRole: null, // Add this to prevent the ReferenceError
                message: null,
                showWarning: false,
                warningData: null,
                showCaution: false,
                cautionData: null
            });
        } catch (error) {
            console.error("Error fetching user details:", error);
            return res.status(500).render("status", {
                status: "Error",
                message: "Unable to load user details",
                details: "There was a problem retrieving the user information. Please try again.",
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
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles user CRUD operations and redirects or renders status page.
     */
    static async handleUserAction(req, res) {
        try {
            const { email, password, confirmPassword, role, firstName, lastName, action } = req.body;
            const userId = req.params.id;

            // Only validate fields for create and update actions
            if (action === 'create' || action === 'update') {
                // Validate email
                const emailValidation = UserController.validateEmail(email);
                if (!emailValidation.isValid) {
                    return res.status(400).render("status", {
                        status: emailValidation.status,
                        message: emailValidation.message,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
                }

                // Validate names
                const firstNameValidation = UserController.validateName(firstName, 'first name');
                if (!firstNameValidation.isValid) {
                    return res.status(400).render("status", {
                        status: firstNameValidation.status,
                        message: firstNameValidation.message,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
                }

                const lastNameValidation = UserController.validateName(lastName, 'last name');
                if (!lastNameValidation.isValid) {
                    return res.status(400).render("status", {
                        status: lastNameValidation.status,
                        message: lastNameValidation.message,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
                }

                // Password validation for create action
                if (action === 'create') {
                    const passwordValidation = UserController.validatePassword(password, confirmPassword);
                    if (!passwordValidation.isValid) {
                        return res.status(400).render("status", {
                            status: passwordValidation.status,
                            message: passwordValidation.message,
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                }
            }

            // Password validation for create action
            if (action === 'create') {
                const passwordValidation = UserController.validatePassword(password, confirmPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).render("status", {
                        status: passwordValidation.status,
                        message: passwordValidation.message,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
                }

            } else if (action === 'update' && password && password !== '••••••••') {
                // Only validate password if it's not the placeholder and not empty
                const passwordValidation = UserController.validatePassword(password, confirmPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).render("status", {
                        status: passwordValidation.status,
                        message: passwordValidation.message,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
                }
            }

            switch (action) {
                case 'create':
                    await UserModel.create(req.body);
                    res.redirect("/users?message=user_created");
                    break;
                case 'update':
                    if (!userId) {
                        return res.status(400).render("status", {
                            status: "Missing User ID",
                            message: "Cannot update user: User ID is required to identify which user to update.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Check for associated data and show caution if needed
                    if (role === 'trainer' || role === 'member') {
                        try {
                            let associatedData = [];
                            let cautionType = '';
                            let acknowledgmentField = '';
                            let messageTemplate = '';
                            
                            if (role === 'trainer') {
                                associatedData = await SessionModel.getByTrainerId(userId);
                                cautionType = 'trainer';
                                acknowledgmentField = 'acknowledgeTrainerUpdate';
                                messageTemplate = `This trainer has ${associatedData.length} active training session(s) that will be automatically updated to reflect the new trainer details, and all associated member bookings will be synchronized with the changes.`;
                            } else if (role === 'member') {
                                associatedData = await BookingModel.getByMemberId(userId);
                                cautionType = 'member';
                                acknowledgmentField = 'acknowledgeMemberUpdate';
                                messageTemplate = `This member has ${associatedData.length} active training session booking(s) that will be automatically updated to reflect the new member details, and all associated booking information will be synchronized with the changes.`;
                            }
                            
                            if (associatedData.length > 0) {
                                // Check if user has acknowledged the caution
                                if (req.body[acknowledgmentField] !== 'true') {
                                    // Instead of rendering status page, redirect back with caution data
                                    const user = await UserModel.getById(userId);
                                    const users = await UserModel.getAll();
                                    
                                    return res.render("users", {
                                        users,
                                        selectedUser: user,
                                        currentUser: req.authenticatedUser || { role: 'guest' },
                                        isAuthenticated: !!req.authenticatedUser,
                                        currentPage: 'users',
                                        searchKeyword: null,
                                        userRole: null,
                                        message: null,
                                        showWarning: false,
                                        warningData: null,
                                        showCaution: true,
                                        cautionData: {
                                            type: cautionType,
                                            message: messageTemplate,
                                            userId: userId,
                                            formData: req.body
                                        }
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(`Error checking ${role} associated data for update:`, error);
                            // Continue with update even if check fails
                        }
                    }
                    
                    // Check if role is changing from member to trainer and user has existing bookings (WARNING - Red)
                    try {
                        const currentUser = await UserModel.getById(userId);
                        if (currentUser && currentUser.role === 'member' && role === 'trainer') {
                            const existingBookingsForRoleChange = await BookingModel.getByMemberId(userId);
                            if (existingBookingsForRoleChange.length > 0) {
                                // Check if user has acknowledged the warning
                                if (req.body.acknowledgeRoleChange !== 'true') {
                                    // Instead of rendering status page, redirect back with warning data
                                    const user = await UserModel.getById(userId);
                                    const users = await UserModel.getAll();
                                    
                                    return res.render("users", {
                                        users,
                                        selectedUser: user,
                                        currentUser: req.authenticatedUser || { role: 'guest' },
                                        isAuthenticated: !!req.authenticatedUser,
                                        currentPage: 'users',
                                        searchKeyword: null,
                                        userRole: null,
                                        message: null,
                                        showWarning: true,
                                        warningData: {
                                            action: 'update',
                                            type: 'roleChange',
                                            message: `This user has ${existingBookingsForRoleChange.length} active training session booking(s). Changing from member to trainer role will automatically cancel and remove all their existing bookings to prevent scheduling conflicts.`,
                                            bookingCount: existingBookingsForRoleChange.length,
                                            userId: userId,
                                            formData: req.body
                                        },
                                        showCaution: false,
                                        cautionData: null
                                    });
                                } else {
                                    // User has acknowledged - remove all their bookings
                                    for (const booking of existingBookingsForRoleChange) {
                                        await BookingModel.delete(booking.id);
                                    }
                                    console.log(`Removed ${existingBookingsForRoleChange.length} booking(s) for user ${userId} during role change to trainer`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error checking role change bookings:", error);
                        // Continue with update even if check fails
                    }
                    
                    // Check if role is changing from trainer to member and user has associated sessions (WARNING - Red)
                    try {
                        const currentUser = await UserModel.getById(userId);
                        if (currentUser && currentUser.role === 'trainer' && role === 'member') {
                            const associatedSessionsForRoleChange = await SessionModel.getByTrainerId(userId);
                            if (associatedSessionsForRoleChange.length > 0) {
                                // Check if user has acknowledged the warning
                                if (req.body.acknowledgeTrainerRoleChange !== 'true') {
                                    // Instead of rendering status page, redirect back with warning data
                                    const user = await UserModel.getById(userId);
                                    const users = await UserModel.getAll();
                                    
                                    return res.render("users", {
                                        users,
                                        selectedUser: user,
                                        currentUser: req.authenticatedUser || { role: 'guest' },
                                        isAuthenticated: !!req.authenticatedUser,
                                        currentPage: 'users',
                                        searchKeyword: null,
                                        userRole: null,
                                        message: null,
                                        showWarning: true,
                                        warningData: {
                                            action: 'update',
                                            type: 'trainerRoleChange',
                                            message: `This trainer has ${associatedSessionsForRoleChange.length} active training session(s) and associated member bookings. Changing from trainer to member role will automatically cancel all their training sessions and remove all associated member bookings from the schedule.`,
                                            userId: userId,
                                            formData: req.body
                                        },
                                        showCaution: false,
                                        cautionData: null
                                    });
                                } else {
                                    // User has acknowledged - remove all their sessions (bookings will be auto-removed)
                                    for (const session of associatedSessionsForRoleChange) {
                                        await SessionModel.delete(session.id);
                                    }
                                    console.log(`Removed ${associatedSessionsForRoleChange.length} session(s) for user ${userId} during role change from trainer to member`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error checking trainer role change sessions:", error);
                        // Continue with update even if check fails
                    }
                    
                    // Create a copy of req.body and remove password if it's the placeholder
                    const updateData = { ...req.body };
                    if (updateData.password === '••••••••') {
                        delete updateData.password;
                        delete updateData.confirmPassword;
                    }
                    try {
                        await UserModel.update(userId, updateData);
                    } catch (updateError) {
                        console.error("Error updating user:", updateError);
                        
                        // Check for specific database errors
                        let errorMessage = `Failed to update user: ${updateError.message}. Please check your input and try again.`;
                        let errorStatus = "Update Failed";
                        let statusCode = 500;
                        
                        if (updateError.code === 'ER_DUP_ENTRY' || updateError.message.includes('Duplicate entry')) {
                            if (updateError.message.includes('email')) {
                                errorStatus = "Email Already Exists";
                                errorMessage = "The email address you entered is already registered with another user. Please use a different email address.";
                                statusCode = 400;
                            } else {
                                errorStatus = "Duplicate Information";
                                errorMessage = "The information you provided conflicts with an existing user. Please check your details and try again.";
                                statusCode = 400;
                            }
                        } else if (updateError.code === 'ER_BAD_NULL_ERROR' || updateError.message.includes('cannot be null')) {
                            errorStatus = "Missing Required Information";
                            errorMessage = "Some required information is missing. Please ensure all fields are filled out correctly and try again.";
                            statusCode = 400;
                        } else if (updateError.code === 'ER_DATA_TOO_LONG' || updateError.message.includes('Data too long')) {
                            errorStatus = "Invalid Input Length";
                            errorMessage = "One or more fields contain too much text. Please shorten your input and try again.";
                            statusCode = 400;
                        }
                        
                        return res.status(statusCode).render("status", {
                            status: errorStatus,
                            message: errorMessage,
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    res.redirect("/users?message=user_updated");
                    break;
                case 'delete':
                    if (!userId) {
                        return res.status(400).render("status", {
                            status: "Missing User ID",
                            message: "Cannot delete user: User ID is required to identify which user to delete.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Check if this is a trainer and has associated sessions
                    try {
                        const userToDelete = await UserModel.getById(userId);
                        if (userToDelete && userToDelete.role === 'trainer') {
                            const associatedSessionsForDelete = await SessionModel.getByTrainerId(userId);
                            if (associatedSessionsForDelete.length > 0) {
                                // Check if user has acknowledged the warning
                                if (req.body.acknowledgeTrainerRemoval !== 'true') {
                                    // Instead of rendering status page, redirect back with warning data
                                    const user = await UserModel.getById(userId);
                                    const users = await UserModel.getAll();
                                    
                                    return res.render("users", {
                                        users,
                                        selectedUser: user,
                                        currentUser: req.authenticatedUser || { role: 'guest' },
                                        isAuthenticated: !!req.authenticatedUser,
                                        currentPage: 'users',
                                        searchKeyword: null,
                                        userRole: null,
                                        message: null,
                                        showWarning: true,
                                        warningData: {
                                            action: 'delete',
                                            type: 'trainer',
                                            message: `This trainer has ${associatedSessionsForDelete.length} active training session(s) that will be automatically cancelled and removed from the schedule, along with all associated member bookings.`,
                                            
                                            userId: userId
                                        },
                                        showCaution: false,
                                        cautionData: null
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error checking trainer sessions:", error);
                        // Continue with deletion even if check fails
                    }
                    
                    // Check if this user has associated bookings (for any role)
                    try {
                        const associatedBookingsForDelete = await BookingModel.getByMemberId(userId);
                        if (associatedBookingsForDelete.length > 0) {
                            // Check if user has acknowledged the warning
                            if (req.body.acknowledgeMemberRemoval !== 'true') {
                                // Instead of rendering status page, redirect back with warning data
                                const user = await UserModel.getById(userId);
                                const users = await UserModel.getAll();
                                
                                return res.render("users", {
                                    users,
                                    selectedUser: user,
                                    currentUser: req.authenticatedUser || { role: 'guest' },
                                    isAuthenticated: !!req.authenticatedUser,
                                    currentPage: 'users',
                                    searchKeyword: null,
                                    userRole: null,
                                    message: null,
                                    showWarning: true,
                                    warningData: {
                                        action: 'delete',
                                        type: 'member',
                                        message: `This user has ${associatedBookingsForDelete.length} active training session booking(s) that will be automatically cancelled and removed from the system.`,
                                        bookingCount: associatedBookingsForDelete.length,
                                        userId: userId
                                    },
                                    showCaution: false,
                                    cautionData: null
                                });
                            }
                        }
                    } catch (error) {
                        console.error("Error checking member bookings:", error);
                        // Continue with deletion even if check fails
                    }

                    try {
                        await UserModel.delete(userId);
                    } catch (deleteError) {
                        console.error("Error deleting user:", deleteError);
                        return res.status(500).render("status", {
                            status: "Delete Failed",
                            message: `Failed to delete user: ${deleteError.message}. The user may have dependencies that prevent deletion.`,
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    res.redirect("/users?message=user_deleted");
                    break;
                default:
                    return res.status(400).render("status", {
                        status: "Invalid Action",
                        message: "The requested action is not supported. Please use 'create', 'update', or 'delete'.",
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

        } catch (error) {
            console.error("Error handling user action:", error);
            
            // Check for specific database errors
            let errorMessage = "An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.";
            let errorStatus = "Server Error";
            let statusCode = 500;
            
            if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
                if (error.message.includes('email')) {
                    errorStatus = "Email Already Exists";
                    errorMessage = "The email address you entered is already registered with another user. Please use a different email address.";
                    statusCode = 400;
                } else {
                    errorStatus = "Duplicate Information";
                    errorMessage = "The information you provided conflicts with an existing user. Please check your details and try again.";
                    statusCode = 400;
                }
            } else if (error.code === 'ER_BAD_NULL_ERROR' || error.message.includes('cannot be null')) {
                errorStatus = "Missing Required Information";
                errorMessage = "Some required information is missing. Please ensure all fields are filled out correctly and try again.";
                statusCode = 400;
            } else if (error.code === 'ER_DATA_TOO_LONG' || error.message.includes('Data too long')) {
                errorStatus = "Invalid Input Length";
                errorMessage = "One or more fields contain too much text. Please shorten your input and try again.";
                statusCode = 400;
            }
            
            res.status(statusCode).render("status", {
                status: errorStatus,
                message: errorMessage,
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Displays the registration page where users can input their details to register.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Renders register.ejs and sends HTML to the client.
     */
    static viewRegisterPage(req, res) {
        res.render("register", {
            isAuthenticated: !!req.authenticatedUser,
            currentUser: req.authenticatedUser,
            role: req.authenticatedUser?.role || "guest",
            currentPage: 'register'
        });  // Render the register.ejs page
    }

    /**
     * Handles user registration.
     * This method validates user inputs and creates a new user in the database if valid.
     * 
     * @param {Request} req - The request object containing the user data.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles user registration and redirects or renders status page.
     */
    static async register(req, res) {
        // console.log("Received request body:", req.body);  // Debugging
        try {
            const { email, password, confirmPassword, role, firstName, lastName } = req.body;

            // Validate that password and confirmPassword match
            if (password !== confirmPassword) {
                return res.status(400).render("status", {
                    status: "Password Mismatch",
                    message: "The password and confirm password fields do not match. Please ensure both fields contain the same password.",
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
            
            // Validate email
            const emailValidation = UserController.validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).render("status", {
                    status: emailValidation.status,
                    message: emailValidation.message,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            // Validate names
            const firstNameValidation = UserController.validateName(firstName, 'first name');
            if (!firstNameValidation.isValid) {
                return res.status(400).render("status", {
                    status: firstNameValidation.status,
                    message: firstNameValidation.message,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            const lastNameValidation = UserController.validateName(lastName, 'last name');
            if (!lastNameValidation.isValid) {
                return res.status(400).render("status", {
                    status: lastNameValidation.status,
                    message: lastNameValidation.message,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            // Validate password
            const passwordValidation = UserController.validatePassword(password, confirmPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).render("status", {
                    status: passwordValidation.status,
                    message: passwordValidation.message,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }

            // Create user after validation
            const newUser = await UserModel.create(req.body);

            // Successful registration message.
            return res.status(201).render("status", {
                status: "Registration Complete",
                message: `Welcome to High Street Gym, ${firstName} ${lastName}! Your account has been successfully created. You can now log in using your email address and password to access member features.`,
                currentUser: { role: 'guest' },
                isAuthenticated: false,
                redirectToHome: true
            });
                

        } catch (error) {
            console.error("❌ Error creating user:", error);
            
            // Check for specific database errors
            let errorMessage = "We encountered a technical issue while creating your account. Please try again in a few moments, or contact support if the problem persists.";
            let errorStatus = "Registration Failed";
            
            if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
                if (error.message.includes('email')) {
                    errorStatus = "Email Already Exists";
                    errorMessage = "The email address you entered is already registered with another account. Please use a different email address or try logging in if you already have an account.";
                } else {
                    errorStatus = "Duplicate Information";
                    errorMessage = "The information you provided conflicts with an existing account. Please check your details and try again.";
                }
            } else if (error.code === 'ER_BAD_NULL_ERROR' || error.message.includes('cannot be null')) {
                errorStatus = "Missing Required Information";
                errorMessage = "Some required information is missing. Please ensure all fields are filled out correctly and try again.";
            } else if (error.code === 'ER_DATA_TOO_LONG' || error.message.includes('Data too long')) {
                errorStatus = "Invalid Input Length";
                errorMessage = "One or more fields contain too much text. Please shorten your input and try again.";
            }
            
            return res.status(400).render("status", {
                status: errorStatus,
                message: errorMessage,
                currentUser: { role: 'guest' },
                isAuthenticated: false
            });
        }
    }

    // Validation methods as static methods within UserController
    static validateEmail(email) {
        if (!email || !validator.isEmail(email)) {
            return {
                isValid: false,
                status: "Invalid Email Format",
                message: "Please enter a valid email address in the format: username@domain.com (e.g., john.doe@example.com)."
            };
        }
        return { isValid: true };
    }

    /**
     * Validates name format
     * @param {string} name - Name to validate
     * @param {string} fieldName - Name of the field (for error messages)
     * @returns {Object} Validation result with isValid, status, and message
     */
    static validateName(name, fieldName) {
        if (!name || !/^[a-zA-Z][a-zA-Z0-9\-\'\ ,]{0,}$/.test(name)) {
            return {
                isValid: false,
                status: "Invalid Name Format",
                message: `Please enter a valid ${fieldName} using only letters, numbers, spaces, hyphens, apostrophes, and commas. The name must start with a letter and cannot have leading or trailing spaces.`
            };
        }
        return { isValid: true };
    }

    /**
     * Validates password and confirmation
     * @param {string} password - Password to validate
     * @param {string} confirmPassword - Password confirmation
     * @returns {Object} Validation result with isValid, status, and message
     */
    static validatePassword(password, confirmPassword) {
        // Development version - simple length check
        if (password.length < 4) {
            return {
                isValid: false,
                status: "Password Too Short",
                message: "Your password must be at least 4 characters long for security purposes. Please choose a longer password."
            };
        }

        // TODO: Production version (commented for development)
        // Uncomment this section for production password requirements:
        // if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/.test(password)) {
        //     return {
        //         isValid: false,
        //         status: "Password Requirements Not Met",
        //         message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        //     };
        // }
        
        if (password !== confirmPassword) {
            return {
                isValid: false,
                status: "Password Mismatch",
                message: "The password and confirm password fields do not match. Please ensure both fields contain the same password."
            };
        }
        
        return { isValid: true };
    }
}