import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import { AuthenticationController } from "./controllers/AuthenticationController.mjs";
import { BlogController } from "./controllers/BlogController.mjs";
import { LocationController } from "./controllers/LocationController.mjs"; // ✅ Added LocationController
import { ActivityController} from "./controllers/ActivityController.mjs";
import { UserController } from "./controllers/UserController.mjs";
import { SessionController } from "./controllers/SessionController.mjs"; // ✅ Added ClassController
import { BookingController } from "./controllers/BookingController.mjs";
import { APIController } from "./controllers/api/APICotroller.mjs";


// Create Express app instance
const app = express();
const port = 8080;

// Enable cross-origin resources sharing (CORS) and preflight OPTIONS requests
app.use(cors({
    origin: true, // Allow all origins
})); 

// ✅ Register authentication middleware (Sessions handled inside AuthenticationController)
app.use(AuthenticationController.middleware);

// ✅ Set up EJS templating
app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));

// ✅ Middleware for JSON & form handling
app.use(express.json());
// app.use(bodyParser.json());  // ✅ Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Routes Registrations
app.use("/authenticate", AuthenticationController.routes);  // ✅ Authentication routes
app.use("/blogs", BlogController.routes);                  // ✅ Blog routes
app.use("/locations", LocationController.routes);            // ✅ Location routes
app.use("/activities", ActivityController.routes);          // ✅ Activity routes
app.use("/users", UserController.routes);          // ✅ Trainer routes
app.use("/sessions", SessionController.routes);  // ✅ Class routes for handling class-related actions
app.use("/bookings", BookingController.routes);          // ✅ Trainer routes
app.use("/api", APIController.routes)                   // ✅ API routes

// ✅ Default route (Home page)
app.get("/", (req, res) => {
    const message = req.query.message;
    res.render("home", { 
        isAuthenticated: !!req.authenticatedUser,
        currentUser: req.authenticatedUser,
        message: message,
        currentPage: 'home'
    });
});

// ✅ Serve static files
app.use(express.static(path.join(import.meta.dirname, "public")));

// ✅ Start server
app.listen(port, () => {
    console.log("Backend started on http://localhost:" + port);
});
