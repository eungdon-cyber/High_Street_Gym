import { LocationModel } from "../models/LocationModel.mjs";

(async () => {
    try {
        // console.log("Testing LocationModel...");

        // // Test getAll
        // console.log("Fetching all locations...");
        // const locations = await LocationModel.getAll();
        // console.log("All locations:", locations);

        // // Test getById
        // const testId = 10; // Change this to a valid location ID if needed

        // console.log(`Fetching location with ID ${testId}...`);
        // const location = await LocationModel.getById(testId);
        // console.log("Location found:", location);

        // // Test create
        // console.log("Creating a new location...");
        // const newLocation = new LocationModel(null, "New Gym Branch", "Downtown");
        // const insertResult = await LocationModel.create(newLocation);
        // console.log("New location created:", insertResult);

        // // Test update
        // const testId = 11; // Change this to a valid location ID if needed
        // console.log(`Updating location ID ${testId}...`);

        // // Fetch the existing location first
        // const location = await LocationModel.getById(testId).catch(() => null);

        // if (location) {
        //     // Modify the existing location instance
        //     location.name = "Updated Gym";
        //     location.address = "Updated Address";

        //     // Call update with the modified instance
        //     await LocationModel.update(testId, location);
        //     console.log(`Location ID ${testId} updated successfully.`);
        // } else {
        //     console.log(`Location with ID ${testId} not found. Skipping update.`);
        // }

        // // Test delete
        // const deleteId = 11; // Change this to a valid ID for deletion

        // console.log(`Deleting location with ID ${deleteId}...`);
        // await LocationModel.delete(deleteId);
        // console.log("Location deleted.");

    } catch (error) {
        console.error("Test failed:", error);
    }
})();
