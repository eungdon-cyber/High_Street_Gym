import { BlogModel } from "../models/BlogModel.mjs";

(async () => {
    try {
        console.log("Testing BlogModel...");

        // // Test getAll()
        // console.log("Fetching all blog posts...");
        // const blogs = await BlogModel.getAll();
        // console.log("All blog posts:", blogs);

        // // Test getBySearch()
        // const searchKeyword = "first"; // Modify this for test

        // console.log(`Searching for blog posts with term: ${searchKeyword}...`);
        // const searchResults = await BlogModel.getBySearch(searchKeyword);
        // console.log("Search results:", searchResults);

        // // Test getById()
        // const testId = 2; // Modify this for test

        // console.log(`Fetching blog post with ID ${testId}...`);
        // const blog = await BlogModel.getById(testId);
        // console.log("Blog post found:", blog);

        // // Test getByAuthorId()
        // const authorId = 9; // Modify this for test

        // console.log(`Fetching blog posts by author ID ${authorId}...`);
        // const authorBlogs = await BlogModel.getByAuthorId(authorId);
        // console.log("Blog posts by author:", authorBlogs);

        // // Test create()
        // console.log("Creating a new blog post...");

        // const newBlog = new BlogModel(
        //     null, "New Workout Tips", "Here are some fitness tips...", 2, new Date(), 0            
        // );
        // //await BlogModel.create(newBlog);
        // await BlogModel.create("New Workout Tips", "Here are some fitness tips...", 1);
        // console.log("New blog post created.");

        // Test update()
        const updateId = 12; // Modify this for test

        console.log(`Updating blog post ID ${updateId}...`);
        let blogToUpdate = await BlogModel.getById(updateId);
        if (blogToUpdate) {
            blogToUpdate.title = "New Blog Title";
            blogToUpdate.content = "New blog content...";
            await BlogModel.update(updateId, blogToUpdate);
            console.log("Blog post updated.");
        } else {
            console.log(`Blog post with ID ${updateId} not found. Skipping update.`);
        }

        // Test delete() (Soft delete)
        const deleteId = 11; // Modify this for test

        console.log(`Deleting blog post ID ${deleteId}...`);
        await BlogModel.delete(deleteId);
        console.log("Blog post deleted.");

    } catch (error) {
        console.error("Test failed:", error);
    }
})();