import { useCallback, useEffect, useRef, useState } from "react"
import { FaInfoCircle, FaDownload, FaTrash } from "react-icons/fa"
import { fetchAPI, API_BASE_URL } from "../services/api.mjs"
import { useNavigate, useSearchParams, useParams } from "react-router"
import { useAuthenticate } from "../authentication/useAuthenticate.jsx"

// Builds query string for tab parameter (?tab=active or ?tab=previous)
// Used in: handleViewBooking() and handleCloseBookingDetails() to preserve tab state in URL
const buildTabQueryString = (tab) => {
    // If no tab provided, return empty string (no query param)
    if (!tab) return ""
    // Return query string with tab parameter (e.g., "?tab=active")
    return `?tab=${tab}`
}

function BookingListView() {
    const { user } = useAuthenticate()
    const navigate = useNavigate()
    const params = useParams()
    const [searchParams] = useSearchParams()
    
    const [bookings, setBookings] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    
    const [exportingXML, setExportingXML] = useState(false)
    const [exportError, setExportError] = useState(null)
    
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [selectedBookingLoading, setSelectedBookingLoading] = useState(false)
    const [selectedBookingError, setSelectedBookingError] = useState(null)
    
    const [cancelingSelectedBooking, setCancelingSelectedBooking] = useState(false)
    const [cancelSelectedBookingError, setCancelSelectedBookingError] = useState(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    
    const [selectedBookingGroup, setSelectedBookingGroup] = useState([])
    const [selectedBookingGroupMeta, setSelectedBookingGroupMeta] = useState(null)
    
    // Ref to track request IDs for race condition prevention
    // Used in: handleViewBooking() to ignore stale API responses
    const bookingRequestIdRef = useRef(0)

    // Initializes activeTab from URL query parameter, defaults to "active"
    const [activeTab, setActiveTab] = useState(() => {
        const tabParam = searchParams.get("tab")
        return tabParam === "previous" ? "previous" : "active"
    })

    const isAuthorized = user && (user.role === "member" || user.role === "admin")

    // Syncs activeTab state when URL query parameter changes
    useEffect(() => {
        const tabParam = searchParams.get("tab")
        const newTab = tabParam === "previous" ? "previous" : "active"
        if (newTab !== activeTab) {
            setActiveTab(newTab)
        }
    }, [searchParams, activeTab])

    // Checks if booking date is in the past
    const isPastBooking = (sessionDate) => {
        if (!sessionDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const bookingDate = new Date(sessionDate)
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate < today
    }

    // Fetches bookings list from backend API
    // Endpoint varies by activeTab: "previous" includes past bookings, "active" only future
    // Client-side filtering applied for "previous" tab to show only past bookings
    const getBookings = useCallback(async () => {
        if (!isAuthorized) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)
        
        try {
            const authKey = localStorage.getItem("authKey")
            const route = activeTab === "previous" ? "/bookings/self?includePast=true" : "/bookings/self"
            const response = await fetchAPI("GET", route, null, authKey)
            
            if (response.status === 200) {
                let bookingsData = response.body || []
                
                // Filter to show only past bookings when "Previous" tab is active
                if (activeTab === "previous") {
                    bookingsData = bookingsData.filter(booking => isPastBooking(booking.sessionDate))
                }
                
                if (bookingsData.length > 0) {
                    setBookings(bookingsData)
                    setError(null)
                } else {
                    setBookings([])
                    setError("No bookings found")
                }
            } else {
                setError(response.body?.message || "Failed to load bookings")
                setBookings([])
            }
        } catch (error) {
            console.error("Error fetching bookings:", error)
            setError(String(error))
            setBookings([])
        } finally {
            setLoading(false)
        }
    }, [isAuthorized, activeTab])

    // Fetches single booking details from backend
    // skipNavigate: prevents URL update to avoid infinite loop when called from useEffect
    // Race condition handling: requestId prevents stale responses from overwriting newer ones
    const handleViewBooking = useCallback(async (bookingId, { skipNavigate = false } = {}) => {
        const requestId = ++bookingRequestIdRef.current
        if (!skipNavigate) {
            const query = buildTabQueryString(activeTab)
            navigate(`/bookings/${bookingId}${query}`)
        }
        setSelectedBookingLoading(true)
        setSelectedBookingError(null)
        setSelectedBooking(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                if (bookingRequestIdRef.current === requestId) {
                    setSelectedBookingError("Authentication required. Please log in.")
                    setSelectedBookingLoading(false)
                }
                return
            }
            const response = await fetchAPI("GET", `/bookings/${bookingId}`, null, authKey)
            // Ignore response if newer request was made (race condition check)
            if (bookingRequestIdRef.current !== requestId) {
                return
            }
            if (response.status === 200) {
                setSelectedBooking(response.body)
            } else {
                setSelectedBookingError(response.body?.message || "Failed to load booking")
            }
        } catch (error) {
            if (bookingRequestIdRef.current === requestId) {
                setSelectedBookingError(String(error))
            }
        } finally {
            if (bookingRequestIdRef.current === requestId) {
                setSelectedBookingLoading(false)
            }
        }
    }, [navigate, activeTab])

    // Handles selection of a booking group (multiple bookings for same activity/day)
    const handleSelectBookingGroup = (bookingGroup, meta) => {
        if (!Array.isArray(bookingGroup) || bookingGroup.length === 0) {
            return
        }
        setSelectedBookingGroup(bookingGroup)
        setSelectedBookingGroupMeta(meta || null)
        handleViewBooking(bookingGroup[0].id)
    }

    const handleCloseBookingDetails = (tab = activeTab) => {
        const query = buildTabQueryString(tab)
        navigate(`/bookings${query}`)
        setSelectedBooking(null)
        setSelectedBookingError(null)
        setSelectedBookingLoading(false)
        setCancelSelectedBookingError(null)
        setCancelingSelectedBooking(false)
        setSelectedBookingGroup([])
        setSelectedBookingGroupMeta(null)
        bookingRequestIdRef.current += 1
    }

    // Handles tab change (Active/Previous)
    const handleTabChange = (tab) => {
        setActiveTab(tab)
        handleCloseBookingDetails(tab)
    }

    // Clears selected booking state when activeTab changes
    useEffect(() => {
        setSelectedBooking(null)
        setSelectedBookingError(null)
        setSelectedBookingLoading(false)
        setCancelSelectedBookingError(null)
        setCancelingSelectedBooking(false)
        setSelectedBookingGroup([])
        setSelectedBookingGroupMeta(null)
        bookingRequestIdRef.current += 1
    }, [activeTab])

    // Loads booking details when URL contains booking ID
    useEffect(() => {
        if (!isAuthorized) {
            return
        }
        if (params.id) {
            // skipNavigate=true prevents infinite loop
            handleViewBooking(params.id, { skipNavigate: true })
        } else {
            setSelectedBooking(null)
            setSelectedBookingError(null)
            setSelectedBookingLoading(false)
            setSelectedBookingGroup([])
            setSelectedBookingGroupMeta(null)
            bookingRequestIdRef.current += 1
        }
    }, [params.id, isAuthorized, handleViewBooking])

    // Fetches bookings list on mount and when dependencies change
    useEffect(() => {
        getBookings()
    }, [getBookings])

    // Groups bookings by month and day for display
    const groupBookingsByDay = (bookings) => {
        const grouped = {}

        if (!Array.isArray(bookings)) {
            return grouped
        }

        bookings.forEach((booking) => {
            const sessionDate = new Date(booking.sessionDate)
            const year = sessionDate.getFullYear()
            const month = sessionDate.getMonth() + 1
            const dayOfWeek = sessionDate.toLocaleString("en-AU", { 
                weekday: "long", 
                timeZone: "Australia/Brisbane" 
            })
            const dayOfMonth = sessionDate.getDate()

            const yearMonthKey = `${year}-${month < 10 ? `0${month}` : month}`
            const formattedDate = `${year}-${month < 10 ? `0${month}` : month}-${dayOfMonth < 10 ? `0${dayOfMonth}` : dayOfMonth}`
            const dayKey = `${formattedDate} - ${dayOfWeek}`

            if (!grouped[yearMonthKey]) {
                grouped[yearMonthKey] = {}
            }

            if (!grouped[yearMonthKey][dayKey]) {
                grouped[yearMonthKey][dayKey] = []
            }

            grouped[yearMonthKey][dayKey].push(booking)
        })

        return grouped
    }

    // Formats date string for display
    const formatDate = (dateString) => {
        if (!dateString) return ""
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString("en-AU", { 
                year: "numeric", 
                month: "short", 
                day: "numeric" 
            })
        } catch {
            return dateString
        }
    }

    // Formats time string for display
    const formatTime = (timeString) => {
        if (!timeString) return ""
        try {
            const [hours, minutes] = timeString.split(":")
            const date = new Date()
            date.setHours(parseInt(hours), parseInt(minutes))
            return date.toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            })
        } catch {
            return timeString
        }
    }

    // Formats month/year from year-month key for display
    const formatMonthYear = (yearMonthKey) => {
        const [year, month] = yearMonthKey.split("-")
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December']
        const monthName = monthNames[parseInt(month) - 1]
        return `${monthName} ${year}`
    }

    // Formats day header for display
    const formatDayHeader = (dayKey) => {
        const [datePart, dayName] = dayKey.split(" - ")
        const [year, month, dayNumber] = datePart.split("-")
        const australianDate = `${dayNumber}/${month}`
        const dayAbbreviation = dayName.substring(0, 3)
        return {
            day: dayAbbreviation.charAt(0).toUpperCase() + dayAbbreviation.slice(1).toLowerCase(),
            date: australianDate
        }
    }

    // Exports previous bookings as XML file
    const handleExportPreviousBookingsXML = async () => {
        setExportingXML(true)
        setExportError(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                setExportError("Authentication required. Please log in.")
                setExportingXML(false)
                return
            }

            // Uses direct fetch (not fetchAPI) to get XML response as text
            const response = await fetch(`${API_BASE_URL}/bookings/export/xml/history?onlyPast=true`, {
                method: "GET",
                headers: {
                    "x-auth-key": authKey
                }
            })

            if (response.ok) {
                const xmlContent = await response.text()
                
                const blob = new Blob([xmlContent], { type: "application/xml" })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                
                // Get filename from Content-Disposition header or use default
                const contentDisposition = response.headers.get("Content-Disposition")
                let filename = "previous-bookings.xml"
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/)
                    if (filenameMatch) {
                        filename = filenameMatch[1].replace("booking-history-", "previous-bookings-")
                    }
                }
                
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            } else {
                const errorData = await response.json().catch(() => ({ message: "Failed to export bookings" }))
                setExportError(errorData.message || "Failed to export previous bookings")
            }
        } catch (error) {
            console.error("Error exporting previous bookings XML:", error)
            setExportError(String(error))
        } finally {
            setExportingXML(false)
        }
    }

    // Opens the cancel booking confirmation modal
    const handleOpenCancelModal = () => {
        if (!selectedBooking) {
            setCancelSelectedBookingError("Unable to determine booking.")
            return
        }

        if (!user || (user.role !== "member" && user.role !== "admin")) {
            setCancelSelectedBookingError("Only members and admins can cancel bookings.")
            return
        }

        // Members can only cancel their own bookings
        if (user.role === "member" && selectedBooking.memberId != user.id) {
            setCancelSelectedBookingError("You can only cancel your own bookings.")
            return
        }

        setShowCancelModal(true)
    }

    // Closes the cancel booking confirmation modal
    const handleCloseCancelModal = () => {
        setShowCancelModal(false)
    }

    // Cancels/deletes a booking
    const handleCancelSelectedBooking = async () => {
        if (!selectedBooking) {
            setCancelSelectedBookingError("Unable to determine booking.")
            return
        }

        setShowCancelModal(false)
        setCancelingSelectedBooking(true)
        setCancelSelectedBookingError(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                setCancelSelectedBookingError("Authentication required. Please log in.")
                setCancelingSelectedBooking(false)
                return
            }

            const response = await fetchAPI("DELETE", `/bookings/${selectedBooking.id}`, null, authKey)
            if (response.status === 200) {
                handleCloseBookingDetails()
                getBookings()
            } else {
                setCancelSelectedBookingError(response.body?.message || "Failed to cancel booking")
            }
        } catch (error) {
            setCancelSelectedBookingError(String(error))
        } finally {
            setCancelingSelectedBooking(false)
        }
    }

    const groupedBookings = groupBookingsByDay(bookings)

    // Access denied view: shown when user is not authorized (not member or admin)
    if (!isAuthorized) {
        return (
            <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-8 px-4">
                <div className="max-w-2xl w-full mx-auto">
                    {/* Page title */}
                    <div className="text-center mb-6">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">My Bookings</h2>
                    </div>
                    {/* Access denied message card */}
                    <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-red-500">
                        <div className="text-center">
                            <p className="text-white/80">Access denied. This page is only available to members and admins.</p>
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-8 px-4">
            <div className="max-w-2xl w-full mx-auto">
                {/* Tab selector: switches between Active (future) and Previous (past) bookings */}
                <div className="mb-6">
                    <div className="flex gap-2 bg-white/10 rounded-lg p-1">
                        {/* Active tab button: shows future bookings only */}
                        <button
                            onClick={() => handleTabChange("active")}
                            className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all duration-300 ${
                                activeTab === "active"
                                    ? "bg-[#30d939] text-[#6a2f6a] shadow-lg"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            Active
                        </button>
                        {/* Previous tab button: shows past bookings */}
                        <button
                            onClick={() => handleTabChange("previous")}
                            className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all duration-300 ${
                                activeTab === "previous"
                                    ? "bg-[#30d939] text-[#6a2f6a] shadow-lg"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            Previous
                        </button>
                    </div>
                </div>

                {/* Export button: downloads previous bookings as XML file (only shown on Previous tab) */}
                {activeTab === "previous" && (
                    <div className="mb-6">
                        {/* Export XML button: triggers handleExportPreviousBookingsXML() */}
                        <button
                            onClick={handleExportPreviousBookingsXML}
                            disabled={exportingXML}
                            className="w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 bg-[#30d939] text-[#6a2f6a] border-2 border-[#30d939] hover:bg-[#30d939]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaDownload />
                            <span>{exportingXML ? "Exporting..." : "Export as XML"}</span>
                        </button>
                        {/* Export error message: displays if export operation fails */}
                        {exportError && (
                            <div className="mt-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm text-center">
                                {exportError}
                            </div>
                        )}
                    </div>
                )}

                {/* Main content container: holds booking details view and bookings list */}
                <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939]">
                    {/* Loading spinner: shown while fetching selected booking details */}
                    {selectedBookingLoading && (
                        <div className="mb-6 bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20 flex justify-center">
                            <span className="loading loading-spinner loading-xl"></span>
                        </div>
                    )}

                    {/* Error message: displays if selected booking fetch fails */}
                    {selectedBookingError && (
                        <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                            <span>{selectedBookingError}</span>
                        </div>
                    )}

                    {/* Selected booking details panel: displays full booking information */}
                    {selectedBooking && (
                        <div className="mb-6 bg-white/5 rounded-lg border border-white/20 p-6 space-y-4">
                            {/* Header: activity name and close button */}
                            <div className="flex justify-between items-start gap-4">
                                {/* Activity name display */}
                                <div className="flex-1">
                                    <p className="text-sm uppercase tracking-wide text-white/60 mb-1">Activity</p>
                                    <h3 className="text-2xl font-bold text-white">
                                        {selectedBooking.activityName || `Activity #${selectedBooking.activityId}`}
                                    </h3>
                                </div>
                                {/* Close button: closes booking details and returns to list view */}
                                <button
                                    onClick={handleCloseBookingDetails}
                                    className="text-white/70 hover:text-white text-sm font-semibold"
                                >
                                    Close ✕
                                </button>
                            </div>

                            {/* Day label: shown when multiple bookings exist for same day */}
                            {selectedBookingGroupMeta?.dayLabel && selectedBookingGroup.length > 1 && (
                                <p className="text-xs text-white/50 mt-1">
                                    {selectedBookingGroupMeta.dayLabel}
                                </p>
                            )}

                            {/* Booking group navigation: buttons to switch between multiple bookings for same activity/day */}
                            {selectedBookingGroup.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedBookingGroup.map(bookingOption => {
                                        // Determines if this button represents the currently selected booking
                                        const isSelected = selectedBooking?.id === bookingOption.id
                                        // Booking option button: shows time, location, trainer - click to view that booking
                                        return (
                                            <button
                                                key={bookingOption.id}
                                                type="button"
                                                onClick={() => handleViewBooking(bookingOption.id)}
                                                className={`px-4 py-2 rounded-full text-xs font-semibold border transition text-left ${
                                                    isSelected
                                                        ? "bg-[#30d939] text-[#6a2f6a] border-[#30d939]"
                                                        : "text-white/90 border-white/30 hover:border-white hover:text-white"
                                                }`}
                                                title="View this booking option"
                                            >
                                                <div className="flex items-center gap-2 w-[230px]">
                                                    {/* Time display */}
                                                    <span className="font-semibold whitespace-nowrap">
                                                        {formatTime(bookingOption.sessionTime)}
                                                    </span>
                                                    <span className="text-white/60">•</span>
                                                    {/* Location display */}
                                                    <span className="text-[0.75rem] text-white/90 truncate max-w-[70px]">
                                                        {bookingOption.locationName || `Location #${bookingOption.locationId}`}
                                                    </span>
                                                    <span className="text-white/60">•</span>
                                                    {/* Trainer display */}
                                                    <span className="text-[0.75rem] text-white/90 truncate max-w-[70px]">
                                                        {bookingOption.trainerName || `Trainer #${bookingOption.trainerId}`}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Booking details: time, location, trainer information */}
                            <div className="bg-white/10 rounded-lg p-4 space-y-3 relative">
                                {/* Session date and time display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Time</p>
                                    <p className="text-white font-semibold">
                                        {selectedBooking ? `${formatDate(selectedBooking.sessionDate)} · ${formatTime(selectedBooking.sessionTime)}` : "N/A"}
                                    </p>
                                </div>
                                {/* Location name and address display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Location</p>
                                    <p className="text-white font-semibold">
                                        {selectedBooking.locationName || `Location #${selectedBooking.locationId}`}
                                    </p>
                                    {selectedBooking.locationAddress && (
                                        <p className="text-white/70 text-sm mt-1">{selectedBooking.locationAddress}</p>
                                    )}
                                </div>
                                {/* Trainer name display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Trainer</p>
                                    <p className="text-white font-semibold">
                                        {selectedBooking.trainerName || `Trainer #${selectedBooking.trainerId}`}
                                    </p>
                                </div>
                                {/* Cancel/Delete button: shown only for admin or booking owner */}
                                {user && (user.role === "admin" || (user.role === "member" && selectedBooking.memberId == user.id)) && (
                                    <button
                                        onClick={handleOpenCancelModal}
                                        disabled={cancelingSelectedBooking}
                                        className="absolute bottom-4 right-4 text-red-300 hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={cancelingSelectedBooking
                                            ? (isPastBooking(selectedBooking.sessionDate) ? "Deleting..." : "Canceling...")
                                            : (isPastBooking(selectedBooking.sessionDate) ? "Delete Booking Record" : "Cancel Booking")
                                        }
                                    >
                                        <FaTrash className="text-lg" />
                                    </button>
                                )}
                            </div>

                            {/* Booked for section: shows member name (only if booking has memberName) */}
                            {selectedBooking.memberName && (
                                <div className="bg-white/10 rounded-lg p-4">
                                    <p className="text-xs uppercase text-white/60">Booked For</p>
                                    <p className="text-white font-semibold">
                                        {(() => {
                                            const memberName = selectedBooking.memberName
                                            const isSelf = user && selectedBooking.memberId === user.id
                                            return isSelf ? `${memberName} (Self)` : memberName
                                        })()}
                                    </p>
                                </div>
                            )}

                            {/* Cancel operation error message: shown if cancel/delete fails */}
                            {user && (user.role === "admin" || (user.role === "member" && selectedBooking.memberId == user.id)) && cancelSelectedBookingError && (
                                <div className="mt-2 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm text-center">
                                    {cancelSelectedBookingError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cancel Booking Confirmation Modal: shown when user clicks cancel button */}
                    {showCancelModal && selectedBooking && (() => {
                        const past = isPastBooking(selectedBooking.sessionDate)
                        return (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-[#6a2f6a] border-2 border-[#30d939] rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl">
                                    {/* Modal header */}
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-[#30d939] mb-2">
                                            {past ? "Confirm Deletion" : "Confirm Cancellation"}
                                        </h3>
                                        <p className="text-white/90">
                                            {past 
                                                ? "Are you sure you want to delete this booking from your history?"
                                                : "Are you sure you want to cancel this upcoming booking?"
                                            }
                                        </p>
                                        <p className="text-red-300 text-sm mt-2 font-semibold">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                    
                                    {/* Booking preview */}
                                    <div className="bg-white/10 rounded-lg p-4 mb-6">
                                        <p className="text-white font-semibold mb-2">
                                            {selectedBooking.activityName || `Activity #${selectedBooking.activityId}`}
                                        </p>
                                        <div className="space-y-1 text-sm text-white/80">
                                            <p>
                                                <span className="font-semibold">Date:</span> {formatDate(selectedBooking.sessionDate)}
                                            </p>
                                            <p>
                                                <span className="font-semibold">Time:</span> {formatTime(selectedBooking.sessionTime)}
                                            </p>
                                            <p>
                                                <span className="font-semibold">Location:</span> {selectedBooking.locationName || `Location #${selectedBooking.locationId}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Modal action buttons */}
                                    <div className="flex gap-3">
                                        {/* Cancel button */}
                                        <button
                                            onClick={handleCloseCancelModal}
                                            disabled={cancelingSelectedBooking}
                                            className="flex-1 bg-white/20 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Keep Booking
                                        </button>
                                        {/* Confirm cancel/delete button */}
                                        <button
                                            onClick={handleCancelSelectedBooking}
                                            disabled={cancelingSelectedBooking}
                                            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-red-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {cancelingSelectedBooking ? (
                                                <span className="loading loading-spinner loading-sm"></span>
                                            ) : (
                                                past ? "Delete" : "Cancel"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}

                    {/* Bookings list error message: displays if fetching bookings fails */}
                    {error && (
                        <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading state: spinner shown while fetching bookings list */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-xl"></span>
                        </div>
                    ) : !error && bookings.length === 0 ? (
                        // Empty state: shown when no bookings found
                        <div className="p-8 text-center">
                            <p className="text-white/80">No bookings found</p>
                        </div>
                    ) : (
                        // Bookings list: grouped by month/year, then by day, then by activity
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                            {Object.keys(groupedBookings).sort().map(yearMonth => (
                                <div key={yearMonth} className="space-y-4">
                                    {/* Month/Year header: sticky header for each month section */}
                                    <div className="sticky top-0 bg-[#6a2f6a] z-10 pb-2">
                                        <h3 className="text-xl font-bold text-[#30d939]">
                                            {formatMonthYear(yearMonth)}
                                        </h3>
                                    </div>
                                    
                                    {/* Days within the month: each day has its own section */}
                                    {Object.keys(groupedBookings[yearMonth]).sort().map(day => {
                                        const dayHeader = formatDayHeader(day)
                                        return (
                                        <div key={day} className="space-y-2">
                                            {/* Day header: sticky header showing day name and date */}
                                            <div className="sticky top-0 bg-[#6a2f6a] z-0 py-1 flex items-center gap-2 pl-2">
                                                <span className="text-base font-bold text-[#30d939]">
                                                    {dayHeader.day}
                                                </span>
                                                <span className="text-xs text-white/60">
                                                    - {dayHeader.date}
                                                </span>
                                            </div>
                                            
                                            {/* Activity buttons: groups bookings by activity name, clickable to view booking group */}
                                            <div className="space-y-2 pl-4">
                                                {(() => {
                                                    // Groups bookings by activity name within each day
                                                    const activityGroups = {}
                                                    groupedBookings[yearMonth][day].forEach(booking => {
                                                        const activityName = booking.activityName || `Activity #${booking.activityId}`
                                                        if (!activityGroups[activityName]) {
                                                            activityGroups[activityName] = []
                                                        }
                                                        activityGroups[activityName].push(booking)
                                                    })

                                                    return Object.keys(activityGroups).map(activityName => {
                                                        const bookingsForActivity = activityGroups[activityName]
                                                        const bookingCount = bookingsForActivity.length
                                                        const groupMeta = {
                                                            activityName,
                                                            dayLabel: `${dayHeader.day} - ${dayHeader.date}`
                                                        }

                                                        // Activity button: shows activity name and count, click to view booking group
                                                        return (
                                                            <button
                                                                key={`${day}-${activityName}`}
                                                                type="button"
                                                                onClick={() => handleSelectBookingGroup(bookingsForActivity, groupMeta)}
                                                                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-all duration-300 text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FaInfoCircle className="text-xl text-[#30d939] shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-semibold text-sm text-white">
                                                                            {bookingCount > 1
                                                                                ? `${activityName} (${bookingCount})`
                                                                                : activityName}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )
                                                    })
                                                })()}
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default BookingListView
