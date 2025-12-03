import express from "express";
import session from "express-session";
import { UserModel } from "../models/UserModel.mjs";
import { ActivityModel } from "../models/ActivityModel.mjs";
import { LocationModel } from "../models/LocationModel.mjs";
import { SessionModel } from "../models/SessionModel.mjs";
import { BookingModel } from "../models/BookingModel.mjs";
import { BlogModel } from "../models/BlogModel.mjs";
import { SessionActivityLocationUserModel } from "../models/SessionActivityLocationUserModel.mjs";
import { BookingSessionActivityLocationUserModel } from "../models/BookingSessionActivityLocationUserModel.mjs";
import bcrypt from "bcrypt"
import validator from "validator"

export class AuthenticationController {
    static middleware = express.Router();
    static routes = express.Router();

    static {
        // ✅ Enable session-based authentication
        this.middleware.use(
            session({
                secret: "secureSecretKey123", // Change in production
                resave: false,
                saveUninitialized: false,
                cookie: { secure: false }, // Set to true in production with HTTPS
            })
        );

        // ✅ Session authentication middleware
        this.middleware.use(this.#session_authentication);

        // ✅ Routes Definition
        // Render the login page
        this.routes.get(
            "/login", 
            this.viewLogin
        );

        // Render the login page
        this.routes.get(
            "/profile", 
            this.viewProfile
        );

        // Check the Login Form Authentication  
        this.routes.post(
            "/login", 
            this.login
        );
  
        // Logout
        this.routes.get(
            "/logout", 
            this.logout
        );
                  
    }

    /**
     * Session authentication middleware.
     * Automatically loads user data from session into req.authenticatedUser.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @param {Function} next - The next middleware function.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Middleware function that loads user data from session.
     */
    static async #session_authentication(req, res, next) {
        if (req.session.userId && !req.authenticatedUser) {
            try {
                req.authenticatedUser = await UserModel.getById(req.session.userId);
            } catch (error) {
                console.error("Session authentication error:", error);
            }
        }
        next();
    }

    /**
     * Renders the login page.
     * This method serves the login page (login.ejs) for the user to input their credentials.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Renders login.ejs and sends HTML to the client.
     */
    static viewLogin(req, res) {
        res.render("login.ejs", {
            isAuthenticated: !!req.authenticatedUser,
            currentUser: req.authenticatedUser,
            role: req.authenticatedUser?.role || "guest",
            currentPage: 'login'
        });
    }

    /**
     * Renders the profile page for the logged-in user.
     * If no user is logged in, redirects to the login page.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Renders profile.ejs and sends HTML to the client.
     */
    static async viewProfile(req, res) {
        if (!req.authenticatedUser) {
            return res.redirect('/authenticate/login'); // If no user, redirect to login page
        }
        
        const profileData = { 
            isAuthenticated: true,
            currentUser: req.authenticatedUser,
            role: req.authenticatedUser.role || "guest",
            currentPage: 'profile'
        };
        
        // Add statistics for admin users
        if (req.authenticatedUser.role === 'admin') {
            try {
                const [activities, locations, sessions, bookings, users, blogs] = await Promise.all([
                    ActivityModel.getAll(),
                    LocationModel.getAll(),
                    SessionModel.getAll(),
                    BookingModel.getAll(),
                    UserModel.getAll(),
                    BlogModel.getAll()
                ]);
                
                profileData.statistics = {
                    activities: activities.length,
                    locations: locations.length,
                    sessions: sessions.length,
                    bookings: bookings.length,
                    users: users.length,
                    blogs: blogs.length
                };
            } catch (error) {
                console.error("Error fetching statistics:", error);
                profileData.statistics = {
                    activities: 0,
                    locations: 0,
                    sessions: 0,
                    bookings: 0,
                    users: 0,
                    blogs: 0
                };
            }
        }
        
        // Add upcoming sessions for trainer users
        if (req.authenticatedUser.role === 'trainer') {
            try {
                const allSessions = await SessionActivityLocationUserModel.getAll();
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                
                // Filter sessions for this trainer and future dates only
                const trainerSessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.session.sessionDate);
                    sessionDate.setHours(0, 0, 0, 0);
                    return session.user.id === req.authenticatedUser.id && sessionDate >= currentDate;
                });
                
                // Sort by date and take first 2
                trainerSessions.sort((a, b) => {
                    const dateA = new Date(a.session.sessionDate);
                    const dateB = new Date(b.session.sessionDate);
                    return dateA - dateB;
                });
                
