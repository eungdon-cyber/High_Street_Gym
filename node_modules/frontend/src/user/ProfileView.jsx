import { useEffect, useState } from "react"
// Authentication hook for user context
import { useAuthenticate } from "../authentication/useAuthenticate.jsx"
// React Router hooks for navigation and location
import { useNavigate, useLocation } from "react-router"
// API utilities for backend communication
import { fetchAPI } from "../services/api.mjs"
// Validation patterns for name and password
import { namePattern, passwordPattern } from "../utils/validationPatterns.js"

function ProfileView() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, status, refresh } = useAuthenticate()
    const [isEditing, setIsEditing] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [loading, setLoading] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})

    // Redirects to login page if user is not authenticated
    useEffect(() => {
        if (status !== "resuming" && !user) {
            navigate("/authenticate/login")
        }
    }, [user, status, navigate])

    // Syncs form fields with user data when user changes
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "")
            setLastName(user.lastName || "")
        }
    }, [user])

    // Resets to view mode when profile icon is clicked (reset signal from Layout)
    useEffect(() => {
        if (location.state?.reset && isEditing) {
            setIsEditing(false)
            if (user) {
                setFirstName(user.firstName || "")
                setLastName(user.lastName || "")
            }
            setPassword("")
            setConfirmPassword("")
            setError(null)
            setSuccess(null)
            setValidationErrors({})
            // Clears the reset state to prevent repeated resets
            navigate(location.pathname, { state: {}, replace: true })
        }
    }, [location.state, isEditing, user, navigate, location.pathname])

    // Loading state: shown while user data is being fetched
    if (!user) {
        return (
            <section className="flex items-center justify-center min-h-[60vh]">
                <span className="loading loading-spinner loading-xl"></span>
            </section>
        )
    }

    // Capitalizes first letter of a string
    const capitalizeFirst = (str) => {
        if (!str) return ""
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    // Switches to edit mode and clears form state
    const handleEdit = () => {
        setIsEditing(true)
        setError(null)
        setSuccess(null)
        setPassword("")
        setConfirmPassword("")
        setValidationErrors({})
    }

    // Cancels editing and resets form to original user values
    const handleCancel = () => {
        setIsEditing(false)
        setFirstName(user.firstName || "")
        setLastName(user.lastName || "")
        setPassword("")
        setConfirmPassword("")
        setError(null)
        setSuccess(null)
        setValidationErrors({})
    }

    // Validates first name, last name, and password using regex patterns
    const validateForm = () => {
        const errors = {}
        
        if (!namePattern.test(firstName.trim())) {
            errors.firstName = "First name must start with a letter and can only contain letters, numbers, spaces, hyphens, apostrophes, and commas."
        }
        
        if (!namePattern.test(lastName.trim())) {
            errors.lastName = "Last name must start with a letter and can only contain letters, numbers, spaces, hyphens, apostrophes, and commas."
        }
        
        if (password) {
            if (!passwordPattern.test(password)) {
                errors.password = "Password must be at least 4 characters long."
            }
            if (password !== confirmPassword) {
                errors.confirmPassword = "Passwords do not match."
            }
        }
        
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handles profile update: validates form, checks for changes, sends PUT request to backend
    const handleUpdate = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!validateForm()) {
            return
        }

        // Checks if any values have actually changed
        const firstNameChanged = firstName !== user.firstName
        const lastNameChanged = lastName !== user.lastName
        const passwordChanged = password && password.length > 0

        if (!firstNameChanged && !lastNameChanged && !passwordChanged) {
            setError("No changes detected. Please modify at least one field before saving.")
            return
        }

        setLoading(true)

        try {
            const authKey = localStorage.getItem("authKey")
            const updateData = {}

            // Only includes fields that have actually changed
            if (firstNameChanged) {
                updateData.firstName = firstName
            }
            if (lastNameChanged) {
                updateData.lastName = lastName
            }
            if (passwordChanged) {
                updateData.password = password
            }

            const response = await fetchAPI("PUT", "/users/self", updateData, authKey)

            if (response.status === 200) {
                setSuccess(response.body?.message || "Profile updated successfully!")
                
                // If password was changed, redirects to login page after 2 seconds
                if (password) {
                    setTimeout(() => {
                        navigate("/authenticate/login")
                    }, 2000)
                } else {
                    refresh()
                    setIsEditing(false)
                }
            } else {
                setError(response.body?.message || "Failed to update profile")
            }
        } catch (error) {
            setError(String(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-16 px-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                        Welcome back, {user.firstName}!
                    </h2>
                    <p className="text-lg md:text-xl opacity-90">Your Profile Information</p>
                </div>
                
                {/* Profile form container: displays view mode or edit mode based on isEditing state */}
                <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] max-w-md mx-auto">
                    {!isEditing ? (
                        // View mode: displays user information as read-only fields
                        <>
                            <div className="space-y-4">
                                {/* Role display: read-only */}
                                <div className="flex justify-between items-center py-2 border-b border-white/20">
                                    <strong className="text-[#30d939]">Role:</strong>
                                    <span>{capitalizeFirst(user.role)}</span>
                                </div>
                                {/* First name display: read-only */}
                                <div className="flex justify-between items-center py-2 border-b border-white/20">
                                    <strong className="text-[#30d939]">First Name:</strong>
                                    <span>{user.firstName}</span>
                                </div>
                                {/* Last name display: read-only */}
                                <div className="flex justify-between items-center py-2 border-b border-white/20">
                                    <strong className="text-[#30d939]">Last Name:</strong>
                                    <span>{user.lastName}</span>
                                </div>
                                {/* Email display: read-only */}
                                <div className="flex justify-between items-center py-2">
                                    <strong className="text-[#30d939]">Email:</strong>
                                    <span className="text-sm break-all">{user.email}</span>
                                </div>
                            </div>
                            {/* Edit button: switches to edit mode */}
                            <button
                                onClick={handleEdit}
                                className="w-full mt-6 bg-white text-[#30d939] py-3 px-6 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Edit Profile
                            </button>
                        </>
                    ) : (
                        // Edit mode: displays editable form fields
                        <form onSubmit={handleUpdate}>
                            <div className="space-y-4">
                                {/* Role display: read-only in edit mode */}
                                <div className="flex justify-between items-center py-2 border-b border-white/20">
                                    <strong className="text-[#30d939]">Role:</strong>
                                    <span>{capitalizeFirst(user.role)}</span>
                                </div>
                                
                                {/* First name input: controlled component with validation */}
                                <div>
                                    <label htmlFor="firstName" className="block mb-2 font-semibold text-[#30d939] text-base">
                                        First Name:
                                    </label>
                                    <input
                                        id="firstName"
                                        value={firstName}
                                        onChange={e => {
                                            setFirstName(e.target.value)
                                            if (validationErrors.firstName) {
                                                setValidationErrors(prev => ({ ...prev, firstName: undefined }))
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                                        type="text"
                                        required
                                    />
                                    {/* First name validation error message */}
                                    {validationErrors.firstName && (
                                        <p className="mt-2 text-sm text-red-300">{validationErrors.firstName}</p>
                                    )}
                                </div>
                                
                                {/* Last name input: controlled component with validation */}
                                <div>
                                    <label htmlFor="lastName" className="block mb-2 font-semibold text-[#30d939] text-base">
                                        Last Name:
                                    </label>
                                    <input
                                        id="lastName"
                                        value={lastName}
                                        onChange={e => {
                                            setLastName(e.target.value)
                                            if (validationErrors.lastName) {
                                                setValidationErrors(prev => ({ ...prev, lastName: undefined }))
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                                        type="text"
                                        required
                                    />
                                    {/* Last name validation error message */}
                                    {validationErrors.lastName && (
                                        <p className="mt-2 text-sm text-red-300">{validationErrors.lastName}</p>
                                    )}
                                </div>
                                
                                {/* Email display: read-only in edit mode */}
                                <div className="flex justify-between items-center py-2 border-b border-white/20">
                                    <strong className="text-[#30d939]">Email:</strong>
                                    <span className="text-sm break-all">{user.email}</span>
                                </div>
                                
                                {/* Password input: optional, controlled component with validation */}
                                <div>
                                    <label htmlFor="password" className="block mb-2 font-semibold text-[#30d939] text-base">
                                        New Password (optional):
                                    </label>
                                    <input
                                        id="password"
                                        value={password}
                                        onChange={e => {
                                            setPassword(e.target.value)
                                            if (validationErrors.password) {
                                                setValidationErrors(prev => ({ ...prev, password: undefined }))
                                            }
                                            if (validationErrors.confirmPassword && confirmPassword) {
                                                setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                                        type="password"
                                        placeholder="Leave blank to keep current password"
                                    />
                                    {/* Password validation error message */}
                                    {validationErrors.password && (
                                        <p className="mt-2 text-sm text-red-300">{validationErrors.password}</p>
                                    )}
                                </div>
                                
                                {/* Confirm password input: shown only when password is entered */}
                                {password && (
                                    <div>
                                        <label htmlFor="confirmPassword" className="block mb-2 font-semibold text-[#30d939] text-base">
                                            Confirm New Password:
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={e => {
                                                setConfirmPassword(e.target.value)
                                                if (validationErrors.confirmPassword) {
                                                    setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
                                                }
                                            }}
                                            className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                                            type="password"
                                            placeholder="Confirm new password"
                                        />
                                        {/* Confirm password validation error message */}
                                        {validationErrors.confirmPassword && (
                                            <p className="mt-2 text-sm text-red-300">{validationErrors.confirmPassword}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Form action buttons: Cancel and Save */}
                            <div className="flex gap-3 mt-6">
                                {/* Cancel button: cancels editing and resets form */}
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 bg-white/20 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-white/30"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                {/* Save button: submits form to update profile */}
                                <button
                                    type="submit"
                                    className="flex-1 bg-white text-[#30d939] py-3 px-6 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    disabled={loading}
                                >
                                    {loading 
                                        ? <span className="loading loading-spinner"></span>
                                        : <span>Save</span>
                                    }
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                
                {/* Error message: displays if profile update fails */}
                {error && (
                    <div className="mt-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center max-w-md mx-auto">
                        <span>{error}</span>
                    </div>
                )}
                
                {/* Success message: displays when profile is updated successfully */}
                {success && (
                    <div className="mt-6 bg-green-500/20 border border-green-500 text-white p-4 rounded-lg text-center max-w-md mx-auto">
                        <span>{success}</span>
                    </div>
                )}
            </div>
        </section>
    )
}

export default ProfileView

