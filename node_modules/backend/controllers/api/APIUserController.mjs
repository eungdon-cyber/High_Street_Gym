import express from "express";
import { UserModel } from "../../models/UserModel.mjs";
import bcrypt from "bcryptjs";
import { APIAuthenticationController } from "./APIAuthenticationController.mjs";

export class APIUserController {
    static routes = express.Router();
    static {
        // Public routes (no authentication required)
        this.routes.post("/register", this.register);
        
        // Protected routes (authentication required)
        this.routes.get(
            "/self", 
            APIAuthenticationController.restrict("any"), 
            this.getAuthenticatedUser
        );
        this.routes.put(
            "/self",
            APIAuthenticationController.restrict("any"),
            this.updateAuthenticatedUser
        );
        this.routes.patch(
            "/self",
            APIAuthenticationController.restrict("any"),
            this.updateAuthenticatedUser
        );
    }

    /**
     * @openapi
     * /users/register:
     *   post:
     *     summary: "Register a new user"
     *     tags: [Users]
     *     description: "Create a new user account with email, password, first name, and last name"
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         $ref: '#/components/responses/RegisterSuccess'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async register(req, res) {
        try {
            const { email, password, firstName, lastName } = req.body;
            
            if (!email || !password || !firstName || !lastName) {
                return res.status(400).json({
                    message: "Email, password, first name, and last name are required"
                });
            }

            // Check if user already exists
            try {
                await UserModel.getByEmail(email);
                return res.status(400).json({
                    message: "User with this email already exists"
                });
            } catch (error) {
                // User doesn't exist, continue with registration
            }

            // Create new user (password will be hashed by UserModel.create)
            const newUser = {
                email,
                password, // UserModel.create will hash this
                firstName: firstName, // Match UserModel.create parameter names
                lastName: lastName,
                role: 'member' // Default role
            };

            const user = await UserModel.create(newUser);
            
            res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user.insertId,
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    role: newUser.role
                }
            });
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({
                message: "Failed to register user"
            });
        }
    }

    /**
     * @openapi
     * /users/self:
     *   get:
     *     summary: "Get current authenticated user"
     *     tags: [Users]
     *     description: "Returns information about the currently authenticated user"
     *     security:
     *       - apiKey: []
     *     responses:
     *       200:
     *         $ref: '#/components/responses/UserResponse'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async getAuthenticatedUser(req, res) {
        try {
            // Return safe user fields, including ID for frontend use
            // Note: ID exposure is acceptable here since user is authenticated and viewing their own data
            const safeUser = {
                id: req.authenticatedUser.id,
                email: req.authenticatedUser.email,
                firstName: req.authenticatedUser.firstName,
                lastName: req.authenticatedUser.lastName,
                role: req.authenticatedUser.role
            };
            res.status(200).json(safeUser);
        } catch (error) {
            console.error("Error fetching authenticated user:", error);
            res.status(500).json({
                message: "Failed to retrieve user"
            });
        }
    }

    /**
     * @openapi
     * /users/self:
     *   put:
     *     summary: "Update current authenticated user details"
     *     tags: [Users]
     *     description: "Update personal details (first name, last name, and optionally password) for the authenticated user. Email cannot be changed - users must register a new account or contact an admin. Note: Replace example values with your actual current or new values. Only include fields you want to update (partial updates are supported). IMPORTANT: Ensure valid JSON format - no trailing commas. Examples: {\"firstName\": \"John\"} or {\"firstName\": \"John\", \"lastName\": \"Doe\"}"
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateUserRequest'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/UserUpdated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     *   patch:
     *     summary: "Partially update current authenticated user details"
     *     tags: [Users]
     *     description: "Partially update personal details (first name, last name, and optionally password) for the authenticated user. Email cannot be changed - users must register a new account or contact an admin. Only include fields you want to update. IMPORTANT: Ensure valid JSON format - no trailing commas. Examples: {\"firstName\": \"John\"} or {\"firstName\": \"John\", \"lastName\": \"Doe\"}"
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateUserRequest'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/UserUpdated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async updateAuthenticatedUser(req, res) {
        try {
            const { firstName, lastName, password } = req.body;
            
            if (!req.authenticatedUser) {
                return res.status(401).json({
                    message: "Not authenticated"
                });
            }

            // Validate that at least one field is provided
            if (!firstName && !lastName && !password) {
                return res.status(400).json({
                    message: "At least one field (firstName, lastName, or password) must be provided"
                });
            }

            // Reject email if provided (email cannot be changed)
            if (req.body.email) {
                return res.status(400).json({
                    message: "Email cannot be changed. Please register a new account or contact an administrator."
                });
            }

            // Get the current user from database to ensure we have the latest data
            const currentUser = await UserModel.getById(req.authenticatedUser.id);

            // Build update object - only include fields that are provided
            // If password changes, invalidate the current authentication key for security
            const updatedUser = new UserModel(
                currentUser.id,
                currentUser.email, // Email cannot be changed
                password ? password : currentUser.password, // Will be hashed if password is provided
                currentUser.role, // Role cannot be changed by user
                firstName || currentUser.firstName,
                lastName || currentUser.lastName,
                currentUser.deleted,
                password ? null : currentUser.authenticationKey // Invalidate key if password changes
            );

            // Hash password if it was provided
            if (password) {
                const saltRounds = 10;
                updatedUser.password = await bcrypt.hash(password, saltRounds);
            }

            // Update the user in the database
            await UserModel.update(updatedUser);

            // Fetch updated user to return fresh data
            const updatedUserFromDb = await UserModel.getById(currentUser.id);

            // Return only safe user fields, excluding ID for privacy/security
            // ID is not exposed - backend identifies user via API key
            const safeUser = {
                email: updatedUserFromDb.email,
                firstName: updatedUserFromDb.firstName,
                lastName: updatedUserFromDb.lastName,
                role: updatedUserFromDb.role
            };

            // If password was changed, include a message that the user needs to log in again
            if (password) {
                res.status(200).json({
                    ...safeUser,
                    message: "Password updated. Please log in again with your new password."
                });
            } else {
                res.status(200).json(safeUser);
            }
        } catch (error) {
            console.error("Update user error:", error);
            res.status(500).json({
                message: "Failed to update user details"
            });
        }
    }
}
