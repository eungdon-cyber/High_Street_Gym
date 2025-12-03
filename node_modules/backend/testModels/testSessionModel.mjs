import { SessionModel } from "../models/SessionModel.mjs";

(async () => {
    try {
        console.log("Testing SessionModel...");

        // Test getAll()
        console.log("Fetching all sessions...");
        const allSessions = await SessionModel.getAll();
        console.log("All Sessions:", allSessions);

        // // Test getById()
        // const testId = 1; // Modify for test
        // console.log(`Fetching session with ID ${testId}...`);
        // const foundSession = await SessionModel.getById(testId);
        // console.log("Found Session:", foundSession);

        // // Test create() - Modify values as needed
        // console.log("Creating a new session...");
        // const newSession = new SessionModel(
        //     null,  // ID (Auto-generated)
        //     1,     // Activity ID (Modify for test)
        //     2,     // Trainer ID (Modify for test)
        //     3,     // Location ID (Modify for test)
        //     "2025-05-01", // Session Date
        //     "10:00:00",   // Session Time
        //     0      // Deleted flag
        // );
        // await SessionModel.create(newSession);
        // console.log("New session created.");

        // // Test update()
        // const testIdToUpdate = 81; // Modify for test
        // const foundSessionToUpdate = await SessionModel.getById(testIdToUpdate);

        // console.log(`Updating session ID ${testIdToUpdate}...`);
        // if (foundSessionToUpdate) {
        //     foundSessionToUpdate.sessionTime = "12:00:00"; // Modify time
        //     await SessionModel.update(foundSessionToUpdate);
        //     console.log("Session updated.");
        // } else {
        //     console.log(`Session with ID ${testIdToUpdate} not found. Skipping update.`);
        // }

        // // Test delete()
        // const testIdToDelete = 81; // Modify for test
        // console.log(`Deleting session ID ${testIdToDelete} (soft delete)...`);
        // await SessionModel.delete(testIdToDelete);
        // console.log("Session soft-deleted successfully.");

    } catch (error) {
        console.error("Test failed:", error);
    }
})();
