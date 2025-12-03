import { DatabaseModel } from "./DatabaseModel.mjs";
import { BlogModel } from "./BlogModel.mjs";
import { UserModel } from "./UserModel.mjs";

export class BlogUserModel extends DatabaseModel {
    
    /**
     * Creates an instance of BlogUserModel.
     * @param {BlogModel} blog - The blog associated with the user.
     * @param {UserModel} user - The user who authored the blog.
     */
    constructor(blog, user) {
        super();
        this.blog = blog;
        this.user = user;
    }

    /**
     * Converts a database row into an instance of BlogUserModel.
     * @param {Object} row - The database row containing blog and user data.
     * @returns {BlogUserModel} An instance of BlogUserModel with the provided database row data containing both blog and user information.
     */
    static tableToModel(row) {
        return new BlogUserModel(
            BlogModel.tableToModel(row.blogs || row), 
            UserModel.tableToModel(row.users || row)
        );
    }

    /**
     * Fetch a blog post along with the user details by blog ID
     * @param {number} blogId 
     * @returns {Promise<BlogUserModel | null>} Promise that resolves to the blog post with author details for the specified blog ID, or null if not found.
     */
    static async getById(blogId) {
        return this.query(
            `SELECT * FROM blogs
             INNER JOIN users ON blogs.author_id = users.id
             WHERE blogs.id = ? AND blogs.deleted = 0`,
            [blogId]
        ).then(result => result.length > 0 ? this.tableToModel(result[0]) : null);
    }

    /**
     * Fetch all blog posts along with user details, sorted by creation date (newest first)
     * @returns {Promise<Array<BlogUserModel>>} Promise that resolves to an array of all active blog posts with their author details, sorted by creation date (newest first).
     */
    static async getAll() {
        return this.query(`
            SELECT * FROM blogs
             INNER JOIN users ON blogs.author_id = users.id
             WHERE blogs.deleted = 0 AND users.deleted = 0
             ORDER BY blogs.created_at DESC
        `)
        .then(result => result.map(row => this.tableToModel(row)));
    }

    /**
     * Fetch all blog posts written by a specific user
     * @param {number} userId 
     * @returns {Promise<Array<BlogUserModel>>} Promise that resolves to an array of blog posts with author details written by the specified user.
     */
    static async getByUserId(userId) {
        return this.query(
            `SELECT * FROM blogs
             INNER JOIN users ON blogs.author_id = users.id
             WHERE blogs.author_id = ? AND blogs.deleted = 0`,
            [userId]
        ).then(result => result.map(row => this.tableToModel(row)));
    }
}
