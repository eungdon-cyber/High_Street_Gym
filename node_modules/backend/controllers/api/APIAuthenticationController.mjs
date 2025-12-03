import express from "express";
import crypto from "crypto";
import { UserModel } from "../../models/UserModel.mjs";
import bcrypt from "bcryptjs";

export class APIAuthenticationController {
    static middleware = express.Router();
    static routes = express.Router();

    static {
        // Setup API Authentication Provider
        this.middleware.use(this.#APIAuthenticationProvider);
        this.routes.post("/login", this.login);
        this.routes.delete("/logout", this.logout);
    }

    /**
     * This middleware checks the for the API key header and
     * loads the respective user into req.authenticatedUser if found.
     * 
     * @private
     * @type {express.RequestHandler}
     */
    static async #APIAuthenticationProvider(req, res, next) {
        const authenticationKey = req.headers["x-auth-key"];
        if (authenticationKey) {
            try {
                req.authenticatedUser = await UserModel.getByAuthenticationKey(authenticationKey);
            } catch (error) {
                if (error == "not found") {
                    res.status(404).json({
                        message: "Failed to authenticate - key not found"
                    });
                } else {
                    res.status(500).json({
                        message: "Failed to authenticated - database error"
                    });
                }
                // Early return here so that next() doesn't run when there was an error
                return;
            }
        }
        next();
    }

    /**
     * @openapi
     * /login:
     *   post:
     *     summary: "Authenticate user and get API key"
     *     tags: [Authentication]
     *     description: "Login with email and password to receive an API key for authenticated requests"
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/LoginSuccess'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    message: "Email and password are required"
                });
            }

            let user;
            try {
                user = await UserModel.getByEmail(email);
            } catch (error) {
                // User not found - return invalid credentials for security
                return res.status(400).json({
                    message: "Invalid credentials"
                });
            }
            
            if (await bcrypt.compare(password, user.password)) {
                // Generate a cryptographically secure and random UUID for use as the authentication key
                const authenticationKey = crypto.randomUUID();

                // Store the authenticated user's authentication key into the database
                user.authenticationKey = authenticationKey;
                await UserModel.update(user);

                res.status(200).json({
                    key: authenticationKey,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role
                    }
                });
            } else {
                res.status(400).json({
                    message: "Invalid credentials"
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            res.status(500).json({
                message: "Failed to authenticate user",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }


    /**
     * @openapi
     * /logout:
     *   delete:
     *     summary: "Deauthenticate user"
     *     tags: [Authentication]
     *     description: "Invalidate the current API authentication key"
     *     security:
     *       - apiKey: []
     *     responses:
     *       200:
     *         $ref: '#/components/responses/SuccessMessage'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async logout(req, res) {
        try {
            if (req.authenticatedUser) {
                // Clear authentication key
                const user = await UserModel.getByAuthenticationKey(req.authenticatedUser.authenticationKey);
                user.authenticationKey = null;
                await UserModel.update(user);
                
                res.status(200).json({
                    message: "Logout successful"
                });
            } else {
                res.status(401).json({
                    message: "Not authenticated"
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
            res.status(500).json({ 
                message: "Failed to logout" 
            });
        }
    }

    /**
     * Creates a middleware function that restricts access based on user roles.
     * @param {Array<"admin" | "trainer" | "member"> | "any"} allowedRoles - Array of allowed roles or "any" for any authenticated user.
     * @returns {express.RequestHandler} Middleware function that checks user roles.
     */
    static restrict(allowedRoles) {
        return function (req, res, next) {
            if (req.authenticatedUser) {
                if (allowedRoles == "any" || allowedRoles.includes(req.authenticatedUser.role)) {
                    next();
                } else {
                    res.status(403).json({
                        message: "Access forbidden",
                        errors: ["Role does not have access to the requested resource."]
                    });
                }
            } else {
                res.status(401).json({
                    message: "Not authenticated",
                    errors: ["Please authenticate to access the requested resource."]
                });
            }
        };
    }
}