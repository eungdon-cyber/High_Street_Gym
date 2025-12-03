import { createContext, useCallback, useContext, useEffect, useState } from "react"
// API utilities for backend communication
import { fetchAPI } from "../services/api.mjs"
// React Router hook for navigation
import { useNavigate } from "react-router"

const AuthenticationContext = createContext(null)

export function AuthenticationProvider({ children }) {
    // User and authentication status state shared via context
    const [user, setUser] = useState(null)
    const [status, setStatus] = useState("resuming")

    // Attempts to reload user from authKey saved in localStorage on mount
    useEffect(() => {
        const authenticationKey = localStorage.getItem("authKey")

        if (authenticationKey) {
            fetchAPI("GET", "/users/self", null, authenticationKey)
                .then(response => {
                    if (response.status === 200) {
                        setUser(response.body)
                        setStatus("loaded")
                    } else {
                        localStorage.removeItem("authKey")
                        setStatus(null)
                    }
                })
                .catch(error => {
                    localStorage.removeItem("authKey")
                    setStatus(null)
                })
        } else {
            setStatus(null)
        }
    }, [])

    // Provides user and status state to all children via context
    return <AuthenticationContext.Provider value={[user, setUser, status, setStatus]}>
        {children}
    </AuthenticationContext.Provider>
}

export function useAuthenticate(restrictToRoles = null) {
    const [user, setUser, status, setStatus] = useContext(AuthenticationContext)
    const navigate = useNavigate()

    // Fetches current user by authentication key
    const getUser = useCallback((authenticationKey) => {
        if (authenticationKey) {
            setStatus("loading")
            fetchAPI("GET", "/users/self", null, authenticationKey)
                .then(response => {
                    if (response.status === 200) {
                        setUser(response.body)
                        setStatus("loaded")
                    } else {
                        setStatus("invalid key")
                        localStorage.removeItem("authKey")
                    }
                })
                .catch(error => {
                    setStatus("invalid key")
                    localStorage.removeItem("authKey")
                })
        }
    }, [setUser, setStatus])

    // Handles user login: sends credentials to backend, stores authKey and user on success
    const login = useCallback((email, password) => {
        const body = {
            email,
            password
        }

        setStatus("authenticating")

        fetchAPI("POST", "/login", body, null)
            .then(response => {
                if (response.status === 200) {
                    const authenticationKey = response.body.key
                    localStorage.setItem("authKey", authenticationKey)
                    setUser(response.body.user)
                    setStatus("loaded")
                } else {
                    setStatus(response.body?.message || "Login failed")
                }
            })
            .catch(error => {
                console.error(error)
                setStatus(String(error))
            })
    }, [setStatus, setUser])

    // Handles user logout: clears authKey on backend and local state
    const logout = useCallback(() => {
        const authenticationKey = localStorage.getItem("authKey")
        
        if (authenticationKey) {
            fetchAPI("DELETE", "/logout", null, authenticationKey)
                .then(response => {
                    setUser(null)
                    setStatus(null)
                    localStorage.removeItem("authKey")
                })
                .catch(error => {
                    setUser(null)
                    setStatus(null)
                    localStorage.removeItem("authKey")
                })
        } else {
            setUser(null)
            setStatus(null)
        }
    }, [setUser, setStatus])

    // Refreshes user data from backend using stored authKey
    const refresh = useCallback(() => {
        const authenticationKey = localStorage.getItem("authKey")
        if (authenticationKey) {
            getUser(authenticationKey)
        }
    }, [getUser])

    // Role-based route protection: redirects to login if user doesn't have required role
    useEffect(() => {
        if (restrictToRoles
            && status !== "resuming"
            && (!user || !restrictToRoles.includes(user.role))) {
            navigate("/authenticate/login")
        }
    }, [user, status, restrictToRoles, navigate])

    return {
        user,
        login,
        logout,
        refresh,
        status,
    }
}

