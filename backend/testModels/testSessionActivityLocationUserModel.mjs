import {SessionActivityLocationUserModel} from "../models/SessionActivityLocationUserModel.mjs";

(async () => {
    try {
        // console.log("🔍 Testing SessionActivityLocationUserModel...");

        // Test getAll
        console.log("📌 Fetching all session sessions...");
        const sessions = await SessionActivityLocationUserModel.getAll();
        console.log("✅ All session sessions:", sessions);

        // // Test getByTrainerID
        // const trainerId = 3;
        // // console.log("Available Methods:", Object.keys(SessionActivityLocationUserModel));

        // console.log(`📌 Fetching sessions led by Trainer ID ${trainerId}...`);
        // const trainerSessions = await SessionActivityLocationUserModel.getByTrainerId(trainerId);
        // console.log("✅ Sessions by trainer:", trainerSessions);

        // // Test getBySessionID
        // const sessionId = 5;

        // console.log(`📌 Fetching details for Session ID ${sessionId}...`);
        // const sessionDetails = await SessionActivityLocationUserModel.getBySessionId(sessionId);
        // console.log("✅ Session details:", sessionDetails);

        // console.log("🎯 All tests completed successfully!");

    } catch (error) {
        console.error("❌ Error during testing:", error);
    }
})();
