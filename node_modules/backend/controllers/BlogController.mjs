import express from "express";
import {BlogModel} from "../models/BlogModel.mjs"; 
import {BlogUserModel} from "../models/BlogUserModel.mjs"; 
import {AuthenticationController} from "./AuthenticationController.mjs";

export class BlogController {
    static routes = express.Router();

    static {
        // ✅ View all blogs
        this.routes.get("/", this.viewAllBlogs);

        // ✅ View a single blog post
        this.routes.get("/:id", this.viewBlogById);

        // ✅ Unified form handling for create and delete (CR_D - no update)
        this.routes.post(
            "/",
            AuthenticationController.restrict(["member", "trainer", "admin"]),
            this.handleBlogAction
        );

        this.routes.post(
            "/:id",
            AuthenticationController.restrict(["member", "trainer", "admin"]),
            this.handleBlogAction
        );
    }

    /**
     * View all blog posts.
     * 
     * This method fetches all the blog posts using `BlogUserModel.getAll()` and renders the 'blog.ejs' template.
     * The template receives all the blog posts and an empty `selectedBlog` for displaying all blogs.
     * 
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Renders blog.ejs and sends HTML to the client.
     */
    static async viewAllBlogs(req, res) {
        try {
            const searchKeyword = req.query.searchKeyword || null;
            let searchAuthor = req.query.searchAuthor || null;
            const myPosts = req.query.myPosts === 'true';
            const message = req.query.message || null;
            let blogs = await BlogUserModel.getAll();
            
            // If "My Posts" is requested and user is logged in, auto-fill author search
            if (myPosts && req.authenticatedUser) {
                searchAuthor = `${req.authenticatedUser.firstName} ${req.authenticatedUser.lastName}`;
            }
            
            // Apply keyword filter if provided
            if (searchKeyword) {
                blogs = blogs.filter(blog => 
                    blog.blog.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                    blog.blog.content.toLowerCase().includes(searchKeyword.toLowerCase())
                );
            }
            
            // Apply author filter if provided
            if (searchAuthor) {
                blogs = blogs.filter(blog => {
                    const authorName = `${blog.user.firstName} ${blog.user.lastName}`.toLowerCase();
                    return authorName.includes(searchAuthor.toLowerCase());
                });
            }
            
            res.render("blog.ejs", { 
                blogs, 
                selectedBlog: null, 
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser,
                currentPage: 'blogs',
                searchKeyword: searchKeyword, // Pass the filter value back to the view
                searchAuthor: searchAuthor, // Pass the author filter value back to the view
                myPosts: myPosts, // Pass the "My Posts" state back to the view
                message: message
            });
        } catch (error) {
            res.render("status.ejs", { 
                status: "Blog Loading Failed", 
                message: "Unable to load blog posts. Please try refreshing the page or contact support if the problem persists.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * View a single blog post by ID.
     * 
     * This method retrieves the blog post by ID using `BlogUserModel.getById()` and renders the 'blog.ejs' template with the selected blog post.
     * 
     * @param {Request} req - The request object containing the blog ID in `req.params.id`.
     * @param {Response} res - The response object.
     * @returns {void} No return value since this method sends an HTTP response. Renders blog.ejs and sends HTML to the client.
     */
    static async viewBlogById(req, res) {
        try {
            const blogs = await BlogUserModel.getAll();
            const selectedBlog = await BlogUserModel.getById(req.params.id);
    
            if (!selectedBlog) {
                return res.render("status.ejs", { 
                    status: "Blog Post Not Found",
                    message: `No blog post found with ID: ${req.params.id}. The blog may have been deleted or the ID may be incorrect.`,
                    currentUser: req.authenticatedUser || { role: 'guest' },
                    isAuthenticated: !!req.authenticatedUser
                });
            }
    
            // console.log("🔍 Current User:", req.authenticatedUser);    // Debugging

            res.render("blog", {
                blogs: blogs,
                selectedBlog: selectedBlog,
                currentUser: req.authenticatedUser || { role: 'guest' }, // Make sure currentUser is passed to the view
                isAuthenticated: !!req.authenticatedUser,
                currentPage: 'blogs',
                searchKeyword: null, // Add this to prevent the ReferenceError
                searchAuthor: null, // Add this to prevent the ReferenceError
                myPosts: false, // Add this to prevent the ReferenceError
                message: null
            });
        } catch (error) {
            console.error("Error fetching blog:", error);
            res.render("status.ejs", { 
                status: "Blog Post Loading Failed", 
                message: "Unable to load the requested blog post. Please try again or contact support if the problem persists.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

    /**
     * Unified handler for create and delete actions (CR_D - no update).
     * This method handles all form submissions based on the action parameter.
     * 
     * @param {Request} req - The request object containing the client input data.
     * @param {Response} res - The response object used to send a response back to the client.
     * @returns {Promise<void>} No return value since this method sends an HTTP response. Handles blog creation/deletion and redirects or renders status page.
     */
    static async handleBlogAction(req, res) {
        try {
            const { title, content, action } = req.body;
            const blogId = req.params.id;
            const userId = req.authenticatedUser.id;
            const userRole = req.authenticatedUser.role;

            switch (action) {
                case 'create':
                    // Additional safety check - ensure only authenticated users can create blogs
                    if (!req.authenticatedUser || req.authenticatedUser.role === 'guest') {
                        return res.status(401).render("status.ejs", { 
                            status: "Authentication Required", 
                            message: "You must be logged in to create a blog post. Please log in and try again.",
                            currentUser: { role: 'guest' },
                            isAuthenticated: false
                        });
                    }
                    
                    if (!title || !content) {
                        return res.status(400).render("status", {
                            status: "Missing Required Fields",
                            message: "Both title and content are required to create a blog post. Please fill in all fields and try again.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    // Validate Blog Title
                    if (!/^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(title)) {
                        return res.status(400).render("status", {
                            status: "Invalid Blog Title",
                            message: "Please enter a valid blog title (must start with a letter or number, can contain letters, numbers, dashes, apostrophes, spaces, and common punctuation).",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }
                    
                    // Validate Blog Content
                    if (!/^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/.test(content)) {
                        return res.status(400).render("status", {
                            status: "Invalid Blog Content",
                            message: "Please enter valid content (must start with a letter or number and contain meaningful text).",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    await BlogModel.create(title, content, userId);
                    res.redirect("/blogs?message=blog_created");
                    break;

                case 'delete':
                    if (!blogId) {
                        return res.status(400).render("status", {
                            status: "Missing Blog ID",
                            message: "Cannot delete blog post: Blog ID is required to identify which blog post to delete.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    const blog = await BlogModel.getById(blogId);
                    if (!blog) {
                        return res.render("status.ejs", { 
                            status: "Blog Post Not Found",
                            message: `No blog post found with ID: ${blogId}. The blog may have been deleted or the ID may be incorrect.`,
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    if (userRole !== "admin" && blog.authorId !== userId) {
                        return res.render("status.ejs", { 
                            status: "Delete Permission Denied",
                            message: "You can only delete your own blog posts. Only the author or an administrator can delete this blog post.",
                            currentUser: req.authenticatedUser || { role: 'guest' },
                            isAuthenticated: !!req.authenticatedUser
                        });
                    }

                    await BlogModel.delete(blogId);
                    res.redirect("/blogs?message=blog_deleted");
                    break;

                default:
                    return res.status(400).render("status", {
                        status: "Invalid Action",
                        message: "The requested action is not supported. Please use 'create' or 'delete'.",
                        currentUser: req.authenticatedUser || { role: 'guest' },
                        isAuthenticated: !!req.authenticatedUser
                    });
            }

            // Remove the generic redirect since each case now handles its own redirect
            // res.redirect("/blogs");
        } catch (error) {
            console.error("Error handling blog action:", error);
            res.status(500).render("status", {
                status: "Server Error",
                message: "An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.",
                currentUser: req.authenticatedUser || { role: 'guest' },
                isAuthenticated: !!req.authenticatedUser
            });
        }
    }

}
