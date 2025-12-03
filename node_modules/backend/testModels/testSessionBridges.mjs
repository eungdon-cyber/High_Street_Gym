import { SessionModel } from "../models/SessionModel.mjs";

(async () => {
    try {
        console.log("🔍 Testing Session Bridge Methods...");

        // Test getByActivityId
        // const activityId = 1; // Assuming activity ID 1 exists
        // console.log(`📌 Fetching sessions for Activity ID ${activityId}...`);
        // const activitySessions = await SessionModel.getByActivityId(activityId);
        // console.log(`✅ Sessions for Activity ${activityId}:`, activitySessions.length, "sessions found");

        // Test getByLocationId
        // const locationId = 1; // Assuming location ID 1 exists
        // console.log(`📌 Fetching sessions for Location ID ${locationId}...`);
        // const locationSessions = await SessionModel.getByLocationId(locationId);
        // console.log(`✅ Sessions for Location ${locationId}:`, locationSessions.length, "sessions found");

        // Test getByTrainerId
        // const trainerId = 3; // Assuming trainer ID 3 exists
        // console.log(`📌 Fetching sessions for Trainer ID ${trainerId}...`);
        // const trainerSessions = await SessionModel.getByTrainerId(trainerId);
        // console.log(`✅ Sessions for Trainer ${trainerId}:`, trainerSessions.length, "sessions found");

        // console.log("🎯 All bridge tests completed successfully!");

    } catch (error) {
        console.error("❌ Error during bridge testing:", error);
    }
})(); 