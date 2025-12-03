import {BookingModel} from "../models/BookingModel.mjs";

(async () => {
    try {
        console.log("Testing BookingModel...");

        // // Test getAll()
        // console.log("Fetching all bookings...");
        // const allBookings = await BookingModel.getAll();
        // console.log("All bookings:", allBookings);

        // // Test getById()
        // const testBookingId = 1; // Modify for testing

        // console.log(`Fetching booking with ID ${testBookingId}...`);
        // const foundBooking = await BookingModel.getById(testBookingId).catch(err => console.log(err));
        // if (foundBooking) {
        //     console.log("Found Booking:", foundBooking);
        // }

        // // Test getByMemberId()
        // const testMemberId = 8; // Modify for testing
        
        // console.log(`Fetching bookings for member ID ${testMemberId}...`);
        // const memberBookings = await BookingModel.getByMemberId(testMemberId);
        // console.log(`Bookings for member ${testMemberId}:`, memberBookings);

        // // Test getBySessionId()
        // const testSessionId = 3; // Modify for testing

        // console.log(`Fetching bookings for class ID ${testSessionId}...`);
        // const sessionBookings = await BookingModel.getBySessionId(testSessionId);
        // console.log(`Bookings for session ${testSessionId}:`, sessionBookings);

        // // Test create()
        // console.log("Creating a new booking...");
        // const newBooking = new BookingModel(
        //     null,  // Auto-generated ID
        //     4,     // Modify for testing (Member ID)
        //     3,     // Modify for testing (Session ID)
        //     0      // Active booking
        // );
        // await BookingModel.create(newBooking).then(() => console.log('New booking created:'));
       
        // Test update()
        const testId = 62;   // Modify this for test
        const booking = await BookingModel.getById(testId);
        console.log(`Updating Bookings ID ${testId}...`);

        if (booking) {
            booking.memberId = 9;
            booking.sessionId = 2;

            await BookingModel.update(testId, booking);
            console.log(`Booking ID ${testId} updated:`, booking);
        } else {
            console.log(`Booking with ID ${testId} not found. Skipping update.`);
        }

        // const booking = {

        //     member_id = 9; // Modify member_id or session_id for testing update
        //     session_id = 2;
        //     deleted: 0
        // };
        // await BookingModel.update(testId, booking);
        // console.log("Booking updated.");

        // // Test delete() (soft delete)
        // const deleteBookingId = 11; // Modify for testing

        // console.log(`Deleting booking ID ${deleteBookingId}...`);
        // await BookingModel.delete(deleteBookingId).then(() => console.log("Booking soft-deleted."));

        // // Test searchByDateRange()
        // const startDate = "2025-05-01"; // Modify for testing
        // const endDate = "2025-05-10";   // Modify for testing
        // console.log(`Searching bookings between ${startDate} and ${endDate}...`);
        // const bookingsInRange = await BookingModel.searchByDateRange(startDate, endDate);
        // console.log(`Bookings from ${startDate} to ${endDate}:`, bookingsInRange);

    } catch (error) {
        console.error("Test failed:", error);
    }
})();
