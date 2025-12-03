// Base URL for backend API
export const API_BASE_URL = "http://localhost:8080/api"

/**
 * Centralized API fetch utility function
 * 
 * @param {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string} method - HTTP Method
 * @param {string | null} route - API route starting with / (e.g., "/blogs", "/sessions")
 * @param {object | null} body - Body data object (will be JSON stringified)
 * @param {string | null} authKey - Optional authentication key header (x-auth-key)
 * @returns {Promise<{status: number, body: any}>} Result of API fetch request with status and parsed body
 */
export async function fetchAPI(method, route, body, authKey) {
    const headers = {
        "Content-Type": "application/json",
    }

    // Adds authentication header if authKey is provided
    if (authKey) {
        headers["x-auth-key"] = authKey
    }

    try {
        const response = await fetch(API_BASE_URL + route, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        })

        const status = response.status

        // Parses response body based on content type (JSON or text)
        const contentType = response.headers.get("content-type")
        let responseBody = null
        
        if (contentType && contentType.includes("application/json")) {
            const text = await response.text()
            responseBody = text ? JSON.parse(text) : null
        } else {
            responseBody = await response.text()
        }

        return {
            status,
            body: responseBody
        }
    } catch (error) {
        // Provides user-friendly error message for connection failures
        if (error instanceof TypeError && error.message === "Failed to fetch") {
            throw "Unable to connect to the server. Please ensure the backend is running on http://localhost:8080"
        }
        throw String(error)
    }
}

