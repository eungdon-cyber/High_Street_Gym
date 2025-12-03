import { ActivityModel } from "../models/ActivityModel.mjs";

(async () => {
    try {
        console.log("Testing ActivityModel...");

        // // Test getAll()
        // console.log("Fetching all activities...");
        // const activities = await ActivityModel.getAll();
        // console.log("All activities:", activities);

        // // Test getBySearch()
        // const searchKeyword = "High" // Modify this for test

        // console.log(`Searching for activity with term: ${searchKeyword}...`);
        // const searchResults = await ActivityModel.getBySearch(searchKeyword);
        // console.log("Search results:", searchResults);

        // // Test getById()
        // const testId = 3;    // Modify this for test

        // console.log(`Fetching activity with ID ${testId}...`);
        // const activity = await ActivityModel.getById(testId);
        // console.log("Activity found:", activity);


        // // Test create()
        // console.log("Creating a new activity...");
        // // Modify this for test
        // const newActivity = new ActivityModel(
        //     null, "Pilates", "A relaxing yet powerful workout", 0
        // );
        // await ActivityModel.create(newActivity);
        // console.log("New activity created.");

        // Test update()
        const testId = 11;   // Modify this for test
        const activity = await ActivityModel.getById(testId);
        console.log(`Updating activity ID ${testId}...`);
        if (activity) {
            activity.name = "Updated Activity";
            activity.description = "Updated Description";
            await ActivityModel.update(testId, activity);
            console.log("Activity updated.");
        } else {
            console.log(`Activity with ID ${testId} not found. Skipping update.`);
        }

        // // Test delete() (Soft delete)
        // const testId = 11;   // Modify this for test
        // console.log(`Deleting activity ID ${testId}...`);
        // await ActivityModel.delete(testId);
        // console.log("Activity deleted.");
        
    } catch (error) {
        console.error("Test failed:", error);
    }
})();
