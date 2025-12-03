import { StrictMode } from 'react'
// React DOM client API for creating root and rendering
import { createRoot } from 'react-dom/client'
// Tailwind CSS styles
import './index.css'
// React Router for client-side routing
import { createBrowserRouter, RouterProvider } from 'react-router'
// Authentication context provider
import { AuthenticationProvider } from './authentication/useAuthenticate.jsx'
// View components for different routes
import BlogListView from './blog/BlogListView'
import LoginView from './authentication/LoginView'
import RegisterView from './user/RegisterView.jsx'
import ProfileView from './user/ProfileView.jsx'
import SessionListView from './sessions/SessionListView'
import BookingListView from './bookings/BookingListView'
// Layout component that wraps all routes
import Layout from './Layout'


// Router configuration: defines all application routes with their components
const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      // Home page: displays sessions list
      {
        index: true,
        Component: SessionListView
      },
      // Blog list page: displays blog posts
      {
        path: '/blogs',
        Component: BlogListView
      },
      // Bookings list page: displays user bookings
      {
        path: '/bookings',
        Component: BookingListView
      },
      // Booking detail page: displays specific booking details
      {
        path: '/bookings/:id',
        Component: BookingListView
      },
      // Login page: user authentication
      {
        path: '/authenticate/login',
        Component: LoginView
      },
      // Registration page: new user signup
      {
        path: '/authenticate/register',
        Component: RegisterView
      },
      // Profile page: user profile view and edit
      {
        path: '/authenticate/profile',
        Component: ProfileView
      }
    ]
  }
])

// Application entry point: creates React root and renders app with providers
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* AuthenticationProvider: provides authentication context to all child components */}
    <AuthenticationProvider>
      {/* RouterProvider: enables client-side routing throughout the app */}
      <RouterProvider router={router} />
    </AuthenticationProvider>
  </StrictMode>,
)
