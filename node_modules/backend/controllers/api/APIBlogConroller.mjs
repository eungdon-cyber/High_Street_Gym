import express from "express";
import { BlogModel } from "../../models/BlogModel.mjs";
import { APIAuthenticationController } from "./APIAuthenticationController.mjs";

export class APIBlogController {
    static routes = express.Router();

    static {
        this.routes.get("/", this.viewAllBlogs);
        this.routes.get("/:id", this.viewBlogById);
        this.routes.post("/", APIAuthenticationController.restrict("any"), this.createBlog);
        this.routes.delete("/:id", APIAuthenticationController.restrict("any"), this.deleteBlog);
    }
    /**
     * @openapi
     * /blogs:
     *   get:
     *     summary: "Get all blog posts"
     *     tags: [Blogs]
     *     description: "Retrieve a list of all blog posts"
     *     parameters:
     *       - name: filter
     *         in: query
     *         description: Search filter on blog titles and content
     *         required: false
     *         schema:
     *           type: string
     *         example: fitness
     *     responses:
     *       200:
     *         $ref: '#/components/responses/BlogsList'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewAllBlogs(req, res) {
        try {
            const blogs = req.query.filter 
                ? await BlogModel.getBySearch(req.query.filter) 
                : await BlogModel.getAll();
            res.status(200).json(blogs);
        } catch (error) {
            console.error("Error fetching all blogs:", error);
            res.status(500).json({ message: "Failed to retrieve blogs" });
        }
    }
    /**
     * @openapi
     * /blogs/{id}:
     *   get:
     *     summary: "Get a blog post by ID"
     *     tags: [Blogs]
     *     description: "Retrieve a single blog post by its ID"
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The blog post ID
     *     responses:
     *       200:
     *         $ref: '#/components/responses/BlogResponse'
     *       404:
     *         $ref: '#/components/responses/BlogNotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async viewBlogById(req, res) {
        try {
            const blog = await BlogModel.getById(req.params.id);
            res.status(200).json(blog);
        } catch (error) {
            console.error(`Error fetching blog with ID ${req.params.id}:`, error);
            if (error.message === "Blog not found" || error === "not found") {
                res.status(404).json({ message: "Blog not found" });
            } else {
                res.status(500).json({ message: "Failed to retrieve blog" });
            }
        }
    }

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @openapi
     * /blogs:
     *   post:
     *     summary: "Create a new blog post"
     *     tags: [Blogs]
     *     description: "Create a new blog post (Authentication required)"
     *     security:
     *       - apiKey: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/BlogInput'
     *     responses:
     *       201:
     *         $ref: '#/components/responses/BlogCreated'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async createBlog(req, res) {
        try {
            const { title, content } = req.body;
            
            if (!title || !content) {
                return res.status(400).json({ message: "Title and content are required" });
            }

            // Authentication is required (enforced by middleware), so authenticatedUser must exist
            if (!req.authenticatedUser) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const authorId = req.authenticatedUser.id;
            
            const result = await BlogModel.create(title, content, authorId);
            const newBlog = await BlogModel.getById(result.insertId);
            
            res.status(201).json(newBlog);
        } catch (error) {
            console.error("Error creating blog:", error);
            res.status(500).json({ message: "Failed to create blog" });
        }
    }
    /**
     * @openapi
     * /blogs/{id}:
     *   delete:
     *     summary: "Delete a blog post"
     *     tags: [Blogs]
     *     description: "Delete a blog post by ID (Authentication required)"
     *     security:
     *       - apiKey: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The blog post ID
     *     responses:
     *       200:
     *         $ref: '#/components/responses/SuccessMessage'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       404:
     *         $ref: '#/components/responses/BlogNotFound'
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    static async deleteBlog(req, res) {
        try {
            await BlogModel.delete(req.params.id);
            res.status(200).json({ message: "Blog deleted successfully" });
        } catch (error) {
            console.error(`Error deleting blog with ID ${req.params.id}:`, error);
            if (error.message === "Blog not found" || error === "not found") {
                res.status(404).json({ message: "Blog not found" });
            } else {
                res.status(500).json({ message: "Failed to delete blog" });
            }
        }
    }
}