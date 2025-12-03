// React Router hooks for navigation, location, and URL params
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
// React Icons for navigation dock buttons
import { FaDumbbell, FaBook, FaCalendarCheck, FaUser, FaUserPlus } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
// Authentication hook for user context
import { useAuthenticate } from "./authentication/useAuthenticate.jsx";

function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, logout } = useAuthenticate();
    
    const isAuthenticated = !!user;

    // Common button styling for navigation dock
    const dockButtonBase = "flex flex-col items-center gap-1 px-3 py-2 bg-white/10 border-none rounded-[20px] cursor-pointer text-black transition-all duration-300 hover:bg-white/20 hover:text-white";
    const dockButtonActive = "bg-white/20 text-white font-semibold";
    const dockIconClass = "text-2xl";
    const dockLabelClass = "text-xs font-medium";

    // Generates user descriptor string: "FirstName LastName (role)" or "role" or "Guest"
    const getUserDescriptor = () => {
        if (!user) {
            return "Guest";
        }
        const nameParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        const roleLabel = user.role ? user.role.toLowerCase() : "member";
        if (nameParts) {
            return `${nameParts} (${roleLabel})`;
        }
        return roleLabel;
    };

    // Determines page title and meta information based on current route and URL params
    const getPageTitle = () => {
        const meta = getUserDescriptor();
        const path = location.pathname;
        if (path === "/") {
            // Check if it's "My Sessions" from URL params
            return { title: searchParams.get("mySessions") === "true" ? "My Sessions" : "All Sessions", meta };
        }
        if (path.startsWith("/blogs")) {
            return { title: path.startsWith("/blogs/") ? "Blog Post" : "Blog", meta };
        }
        if (path.startsWith("/bookings")) {
            // return { title: path.startsWith("/bookings/") ? "Booking Details" : "My Bookings", meta };
            return { title: "My Bookings", meta };
        }
        if (path.startsWith("/authenticate/login")) {
            return { title: "Login", meta };
        }
        if (path.startsWith("/authenticate/register")) {
            return { title: "Register", meta };
        }
        if (path.startsWith("/authenticate/profile")) {
            return { title: "Profile", meta: getUserDescriptor() };
        }
        return { title: "High Street Gym", meta };
    };

    const pageTitle = getPageTitle();

    // Handles authentication dock button click: logs out if authenticated, navigates to login otherwise
    const handleAuthDockClick = () => {
        if (isAuthenticated) {
            logout();
            navigate("/authenticate/login");
        } else {
            navigate("/authenticate/login");
        }
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Main content container: centered with max-width, contains header and page content */}
            <main className="max-w-[430px] min-h-screen mx-auto shadow pb-20 bg-white">
                {/* Sticky header wrapper: keeps header and page title visible while scrolling */}
                <div className="sticky top-0 z-50">
                    {/* Header: displays app title */}
                    <header className="bg-[#30d939] text-white">
                        <div className="flex justify-center items-center p-4">
                            <h1 className="text-2xl md:text-3xl font-extrabold uppercase text-black text-center">
                                High Street Gym
                            </h1>
                        </div>
                    </header>
                    {/* Page title band: displays current page title and user descriptor */}
                    <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-center px-5 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.1)] border-b border-white/20">
                        <h2 className="m-0 text-xl font-semibold text-white [text-shadow:1px_1px_2px_rgba(0,0,0,0.3)]">
                            {pageTitle.title}
                            {pageTitle.meta && (
                                <>
                                    {" - "}
                                    <span className="text-sm font-medium text-white/85">{pageTitle.meta}</span>
                                </>
                            )}
                        </h2>
                    </div>
                </div>
                {/* Outlet: renders child route components */}
                <Outlet />
            </main>
            {/* Navigation dock: fixed bottom navigation bar with app sections */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-around items-center bg-[#30d939] border-t-2 border-black px-5 py-2.5 z-[100]">
                {/* Sessions button: navigates to sessions list page */}
                <button
                    onClick={() => navigate("/")}
                    className={`${dockButtonBase} ${location.pathname === "/" ? dockButtonActive : ""}`}
                >
                    <FaDumbbell className={dockIconClass} />
                    <span className={dockLabelClass}>Sessions</span>
                </button>
                {/* Blog button: navigates to blog list page */}
                <button
                    onClick={() => navigate("/blogs")}
                    className={`${dockButtonBase} ${location.pathname.startsWith("/blogs") ? dockButtonActive : ""}`}
                >
                    <FaBook className={dockIconClass} />
                    <span className={dockLabelClass}>Blog</span>
                </button>
                {/* Bookings button: shown only for members and admins, navigates to bookings page */}
                {isAuthenticated && (user?.role === "member" || user?.role === "admin") && (
                    <button
                        onClick={() => navigate("/bookings")}
                        className={`${dockButtonBase} ${location.pathname.startsWith("/bookings") ? dockButtonActive : ""}`}
                    >
                        <FaCalendarCheck className={dockIconClass} />
                        <span className={dockLabelClass}>Bookings</span>
                    </button>
                )}
                {/* Profile/Join Now button: shows Profile for authenticated users, Join Now for guests */}
                {isAuthenticated ? (
                    <button
                        onClick={() => {
                            if (location.pathname.startsWith("/authenticate/profile")) {
                                // If already on profile page, navigates with reset state to return to view mode
                                navigate("/authenticate/profile", { state: { reset: true }, replace: true });
                            } else {
                                navigate("/authenticate/profile");
                            }
                        }}
                        className={`${dockButtonBase} ${location.pathname.startsWith("/authenticate/profile") ? dockButtonActive : ""}`}
                    >
                        <FaUser className={dockIconClass} />
                        <span className={dockLabelClass}>Profile</span>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate("/authenticate/register")}
                        className={`${dockButtonBase} ${location.pathname.startsWith("/authenticate/register") ? dockButtonActive : ""}`}
                    >
                        <FaUserPlus className={dockIconClass} />
                        <span className={dockLabelClass}>Join Now</span>
                    </button>
                )}
                {/* Login/Logout button: handles authentication actions */}
                <button
                    onClick={handleAuthDockClick}
                    className={`${dockButtonBase} ${
                        location.pathname.startsWith("/authenticate/login") ||
                        location.pathname.startsWith("/authenticate/register")
                            ? dockButtonActive
                            : ""
                    }`}
                >
                    <FaLock className={dockIconClass} />
                    <span className={dockLabelClass}>{isAuthenticated ? "Logout" : "Login"}</span>
                </button>
            </nav>
        </div>
    );
}

export default Layout;
