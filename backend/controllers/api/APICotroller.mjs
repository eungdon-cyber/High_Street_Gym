import express from "express"
import swaggerUI from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import * as APIValidator from "express-openapi-validator";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { APIAuthenticationController } from "./APIAuthenticationController.mjs";
import { APIUserController } from "./APIUserController.mjs";
import { APIBlogController } from "./APIBlogConroller.mjs";
import { APISessionController } from "./APISessionController.mjs";
import { APIBookingController } from "./APIBookingController.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load components from YAML file
let componentsFromFile = {};
try {
    const componentsPath = path.join(__dirname, "../../components.yaml");
    const componentsFile = fs.readFileSync(componentsPath, "utf8");
    const componentsData = yaml.load(componentsFile);
    componentsFromFile = componentsData.components || {};
} catch (error) {
    console.warn("Warning: Could not load components.yaml:", error.message);
}

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "High Street Gym API",
            version: "1.0.0",
            description: "JSON REST API for interacting with the High Street Gym Backend"
        },
        servers: [
            {
                url: "http://localhost:8080/api",
                description: "Local development server"
            }
        ],
        components: {
            securitySchemes: {
                apiKey: {
                    type: "apiKey",
                    in: "header",
                    name: "x-auth-key",
                    description: "API key for authentication"
                }
            },
            schemas: {
                ...(componentsFromFile.schemas || {})
            },
            responses: {
                ...(componentsFromFile.responses || {})
            }
        },
    },
    apis: ["./controllers/**/*.{js,mjs,yaml}"],
};
const specifications = swaggerJsdoc(options);

export class APIController {
    static routes = express.Router();
    
    static {
        /**
         * @openapi
         * /docs:
         *   get:
         *     summary: "View automatically generated API documentation"
         *     tags: [Documentation]
         *     description: "Returns the Swagger UI documentation interface"
         *     responses:
         *       200:
         *         description: "Swagger UI HTML documentation page"
         *         content:
         *           text/html:
         *             schema:
         *               type: string
         *               description: "HTML page containing the interactive API documentation"
         */
        this.routes.use("/docs", swaggerUI.serve, swaggerUI.setup(specifications))

        
        // Setup OpenAPI specification validation middleware
        this.routes.use(APIValidator.middleware({
            apiSpec: specifications,
            validateRequests: true,
            validateResponses: true,
        }))

        // Setup error response for OpenAPI specification validation middleware
        this.routes.use((err, req, res, next) => {
            // format error
            res.status(err.status || 500).json({
                status: err.status,
                message: err.message,
                errors: err.errors,
            })
        })

        // API authentication middleware and endpoints
        this.routes.use(APIAuthenticationController.middleware)
        this.routes.use(APIAuthenticationController.routes)

        // API controllers
        this.routes.use("/users", APIUserController.routes);
        this.routes.use("/blogs", APIBlogController.routes);
        this.routes.use("/sessions", APISessionController.routes);
        this.routes.use("/bookings", APIBookingController.routes);
    }
}