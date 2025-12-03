import { UserModel } from "../models/UserModel.mjs";

(async () => {
    try {
        console.log("Testing UserModel...");

        // // Test getAll()
        // console.log("Fetching all users...");
        // const users = await UserModel.getAll();
        // console.log("All users:", users);

        // // Test getById()
        // const testId = 10; // Modify this for test

        // console.log(`Fetching user with ID ${testId}...`);
        // const userById = await UserModel.getById(testId);
        // console.log("User found by ID:", userById);

        // // Test getByEmail()
        // const email = "admin1@hsg.com"; // Modify this for test

        // console.log(`Fetching user with ID ${email}...`);
        // const userByEmail = await UserModel.getByEmail(email);
        // console.log("User found by ID:", userByEmail);

        // // Test getByRole()
        // const role = "trainer"; // Modify this for test

        // console.log(`Searching for users with role: ${role}...`);
        // const usersByRole = await UserModel.getByRole(role);
        // console.log("Users found by role:", usersByRole);
        
        // Test create()
        console.log("Creating a new user...");

        const newUser = new UserModel(
            null, 
            //Modify for test
           "admin1_h@hsg.com", "0000", "admin", "FirstName", "LastName"
        );
        await UserModel.create(newUser);
        console.log("New user created.");

        // // Test update()
        // const testId = 14; // Modify this for test

        // const user = await UserModel.getById(testId);
        // console.log(`Updating user ID ${testId}...`);
        // if (user) {
        //     user.email = "update@test.com";
        //     user.firstName = "Update";
        //     user.lastName = "Update";

        //     await UserModel.update(testId, user);
        //     console.log("User updated.", user);
        // } else {
        //     console.log(`User with ID ${testId} not found. Skipping update.`);
        // }

        // // Test delete() (Soft delete)
        // const testId = 13; // Modify this for test

        // console.log(`Deleting user ID ${testId}...`);
        // await UserModel.delete(testId);
        // console.log("User soft-deleted.");

    } catch (error) {
        console.error("Test failed:", error);
    }
})();
