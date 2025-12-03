import {BlogUserModel} from "../models/BlogUserModel.mjs";

(async () => {
    console.log("Testing BlogUserModel...");

    try {
        // // **Test getAll()**
        // console.log("Fetching all blog posts with author details...");
        // const allBlogs = await BlogUserModel.getAll();
        // console.log("All Blog Posts:", allBlogs);

        // // **Test getById()** - Modify testBlogId to an existing blog post ID
        // const testBlogId = 10; // Change to an actual ID from your database

        // console.log(`Fetching blog post with ID ${testBlogId}...`);
        // const blogById = await BlogUserModel.getById(testBlogId);
        // console.log(`Blog Post ID ${testBlogId}:`, blogById);

        // **Test getByUserId()** - Modify testUserId to an existing user ID
        const testUserId = 3; // Change to an actual ID from your database

        console.log(`Fetching blog posts by author ID ${testUserId}...`);
        const blogsByUser = await BlogUserModel.getByUserId(testUserId);
        console.log(`Blog Posts by Author ID ${testUserId}:`, blogsByUser);

    } catch (error) {
        console.error("Test failed:", error);
    }
})();
