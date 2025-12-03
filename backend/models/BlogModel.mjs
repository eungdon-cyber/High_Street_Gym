import { DatabaseModel } from "./DatabaseModel.mjs";

export class BlogModel extends DatabaseModel {
    
    /**
     * Constructor to initialize an instance of BlogModel.
     * @param {number} id - The unique ID of the blog post.
     * @param {string} title - The title of the blog post.
     * @param {string} content - The content of the blog post.
     * @param {number} authorId - The ID of the author of the blog post.
     * @param {Date} createdAt - The date the blog post was created.
     * @param {number} deleted - A flag indicating if the blog post is deleted (0 = active, 1 = deleted).
     */
    constructor(id, title, content, authorId, createdAt, deleted) {
        super();
        this.id = id;
        this.title = title;
        this.content = content;
        this.authorId = authorId;
        this.createdAt = createdAt;
        this.deleted = deleted;
    }

    /**
     * Converts a database row into a BlogModel instance.
     * @param {Object} row - Database row object.
     * @returns {BlogModel} An instance of BlogModel with the provided database row data.
     */
    static tableToModel(row) {
        return new BlogModel(
            row["id"],
            row["title"],
            row["content"],
            row["author_id"],
            row["created_at"],
            row["deleted"]
        );
    }

    /**
     * Retrieves all blog posts that are not deleted.
     * @returns {Promise<Array<BlogModel>>} Promise that resolves to an array of all active blog posts.
     */
    static getAll() {
        return this.query("SELECT * FROM blogs WHERE deleted = 0")
            .then(result => result.map(row => this.tableToModel(row.blogs || row)));
    }

    /**
     * Retrieves a blog post by its ID.
     * @param {number} id - Blog post ID.
     * @returns {Promise<BlogModel>} Promise that resolves to the blog post with the specified ID, or rejects if not found.
     */
    static getById(id) {
        return this.query("SELECT * FROM blogs WHERE id = ? AND deleted = 0", [id])
            .then(result =>
                result.length > 0
                    ? this.tableToModel(result[0].blogs || result[0])
                    : Promise.reject("Blog post not found")
            );
    }

    /**
     * Retrieves blog posts by an author ID.
     * @param {number} authorId - User ID of the author.
     * @returns {Promise<Array<BlogModel>>} Promise that resolves to an array of blog posts by the specified author.
     */
    static getByAuthorId(authorId) {
        return this.query("SELECT * FROM blogs WHERE author_id = ? AND deleted = 0", [authorId])
            .then(result => result.map(row => this.tableToModel(row.blogs || row)));
    }

    /**
     * Retrieves blog posts containing a keyword in the title or content.
     * @param {string} term - Search keyword.
     * @returns {Promise<Array<BlogModel>>} Promise that resolves to an array of blog posts matching the search term in title or content.
     */
    static getBySearch(term) {
        return this.query(`
            SELECT * FROM blogs 
            WHERE deleted = 0 
            AND (title LIKE ? OR content LIKE ?)
        `, [`%${term}%`, `%${term}%`])
            .then(result => result.map(row => this.tableToModel(row.blogs || row)));
    }

    /**
     * Creates a new blog post.
     * @param {string} title - Blog title.
     * @param {string} content - Blog content.
     * @param {number} authorId - Author's user ID.
     * @returns {Promise<void>} Promise that resolves when the new blog post is successfully inserted into the database.
     */
    static create(title, content, authorId) {
        return this.query(`
            INSERT INTO blogs (title, content, author_id, created_at, deleted)
            VALUES (?, ?, ?, NOW(), 0)
        `, [title, content, authorId]);
    }

    /**
     * Updates an existing blog post.
     * @param {BlogModel} blog - Updated blog post object.
     * @returns {Promise<void>} Promise that resolves when the blog post is successfully updated in the database.
     */
    static update(id, blog) {
        return this.query(`
            UPDATE blogs
            SET title = ?, content = ?
            WHERE id = ?
        `, [blog.title, blog.content, id])
            .then(result => {
                if (result.affectedRows === 0) {
                    console.warn("Warning: No rows updated. Blog post may already have the same values.");
                }
                return result;
            })
            .catch(error => {
                console.error("Error in update query:", error);
                throw error;
            });
    }
    
    /**
     * Soft deletes a blog post by ID.
     * @param {number} blogId - Blog post ID.
     * @returns {Promise<void>} Promise that resolves when the blog post is successfully marked as deleted (soft delete).
     */
    static async delete(blogId) {
        try {
            return this.query("UPDATE blogs SET deleted = 1 WHERE id = ?", [blogId])
                .then(result => result.affectedRows > 0 ? result : Promise.reject("Blog post not found"));
        } catch (error) {
            console.error("Error updating deleted column:", error);
            throw error;
        }
    }
    
}
