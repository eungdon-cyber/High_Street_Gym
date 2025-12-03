import swaggerJsdoc from "swagger-jsdoc";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load components from YAML file
let componentsFromFile = {};
try {
    const componentsPath = path.join(__dirname, "components.yaml");
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

// Generate the OpenAPI specification
const specifications = swaggerJsdoc(options);

// Ensure doc directory exists for outputs
const docDir = path.join(__dirname, "doc");
if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
}

// Export as JSON
const jsonPath = path.join(docDir, "openapi.json");
fs.writeFileSync(jsonPath, JSON.stringify(specifications, null, 2), "utf8");
console.log(`✅ OpenAPI specification exported to: ${jsonPath}`);

// Export as YAML
const yamlPath = path.join(docDir, "openapi.yaml");
fs.writeFileSync(yamlPath, yaml.dump(specifications, { indent: 2 }), "utf8");
console.log(`✅ OpenAPI specification exported to: ${yamlPath}`);

console.log("\n📄 OpenAPI specification files created successfully!");
console.log("   - openapi.json (JSON format)");
console.log("   - openapi.yaml (YAML format)");

