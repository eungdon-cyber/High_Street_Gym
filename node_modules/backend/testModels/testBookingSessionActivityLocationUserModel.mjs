import { BookingSessionActivityLocationUserModel } from "../models/BookingSessionActivityLocationUserModel.mjs";

(async () => {
    try {
        console.log("🔍 Testing BookingSessionActivityLocationUserModel...");

        // // Test getAllBookings
        // console.log("📌 Fetching all bookings...");
        // const bookings = await BookingSessionActivityLocationUserModel.getAll();
        // console.log("✅ All bookings:", bookings);

        // // Test getByMemberID
        // const memberId = 1;
        // console.log(`📌 Fetching bookings for Member ID ${memberId}...`);
        // const memberBookings = await BookingSessionActivityLocationUserModel.getByMemberId(memberId);
        // console.log("✅ Bookings by member:", memberBookings);

        // // Test getBySessionID
        // const sessionId = 5;       
        // console.log(`📌 Fetching bookings for Session ID ${sessionId}...`);

        // const sessionBookings = await BookingSessionActivityLocationUserModel.getBySessionId(sessionId);
        // console.log("✅ Bookings for session:", sessionBookings);

        // Test getByBookingID
        const bookingId = 1;       
        console.log(`📌 Fetching bookings for Booking ID ${bookingId}...`);

        const BookingsWithBookingId = await BookingSessionActivityLocationUserModel.getByBookingId(bookingId);
        console.log("✅ Bookings for bookingId:", BookingsWithBookingId);

    } catch (error) {
        console.error("❌ Error during testing:", error);
    }
})();
