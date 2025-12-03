import { useEffect, useState } from "react"
// Authentication hook for user context
import { useAuthenticate } from "../authentication/useAuthenticate.jsx"
// Navigation hook: redirects to home page if user is already logged in
import { useNavigate } from "react-router"
// API utilities for backend communication
import { fetchAPI } from "../services/api.mjs"
// Validation patterns for name, email, and password
import { namePattern, emailPattern, passwordPattern } from "../utils/validationPatterns.js"

function RegisterView() {
    const navigate = useNavigate()
    const { user } = useAuthenticate()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})

    // Validates first name, last name, email, password, and password confirmation using regex patterns
    const validateForm = () => {
        const errors = {}

        if (!namePattern.test(firstName.trim())) {
            errors.firstName = "First name must start with a letter and only use letters, numbers, spaces, hyphens, apostrophes, or commas."
        }

        if (!namePattern.test(lastName.trim())) {
            errors.lastName = "Last name must start with a letter and only use letters, numbers, spaces, hyphens, apostrophes, or commas."
        }

        if (!emailPattern.test(email.trim())) {
            errors.email = "Enter a valid email address (e.g. name@example.com)."
        }

        if (!passwordPattern.test(password)) {
            errors.password = "Password must be at least 4 characters long."
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords must match."
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }
    
    // Redirects to home page if user is already logged in
    useEffect(() => {
        if (user) {
            navigate("/")
        }
    }, [user, navigate])

    // Handles registration: validates form and sends POST request to backend to create new user account
    const handleRegister = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const response = await fetchAPI("POST", "/users/register", {
                email: email.trim(),
                password,
                firstName: firstName.trim(),
                lastName: lastName.trim()
            }, null)

            if (response.status === 201) {
                setSuccess(true)
                // Redirects to login page after 2 seconds
                setTimeout(() => {
                    navigate("/authenticate/login")
                }, 2000)
            } else {
                setError(response.body?.message || "Registration failed")
            }
        } catch (error) {
            setError(String(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-160px)] flex items-center py-16 px-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Join High Street Gym</h2>
                    <p className="text-lg md:text-xl opacity-90">Create your account to start your fitness journey</p>
                </div>
                
                {/* Registration form: handles user registration with validation */}
                <form 
                    onSubmit={handleRegister}
                    className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] max-w-md mx-auto"
                >
                    {/* First name input: controlled component with validation */}
                    <div className="mb-5">
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
                            placeholder="Enter your first name"
                            required
                        />
                        {/* First name validation error message */}
                        {validationErrors.firstName && (
                            <p className="mt-2 text-sm text-red-300">{validationErrors.firstName}</p>
                        )}
                    </div>
                    
                    {/* Last name input: controlled component with validation */}
                    <div className="mb-5">
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
                            placeholder="Enter your last name"
                            required
                        />
                        {/* Last name validation error message */}
                        {validationErrors.lastName && (
                            <p className="mt-2 text-sm text-red-300">{validationErrors.lastName}</p>
                        )}
                    </div>
                    
                    {/* Email input: controlled component with validation */}
                    <div className="mb-5">
                        <label htmlFor="email" className="block mb-2 font-semibold text-[#30d939] text-base">
                            Email Address:
                        </label>
                        <input
                            id="email"
                            value={email}
                            onChange={e => {
                                setEmail(e.target.value)
                                if (validationErrors.email) {
                                    setValidationErrors(prev => ({ ...prev, email: undefined }))
                                }
                            }}
                            className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                            type="email" 
                            placeholder="Enter your email"
                            required
                        />
                        {/* Email validation error message */}
                        {validationErrors.email && (
                            <p className="mt-2 text-sm text-red-300">{validationErrors.email}</p>
                        )}
                    </div>
                    
                    {/* Password input: controlled component with validation */}
                    <div className="mb-5">
                        <label htmlFor="password" className="block mb-2 font-semibold text-[#30d939] text-base">
                            Password:
                        </label>
                        <input
                            id="password"
                            value={password}
                            onChange={e => {
                                setPassword(e.target.value)
                                if (validationErrors.password) {
                                    setValidationErrors(prev => ({ ...prev, password: undefined }))
                                }
                                if (validationErrors.confirmPassword) {
                                    setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
                                }
                            }}
                            className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                            type="password"
                            placeholder="Enter your password"
                            required
                        />
                        {/* Password validation error message */}
                        {validationErrors.password && (
                            <p className="mt-2 text-sm text-red-300">{validationErrors.password}</p>
                        )}
                    </div>
                    
                    {/* Confirm password input: controlled component with validation */}
                    <div className="mb-5">
                        <label htmlFor="confirmPassword" className="block mb-2 font-semibold text-[#30d939] text-base">
                            Confirm Password:
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
                            placeholder="Confirm your password"
                            required
                        />
                        {/* Confirm password validation error message */}
                        {validationErrors.confirmPassword && (
                            <p className="mt-2 text-sm text-red-300">{validationErrors.confirmPassword}</p>
                        )}
                    </div>
                    
                    {/* Submit button: displays spinner during registration */}
                    <button
                        type="submit"
                        className="w-full bg-white text-[#30d939] py-4 px-8 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        disabled={loading}
                    >
                        {loading 
                            ? <span className="loading loading-spinner"></span>
                            : <span>Register</span> 
                        }
                    </button>
                </form>
                
                {/* Error message: displays if registration fails */}
                {error && (
                    <div className="mt-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center max-w-md mx-auto">
                        <span>{error}</span>
                    </div>
                )}
                
                {/* Success message: displays when registration is successful */}
                {success && (
                    <div className="mt-6 bg-green-500/20 border border-green-500 text-white p-4 rounded-lg text-center max-w-md mx-auto">
                        <span>Registration successful! Redirecting to login...</span>
                    </div>
                )}
                
                {/* Login link: navigates to login page */}
                <div className="mt-6 text-center">
                    <p className="text-white/80 text-sm">
                        Already have an account?{" "}
                        <button
                            onClick={() => navigate("/authenticate/login")}
                            className="text-[#30d939] font-semibold hover:underline"
                        >
                            Login here
                        </button>
                    </p>
                </div>
            </div>
        </section>
    )
}

export default RegisterView

