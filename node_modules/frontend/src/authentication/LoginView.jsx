import { useEffect, useState } from "react"
// Authentication hook for user context and login function
import { useAuthenticate } from "./useAuthenticate.jsx"
// React Router hook for navigation
import { useNavigate } from "react-router"
// Validation patterns for email and password
import { emailPattern, passwordPattern } from "../utils/validationPatterns.js"

function LoginView() {
    const navigate = useNavigate()
    const { login, status, user } = useAuthenticate()

    // Form input state (controlled components)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    // Validation error messages displayed below inputs
    const [validationErrors, setValidationErrors] = useState({})

    // Validates email and password using regex patterns, returns true if valid
    const validateForm = () => {
        const errors = {}
        if (!emailPattern.test(email.trim())) {
            errors.email = "Enter a valid email address (e.g. name@example.com)."
        }
        if (!passwordPattern.test(password)) {
            errors.password = "Password must be at least 4 characters long."
        }
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handles form submission: validates inputs, then calls login() from useAuthenticate hook
    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validateForm()) {
            return
        }
        login(email.trim(), password)
    }
    
    // Auto-redirects to profile page when user becomes authenticated
    useEffect(() => {
        if (user) {
            navigate("/authenticate/profile")
        }
    }, [user, navigate])

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-16 px-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Welcome Back!</h2>
                    <p className="text-lg md:text-xl opacity-90">Please log in to access your account</p>
                </div>
                
                {/* Login form: validates inputs and calls login() on submit */}
                <form 
                    onSubmit={handleSubmit}
                    className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] max-w-md mx-auto"
                >
                    {/* Email input: controlled component, clears error on change */}
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
                    
                    {/* Password input: controlled component, masked, clears error on change */}
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
                    
                    {/* Submit button: disabled during authentication, shows spinner when status === "authenticating" */}
                    <button
                        type="submit"
                        className="w-full bg-white text-[#30d939] py-4 px-8 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        disabled={status === "authenticating"}
                    >
                        {status === "authenticating" 
                            ? <span className="loading loading-spinner"></span>
                            : <span>Login</span> 
                        }
                    </button>
                </form>
                
                {/* Server error message: displays when status contains error (filters out "authenticating", "resuming", "loaded") */}
                {status && status !== "authenticating" && status !== "resuming" && status !== "loaded" && (
                    <div className="mt-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center max-w-md mx-auto">
                        <span>{status}</span>
                    </div>
                )}
            </div>
        </section>
    )
}

export default LoginView
