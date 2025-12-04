import { useCallback, useEffect, useState } from "react"
import { FaSearch, FaInfoCircle, FaTrash, FaDownload } from "react-icons/fa"
// API utilities for backend communication
import { fetchAPI, API_BASE_URL } from "../services/api.mjs"
// React Router hooks for navigation and URL params
import { useNavigate, useSearchParams } from "react-router"
// Authentication hook for user context
import { useAuthenticate } from "../authentication/useAuthenticate.jsx"

function SessionListView() {
    const { user } = useAuthenticate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [sessions, setSessions] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exportStartDate, setExportStartDate] = useState("")
    const [exportEndDate, setExportEndDate] = useState("")
    const [exportingWeekly, setExportingWeekly] = useState(false)
    const [exportWeeklyError, setExportWeeklyError] = useState(null)
    const [selectedSession, setSelectedSession] = useState(null)
    const [selectedSessionError, setSelectedSessionError] = useState(null)
    const [bookingSelectedSession, setBookingSelectedSession] = useState(false)
    const [bookingSelectedSessionError, setBookingSelectedSessionError] = useState(null)
    const [cancelingSelectedSession, setCancelingSelectedSession] = useState(false)
    const [cancelSelectedSessionError, setCancelSelectedSessionError] = useState(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [selectedSessionGroup, setSelectedSessionGroup] = useState([])
    const [selectedSessionGroupMeta, setSelectedSessionGroupMeta] = useState(null)

    // Initializes showMySessions from URL query parameter, defaults to false (All Sessions)
    const [showMySessions, setShowMySessions] = useState(() => {
        return searchParams.get("mySessions") === "true"
    })
    const navigate = useNavigate()

    // Syncs showMySessions state when URL query parameter changes
    useEffect(() => {
        const mySessionsParam = searchParams.get("mySessions")
        const shouldShowMySessions = mySessionsParam === "true"
        if (shouldShowMySessions !== showMySessions) {
            setShowMySessions(shouldShowMySessions)
        }
    }, [searchParams])

    // Clears selected session state when showMySessions changes
    useEffect(() => {
        setSelectedSession(null)
        setSelectedSessionError(null)
        setBookingSelectedSession(false)
        setBookingSelectedSessionError(null)
        setCancelingSelectedSession(false)
        setCancelSelectedSessionError(null)
        setShowCancelModal(false)
        setSelectedSessionGroup([])
        setSelectedSessionGroupMeta(null)
    }, [showMySessions])

    // Fetches sessions list from backend API
    // Endpoint varies by showMySessions: "/sessions/self" for trainers/admins, "/sessions" for all
    const getSessions = useCallback(async () => {
        setLoading(true)
        setError(null)
        
        // Show warning if guest tries to access My Sessions
        if (showMySessions && (!user || (user.role !== "trainer" && user.role !== "admin"))) {
            setError("Access denied: My Sessions is only available to trainers and administrators.")
            setSessions([])
            setLoading(false)
            return
        }
        
        try {
            const route = showMySessions ? "/sessions/self" : "/sessions"
            const authKey = showMySessions ? localStorage.getItem("authKey") : null
            const response = await fetchAPI("GET", route, null, authKey)
            
            if (response.status === 200) {
                const sessions = response.body || []
                
                if (sessions.length > 0) {
                    setSessions(sessions)
                    setError(null)
                } else {
                    setSessions([])
                    setError(showMySessions ? "No sessions found for you" : "No sessions found")
                }
            } else {
                setError(response.body?.message || "Failed to load sessions")
                setSessions([])
            }
        } catch (error) {
            console.error("Error fetching sessions:", error)
            setError(String(error))
            setSessions([])
        } finally {
            setLoading(false)
        }
    }, [showMySessions, user])

    useEffect(() => {
        getSessions()
    }, [getSessions])

    // Group sessions by month and day (similar to backend)
    const groupSessionsByDay = (sessions) => {
        const grouped = {}

        if (!Array.isArray(sessions)) {
            return grouped
        }

        sessions.forEach((session) => {
            const sessionDate = new Date(session.sessionDate)
            const year = sessionDate.getFullYear()
            const month = sessionDate.getMonth() + 1 // Month is 0-indexed, so add 1
            const dayOfWeek = sessionDate.toLocaleString("en-AU", { 
                weekday: "long", 
                timeZone: "Australia/Brisbane" 
            })
            const dayOfMonth = sessionDate.getDate()

            const yearMonthKey = `${year}-${month < 10 ? `0${month}` : month}` // Format as "YYYY-MM"
            const formattedDate = `${year}-${month < 10 ? `0${month}` : month}-${dayOfMonth < 10 ? `0${dayOfMonth}` : dayOfMonth}`
            const dayKey = `${formattedDate} - ${dayOfWeek}`

            // Ensure year-month group exists
            if (!grouped[yearMonthKey]) {
                grouped[yearMonthKey] = {}
            }

            // Ensure day of week group exists within year-month group
            if (!grouped[yearMonthKey][dayKey]) {
                grouped[yearMonthKey][dayKey] = []
            }

            // Add session to the corresponding day group
            grouped[yearMonthKey][dayKey].push(session)
        })

        return grouped
    }

    // Format date only for display
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

    // Format time only for display
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

    // Exports weekly sessions as XML file (only for trainers/admins viewing their own sessions)
    const handleExportWeeklySessions = async () => {
        setExportWeeklyError(null)

        if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
            setExportWeeklyError("Start date cannot be after end date.")
            return
        }

        const authKey = localStorage.getItem("authKey")
        if (!authKey) {
            setExportWeeklyError("Authentication required. Please log in.")
            return
        }

        setExportingWeekly(true)
        try {
            const params = new URLSearchParams()
            if (exportStartDate) params.append("startDate", exportStartDate)
            if (exportEndDate) params.append("endDate", exportEndDate)

            const url = `${API_BASE_URL}/sessions/export/xml/weekly${params.toString() ? `?${params.toString()}` : ""}`
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-auth-key": authKey
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to export weekly sessions" }))
                throw new Error(errorData.message || "Failed to export weekly sessions")
            }

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            const contentDisposition = response.headers.get("Content-Disposition")
            let filename = "weekly-sessions.xml"
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/)
                if (match) {
                    filename = match[1]
                }
            }
            link.href = downloadUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
            console.error("Error exporting weekly sessions:", err)
            setExportWeeklyError(String(err))
        } finally {
            setExportingWeekly(false)
        }
    }

    // Displays session details from local sessions array (no API call needed)
    const handleViewSession = (sessionId, sessionGroup = null, groupMeta = null) => {
        setSelectedSessionError(null)
        setBookingSelectedSession(false)
        setBookingSelectedSessionError(null)
        setCancelingSelectedSession(false)
        setCancelSelectedSessionError(null)
        const session = sessions.find(s => s.id === sessionId)
        if (session) {
            setSelectedSession(session)
            if (sessionGroup) {
                setSelectedSessionGroup(sessionGroup)
                setSelectedSessionGroupMeta(groupMeta || null)
            }
        } else {
            setSelectedSession(null)
            setSelectedSessionError("Session details not available.")
        }
    }

    // Handles selection of a session group (multiple sessions for same activity/day)
    const handleSelectSessionGroup = (sessionGroup, meta) => {
        if (!Array.isArray(sessionGroup) || sessionGroup.length === 0) {
            return
        }
        setSelectedSessionGroup(sessionGroup)
        setSelectedSessionGroupMeta(meta || null)
        handleViewSession(sessionGroup[0].id, sessionGroup, meta)
    }

    // Switches between multiple session options within a selected group
    const handleSelectSessionOption = (sessionId) => {
        if (!sessionId) {
            return
        }
        handleViewSession(sessionId, selectedSessionGroup, selectedSessionGroupMeta)
    }

    const handleCloseSessionDetails = () => {
        setSelectedSession(null)
        setSelectedSessionError(null)
        setBookingSelectedSession(false)
        setBookingSelectedSessionError(null)
        setCancelingSelectedSession(false)
        setCancelSelectedSessionError(null)
        setShowCancelModal(false)
        setSelectedSessionGroup([])
        setSelectedSessionGroupMeta(null)
    }

    // Creates a booking for the selected session (members only)
    const handleBookSelectedSession = async () => {
        if (!selectedSession) {
            setBookingSelectedSessionError("Unable to determine session.")
            return
        }
        if (!user || user.role !== "member") {
            setBookingSelectedSessionError("Only members can book sessions.")
            return
        }

        setBookingSelectedSession(true)
        setBookingSelectedSessionError(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                setBookingSelectedSessionError("Authentication required. Please log in.")
                setBookingSelectedSession(false)
                return
            }
            const response = await fetchAPI("POST", "/bookings", { sessionId: selectedSession.id }, authKey)
            if (response.status === 201) {
                navigate("/bookings")
            } else {
                setBookingSelectedSessionError(response.body?.message || "Failed to add booking")
            }
        } catch (error) {
            setBookingSelectedSessionError(String(error))
        } finally {
            setBookingSelectedSession(false)
        }
    }

    // Opens the cancel session confirmation modal
    const handleOpenCancelModal = () => {
        if (!selectedSession) {
            setCancelSelectedSessionError("Unable to determine session.")
            return
        }
        if (!user || (user.role !== "trainer" && user.role !== "admin")) {
            setCancelSelectedSessionError("Only trainers and admins can cancel sessions.")
            return
        }
        if (user.role === "trainer" && selectedSession.trainerId !== user.id) {
            setCancelSelectedSessionError("You can only cancel your own sessions.")
            return
        }
        setShowCancelModal(true)
    }

    // Closes the cancel session confirmation modal
    const handleCloseCancelModal = () => {
        setShowCancelModal(false)
    }

    // Cancels/deletes a session (trainers and admins only, trainers can only cancel their own)
    const handleCancelSelectedSession = async () => {
        if (!selectedSession) {
            setCancelSelectedSessionError("Unable to determine session.")
            return
        }

        setShowCancelModal(false)
        setCancelingSelectedSession(true)
        setCancelSelectedSessionError(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                setCancelSelectedSessionError("Authentication required. Please log in.")
                setCancelingSelectedSession(false)
                return
            }
            const response = await fetchAPI("DELETE", `/sessions/${selectedSession.id}`, null, authKey)
            if (response.status === 200) {
                handleCloseSessionDetails()
                getSessions()
            } else {
                setCancelSelectedSessionError(response.body?.message || "Failed to cancel session")
            }
        } catch (error) {
            setCancelSelectedSessionError(String(error))
        } finally {
            setCancelingSelectedSession(false)
        }
    }

    // Format month name from year-month key
    const formatMonthYear = (yearMonthKey) => {
        const [year, month] = yearMonthKey.split("-")
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December']
        const monthName = monthNames[parseInt(month) - 1]
        return `${monthName} ${year}`
    }

    // Format day header (e.g., "Wed - 15/10")
    const formatDayHeader = (dayKey) => {
        const [datePart, dayName] = dayKey.split(" - ")
        const [year, month, dayNumber] = datePart.split("-")
        const australianDate = `${dayNumber}/${month}`
        const dayAbbreviation = dayName.substring(0, 3) // First 3 letters, capitalize first letter
        return {
            day: dayAbbreviation.charAt(0).toUpperCase() + dayAbbreviation.slice(1).toLowerCase(),
            date: australianDate
        }
    }

    const groupedSessions = groupSessionsByDay(sessions)

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-8 px-4">
            <div className="max-w-2xl w-full mx-auto">
                {/* Tab selector: switches between All Sessions and My Sessions (trainers/admins only) */}
                {user && (user.role === "trainer" || user.role === "admin") && (
                    <div className="sticky top-4 z-40 mb-6">
                        <div className="flex gap-2 bg-white/10 rounded-lg p-1">
                            {/* All Sessions tab button: shows all available sessions */}
                            <button
                                onClick={() => {
                                    setShowMySessions(false)
                                    setSearchParams({})
                                }}
                                className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all duration-300 ${
                                    !showMySessions
                                        ? "bg-[#30d939] text-[#6a2f6a]"
                                        : "text-white/80 hover:text-white"
                                }`}
                            >
                                All Sessions
                            </button>
                            {/* My Sessions tab button: shows only sessions created by current trainer/admin */}
                            <button
                                onClick={() => {
                                    setShowMySessions(true)
                                    setSearchParams({ mySessions: "true" })
                                }}
                                className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all duration-300 ${
                                    showMySessions
                                        ? "bg-[#30d939] text-[#6a2f6a]"
                                        : "text-white/80 hover:text-white"
                                }`}
                            >
                                My Sessions
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Main content container: holds export form, session details view, and sessions list */}
                <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939]">
                    {/* Export Weekly Sessions form: date range inputs and export button (only shown on My Sessions tab) */}
                    {showMySessions && user && (user.role === "trainer" || user.role === "admin") && (
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                                {/* Start date input: optional filter for export range */}
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-white/80 mb-1">Start Date (optional)</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-[#30d939]"
                                    />
                                </div>
                                {/* End date input: optional filter for export range */}
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-white/80 mb-1">End Date (optional)</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-[#30d939]"
                                    />
                                </div>
                                {/* Export button: triggers handleExportWeeklySessions() to download XML */}
                                <div className="flex-none w-full md:w-auto">
                                    <button
                                        onClick={handleExportWeeklySessions}
                                        disabled={exportingWeekly}
                                        className="w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 bg-[#30d939] text-[#6a2f6a] border-2 border-[#30d939] hover:bg-[#30d939]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaDownload />
                                        <span>{exportingWeekly ? "Exporting..." : "Export as XML"}</span>
                                    </button>
                                </div>
                            </div>
                            {/* Export error message: displays if export operation fails */}
                            {exportWeeklyError && (
                                <div className="mt-4 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm text-center">
                                    {exportWeeklyError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error message: displays if session details fetch fails */}
                    {selectedSessionError && (
                        <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                            <span>{selectedSessionError}</span>
                        </div>
                    )}

                    {/* Selected session details panel: displays full session information */}
                    {selectedSession && (
                        <div className="mb-6 bg-white/5 rounded-lg border border-white/20 p-6 space-y-4">
                            {/* Header: activity name and close button */}
                            <div className="flex justify-between items-start gap-4">
                                {/* Activity name display */}
                                <div className="flex-1">
                                    <p className="text-sm uppercase tracking-wide text-white/60 mb-1">Activity</p>
                                    <h3 className="text-2xl font-bold text-white">
                                        {selectedSession.activityName || `Session #${selectedSession.id}`}
                                    </h3>
                                </div>
                                {/* Close button: closes session details and returns to list view */}
                                <button
                                    onClick={handleCloseSessionDetails}
                                    className="text-white/70 hover:text-white text-sm font-semibold"
                                >
                                    Close ✕
                                </button>
                            </div>

                            {/* Day label: shown when multiple sessions exist for same day */}
                            {selectedSessionGroupMeta?.dayLabel && selectedSessionGroup.length > 1 && (
                                <p className="text-xs text-white/50 mt-1">
                                    {selectedSessionGroupMeta.dayLabel}
                                </p>
                            )}

                            {/* Session group navigation: buttons to switch between multiple sessions for same activity/day */}
                            {selectedSessionGroup.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedSessionGroup.map(sessionOption => {
                                        // Determines if this button represents the currently selected session
                                        const isSelected = selectedSession?.id === sessionOption.id
                                        // Session option button: shows time, location, trainer - click to view that session
                                        return (
                                            <button
                                                key={sessionOption.id}
                                                type="button"
                                                onClick={() => handleSelectSessionOption(sessionOption.id)}
                                                className={`px-4 py-2 rounded-full text-xs font-semibold border transition text-left ${
                                                    isSelected
                                                        ? "bg-[#30d939] text-[#6a2f6a] border-[#30d939]"
                                                        : "text-white/90 border-white/30 hover:border-white hover:text-white"
                                                }`}
                                                title="View this session option"
                                            >
                                                <div className="flex items-center gap-2 w-[230px]">
                                                    {/* Time display */}
                                                    <span className="font-semibold whitespace-nowrap">
                                                        {formatTime(sessionOption.sessionTime)}
                                                    </span>
                                                    <span className="text-white/60">•</span>
                                                    {/* Location display */}
                                                    <span className="text-[0.75rem] text-white/90 truncate max-w-[70px]">
                                                        {sessionOption.locationName || `Location #${sessionOption.locationId}`}
                                                    </span>
                                                    <span className="text-white/60">•</span>
                                                    {/* Trainer display */}
                                                    <span className="text-[0.75rem] text-white/90 truncate max-w-[70px]">
                                                        {sessionOption.trainerName || `Trainer #${sessionOption.trainerId}`}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Activity description: shown if available */}
                            {selectedSession.activityDescription && (
                                <p className="text-white/80 text-sm border-l-4 border-[#30d939] pl-3">
                                    {selectedSession.activityDescription}
                                </p>
                            )}

                            {/* Session details: time, location, trainer information */}
                            <div className="bg-white/10 rounded-lg p-4 space-y-3 relative">
                                {/* Session date and time display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Time</p>
                                    <p className="text-white font-semibold">
                                        {selectedSession ? `${formatDate(selectedSession.sessionDate)} · ${formatTime(selectedSession.sessionTime)}` : "N/A"}
                                    </p>
                                </div>
                                {/* Location name display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Location</p>
                                    <p className="text-white font-semibold">
                                        {selectedSession.locationName || `Location #${selectedSession.locationId}`}
                                    </p>
                                </div>
                                {/* Trainer name display */}
                                <div>
                                    <p className="text-xs uppercase text-white/60">Trainer</p>
                                    <p className="text-white font-semibold">
                                        {(() => {
                                            const trainerName = selectedSession.trainerName || `Trainer #${selectedSession.trainerId}`
                                            const isSelf = user && selectedSession.trainerId === user.id
                                            return isSelf ? `${trainerName} (Self)` : trainerName
                                        })()}
                                    </p>
                                </div>
                                {/* Cancel/Delete button: shown only for admin or session owner (trainer) */}
                                {user && (user.role === "trainer" || user.role === "admin") && (user.role === "admin" || selectedSession.trainerId === user.id) && (
                                    <button
                                        onClick={handleOpenCancelModal}
                                        disabled={cancelingSelectedSession}
                                        className="absolute bottom-4 right-4 text-red-300 hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={cancelingSelectedSession ? "Canceling..." : "Cancel this Session"}
                                    >
                                        <FaTrash className="text-lg" />
                                    </button>
                                )}
                            </div>

                            {/* Book session button: shown only for members */}
                            {user && user.role === "member" && (
                                <div className="mt-4">
                                    <button
                                        onClick={handleBookSelectedSession}
                                        disabled={bookingSelectedSession}
                                        className="w-full bg-[#30d939] text-[#6a2f6a] font-semibold py-3 px-6 rounded-full text-center hover:bg-[#30d939]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bookingSelectedSession ? "Adding..." : "Book this Session"}
                                    </button>
                                    {/* Booking error message: shown if booking operation fails */}
                                    {bookingSelectedSessionError && (
                                        <div className="mt-3 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm text-center">
                                            {bookingSelectedSessionError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cancel operation error message: shown if cancel/delete fails */}
                            {user && (user.role === "trainer" || user.role === "admin") && (user.role === "admin" || selectedSession.trainerId === user.id) && cancelSelectedSessionError && (
                                <div className="mt-2 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-sm text-center">
                                    {cancelSelectedSessionError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cancel Session Confirmation Modal: shown when user clicks cancel button */}
                    {showCancelModal && selectedSession && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-[#6a2f6a] border-2 border-[#30d939] rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl">
                                {/* Modal header */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-[#30d939] mb-2">Confirm Cancellation</h3>
                                    <p className="text-white/90">
                                        Are you sure you want to cancel this session?
                                    </p>
                                    <p className="text-red-300 text-sm mt-2 font-semibold">
                                        This action cannot be undone.
                                    </p>
                                </div>
                                
                                {/* Session preview */}
                                <div className="bg-white/10 rounded-lg p-4 mb-6">
                                    <p className="text-white font-semibold mb-2">
                                        {selectedSession.activityName || `Activity #${selectedSession.activityId}`}
                                    </p>
                                    <div className="space-y-1 text-sm text-white/80">
                                        <p>
                                            <span className="font-semibold">Date:</span> {formatDate(selectedSession.sessionDate)}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Time:</span> {formatTime(selectedSession.sessionTime)}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Location:</span> {selectedSession.locationName || `Location #${selectedSession.locationId}`}
                                        </p>
                                    </div>
                                </div>

                                {/* Modal action buttons */}
                                <div className="flex gap-3">
                                    {/* Cancel button */}
                                    <button
                                        onClick={handleCloseCancelModal}
                                        disabled={cancelingSelectedSession}
                                        className="flex-1 bg-white/20 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Keep Session
                                    </button>
                                    {/* Confirm cancel button */}
                                    <button
                                        onClick={handleCancelSelectedSession}
                                        disabled={cancelingSelectedSession}
                                        className="flex-1 bg-red-600 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-red-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cancelingSelectedSession ? (
                                            <span className="loading loading-spinner loading-sm"></span>
                                        ) : (
                                            "Cancel Session"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sessions list error message: displays if fetching sessions fails */}
                    {error && (
                        <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading state: spinner shown while fetching sessions list */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-xl"></span>
                        </div>
                    ) : !error && sessions.length === 0 ? (
                        // Empty state: shown when no sessions found
                        <div className="p-8 text-center">
                            <p className="text-white/80">No sessions available</p>
                        </div>
                    ) : (
                        // Sessions list: grouped by month/year, then by day, then by activity
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                            {Object.keys(groupedSessions).sort().map(yearMonth => (
                                <div key={yearMonth} className="space-y-4">
                                    {/* Month/Year header: sticky header for each month section */}
                                    <div className="sticky top-0 bg-[#6a2f6a] z-10 pb-2">
                                        <h3 className="text-xl font-bold text-[#30d939]">
                                            {formatMonthYear(yearMonth)}
                                        </h3>
                                    </div>
                                    
                                    {/* Days within the month: each day has its own section */}
                                    {Object.keys(groupedSessions[yearMonth]).sort().map(day => {
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
                                            
                                            {/* Activity buttons: groups sessions by activity name, clickable to view session group */}
                                            <div className="space-y-2 pl-4">
                                                {(() => {
                                                    // Groups sessions by activity name within each day
                                                    const activityGroups = {}
                                                    groupedSessions[yearMonth][day].forEach(session => {
                                                        const activityName = session.activityName || `Session #${session.id}`
                                                        if (!activityGroups[activityName]) {
                                                            activityGroups[activityName] = []
                                                        }
                                                        activityGroups[activityName].push(session)
                                                    })
                                                    
                                                    // Display each unique activity once per day
                                                    return Object.keys(activityGroups).map(activityName => {
                                                        const sessionsForActivity = activityGroups[activityName]
                                                        const sessionCount = sessionsForActivity.length
                                                        const groupMeta = {
                                                            activityName,
                                                            dayLabel: `${dayHeader.day} - ${dayHeader.date}`
                                                        }
                                                        
                                                        // Activity button: shows activity name and count, click to view session group
                                                        return (
                                                            <button
                                                                key={activityName}
                                                                type="button"
                                                                onClick={() => handleSelectSessionGroup(sessionsForActivity, groupMeta)}
                                                                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-all duration-300 text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FaInfoCircle className="text-xl text-[#30d939] shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-semibold text-sm text-white">
                                                                            {sessionCount > 1
                                                                                ? `${activityName} (${sessionCount})`
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

export default SessionListView