                profileData.upcomingSessions = trainerSessions.slice(0, 2);
            } catch (error) {
                console.error("Error fetching trainer sessions:", error);
                profileData.upcomingSessions = [];
            }
        } else {
            // Always pass empty array for non-trainers
            profileData.upcomingSessions = [];
        }
        
        // Add upcoming bookings for member users
        if (req.authenticatedUser.role === 'member') {
            try {
                const allBookings = await BookingSessionActivityLocationUserModel.getAll();
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                
                // Filter bookings for this member and future dates only
                const memberBookings = allBookings.filter(booking => {
                    const sessionDate = new Date(booking.session.sessionDate);
                    sessionDate.setHours(0, 0, 0, 0);
                    return booking.user.id === req.authenticatedUser.id && sessionDate >= currentDate;
                });
                
                // Sort by date and take first 2
                memberBookings.sort((a, b) => {
                    const dateA = new Date(a.session.sessionDate);
                    const dateB = new Date(b.session.sessionDate);
                    return dateA - dateB;
                });
                
                profileData.upcomingBookings = memberBookings.slice(0, 2);
            } catch (error) {
                console.error("Error fetching member bookings:", error);
                profileData.upcomingBookings = [];
            }
        } else {
            // Always pass empty array for non-members
            profileData.upcomingBookings = [];
        }
        
        res.render("profile", profileData);
    }

    /**
     * Handles user login logic.
     * This method checks the credentials provided by the user and verifies them against the database.
     * If successful, the user is logged in and redirected to the profile page.
     * 
     * @param {Request} req - The request object containing the user input (email, password).
     * @param {Response} res - The response object.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles login authentication and redirects or renders status page.
     */
    static async login(req, res) {
        const contentType = req.get("Content-Type");
        const { email, password } = req.body;

        // Handle form-based authentication (web browser)
        if (contentType === "application/x-www-form-urlencoded") {
            try {
                const user = await UserModel.getByEmail(email);
                // console.log("User Input", user);

                const isPasswordCorrect = await bcrypt.compare(password, user.password);
                // console.log("Password Check: ", isPasswordCorrect);
                
                if (isPasswordCorrect) {
                    req.session.userId = user.id;
                    // console.log("Verified User ID: ", req.session.userId);
                    return res.redirect('/authenticate/profile');
                } else {
                    return res.status(401).render("status.ejs", {
                    status: "Login Failed",
                    message: "The email address or password you entered is incorrect. Please check your credentials and try again.",
                    currentUser: { role: 'guest' },
                    isAuthenticated: false
                });
                }
            } catch (error) {
                console.error("Login error:", error);
                return res.status(401).render("status.ejs", {
                    status: "Authentication Failed",
                    message: "Invalid Credentials",
                    currentUser: { role: 'guest' },
                    isAuthenticated: false
                });
            }
        }
        
        // Handle JSON-based authentication (API, mobile app, AJAX)
        else if (contentType === "application/json") {
            // TODO: Implement JSON-based authentication for future API/mobile support
            // For now, fall through to unsupported content type handler
        }
        
        // Handle unsupported content types
        else {
            return res.status(400).render("status.ejs", {
                status: "Bad Request",
                message: "Unsupported content type. Use application/x-www-form-urlencoded or application/json"
            });
        }
    }

    /**
     * Logs the user out by destroying the session.
     * After logging out, the user is redirected to the homepage.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Destroys user session and redirects to homepage.
     */
    static logout(req, res) {
        try {
            // Always attempt to destroy the session if it exists
            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Session destruction error:", err);
                        return res.status(500).render("status.ejs", {
                            status: "Logout Error",
                            message: "There was a problem ending your session. Please try logging out again or close your browser to ensure you are fully logged out."
                        });
                    }
                    
                    // Clear the session cookie
                    res.clearCookie('connect.sid');
                    
                    // Redirect to home page with success message
                    return res.redirect('/?message=logged_out');
                });
            } else {
                // No session to destroy, just redirect to home page
                return res.redirect('/?message=logged_out');
            }
        } catch (error) {
            console.error("Logout error:", error);
            res.status(500).render("status.ejs", {
                status: "Error",
                message: "Error during logout. Please try again.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Middleware: Restricts access based on user roles.
     * This method checks whether the current user has one of the allowed roles. 
     * If not, it blocks access to the route and sends an error.
     * 
     * @param {string[]} allowedRoles - The list of roles allowed to access the route.
     * @returns {Function} - Returns middleware function for route protection.
     */
    static restrict(allowedRoles) {
        return function (req, res, next) {
            if (req.authenticatedUser) {
                if (allowedRoles.includes(req.authenticatedUser.role)) {
                    next()
                } else {
                    res.status(403).render("status.ejs", {
                        status: "Access Restricted",
                        message: `Your current role (${req.authenticatedUser.role}) does not have permission to access this page. Please contact an administrator if you believe this is an error.`,
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    })
                }
            } else {
                res.status(401).render("status.ejs", {
                    status: "Login Required",
                    message: "You must be logged in to access this page. Please sign in with your account credentials to continue.",
                    currentUser: { role: 'guest' },
                    isAuthenticated: false
                })
            }
        }
      }

    /**
     * Renders the Registration Page.
     * This method displays the registration page where users can input their details to register.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Renders register.ejs and sends HTML to the client.
     */
    static viewRegisterPage(req, res) {
        res.render("register", {
            isAuthenticated: !!req.authenticatedUser,
            currentUser: req.authenticatedUser,
            role: req.authenticatedUser?.role || "guest"
        });  // Render the register.ejs page
    }


}
