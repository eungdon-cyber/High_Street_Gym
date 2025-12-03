import { useCallback, useEffect, useState } from "react"
import { FaInfoCircle, FaPlus, FaTrash, FaEdit } from "react-icons/fa"
// API utilities for backend communication
import { fetchAPI } from "../services/api.mjs"
// React Router hooks for navigation and location
import { useLocation } from "react-router"
// Authentication hook for user context
import { useAuthenticate } from "../authentication/useAuthenticate.jsx"
// Validation patterns for blog title and content
import { blogTitlePattern, blogContentPattern } from "../utils/validationPatterns.js"

function BlogListView() {
    const { user } = useAuthenticate()
    const [blogs, setBlogs] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [createTitle, setCreateTitle] = useState("")
    const [createContent, setCreateContent] = useState("")
    const [createError, setCreateError] = useState(null)
    const [createSuccess, setCreateSuccess] = useState(null)
    const [creating, setCreating] = useState(false)
    const [createValidationErrors, setCreateValidationErrors] = useState({})
    const [selectedBlog, setSelectedBlog] = useState(null)
    const [selectedBlogLoading, setSelectedBlogLoading] = useState(false)
    const [selectedBlogError, setSelectedBlogError] = useState(null)
    const [deletingBlog, setDeletingBlog] = useState(false)
    const [deleteError, setDeleteError] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const location = useLocation()

    // Fetches blogs list from backend API
    const getBlogs = useCallback(async () => {
        setLoading(true)
        setError(null)
        
        try {
            const response = await fetchAPI("GET", "/blogs", null, null)
            
            if (response.status === 200) {
                const blogs = response.body || []
                
                if (blogs.length > 0) {
                    setBlogs(blogs)
                    setError(null)
                } else {
                    setBlogs([])
                    setError("No blogs found")
                }
            } else {
                setError(response.body?.message || "Failed to load blogs")
                setBlogs([])
            }
        } catch (error) {
            console.error("Error fetching blogs:", error)
            setError(String(error))
            setBlogs([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Triggers getBlogs() on component mount and when getBlogs reference changes
    // useEffect schedules WHEN to fetch, getBlogs defines WHAT to fetch
    useEffect(() => {
        getBlogs()
    }, [getBlogs])

    // Clears form and selected blog state when navigating to /blogs route
    // Why needed: Ensures clean state on navigation, prevents stale form/blog data from persisting,
    // and handles browser back/forward navigation properly
    useEffect(() => {
        if (location.pathname === "/blogs") {
            setShowCreateForm(false)
            setCreateTitle("")
            setCreateContent("")
            setCreateError(null)
            setCreateSuccess(null)
            setSelectedBlog(null)
            setSelectedBlogError(null)
            setDeleteError(null)
        }
    }, [location.key, location.pathname])

    // Fetches single blog post details from backend API
    const handleViewBlog = async (blogId) => {
        setShowCreateForm(false)
        setCreateTitle("")
        setCreateContent("")
        setCreateError(null)
        setCreateSuccess(null)
        setSelectedBlogLoading(true)
        setSelectedBlogError(null)
        setDeleteError(null)
        setSelectedBlog(null)

        try {
            const response = await fetchAPI("GET", `/blogs/${blogId}`, null, null)
            if (response.status === 200) {
                setSelectedBlog(response.body)
            } else {
                setSelectedBlogError(response.body?.message || "Failed to load blog post")
            }
        } catch (error) {
            setSelectedBlogError(String(error))
        } finally {
            setSelectedBlogLoading(false)
        }
    }

    // Closes selected blog details view
    const handleCloseSelectedBlog = () => {
        setSelectedBlog(null)
        setSelectedBlogError(null)
        setDeleteError(null)
        setSelectedBlogLoading(false)
        setShowDeleteModal(false)
    }

    // Opens the delete confirmation modal
    const handleOpenDeleteModal = () => {
        setShowDeleteModal(true)
    }

    // Closes the delete confirmation modal
    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false)
    }

    // Deletes the selected blog post (only by post author)
    const handleDeleteSelectedBlog = async () => {
        if (!selectedBlog) {
            return
        }

        setShowDeleteModal(false)
        setDeletingBlog(true)
        setDeleteError(null)

        try {
            const authKey = localStorage.getItem("authKey")
            if (!authKey) {
                setDeleteError("Authentication required to delete posts.")
                setDeletingBlog(false)
                return
            }

            const response = await fetchAPI("DELETE", `/blogs/${selectedBlog.id}`, null, authKey)
            if (response.status === 200) {
                handleCloseSelectedBlog()
                getBlogs()
            } else {
                setDeleteError(response.body?.message || "Failed to delete blog post")
            }
        } catch (error) {
            setDeleteError(String(error))
        } finally {
            setDeletingBlog(false)
        }
    }

    // Formats date string for display (Australian locale)
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

    // Validates blog title and content using regex patterns
    const validateCreateForm = () => {
        const errors = {}
        
        if (!createTitle.trim()) {
            errors.title = "Title is required."
        } else if (!blogTitlePattern.test(createTitle.trim())) {
            errors.title = "Title must start with a letter and can only contain letters, numbers, dashes, apostrophes, spaces, and common punctuation."
        }
        
        if (!createContent.trim()) {
            errors.content = "Content is required."
        } else if (!blogContentPattern.test(createContent.trim())) {
            errors.content = "Content must start with a letter and can only contain letters, numbers, dashes, apostrophes, spaces, and common punctuation."
        }
        
        setCreateValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Creates a new blog post (authenticated users only)
    const handleCreateBlog = async (e) => {
        e.preventDefault()
        setCreateError(null)
        setCreateSuccess(null)

        // Client-side validation
        if (!validateCreateForm()) {
            return
        }

        setCreating(true)

        try {
            const authKey = localStorage.getItem("authKey")
            const response = await fetchAPI("POST", "/blogs", {
                title: createTitle,
                content: createContent
            }, authKey)

            if (response.status === 201) {
                setCreateSuccess("Blog post created successfully!")
                setCreateTitle("")
                setCreateContent("")
                setCreateValidationErrors({})
                setShowCreateForm(false)
                // Refresh the blog list
                getBlogs()
            } else {
                setCreateError(response.body?.message || "Failed to create blog post")
            }
        } catch (error) {
            setCreateError(String(error))
        } finally {
            setCreating(false)
        }
    }

    return (
        <section className="bg-[#6a2f6a] text-white min-h-[calc(100vh-200px)] flex items-center py-8 px-4 relative">
            <div className="max-w-2xl w-full mx-auto">
                {/* Create Blog Form: shown only when user is logged in and showCreateForm is true */}
                {user && showCreateForm && (
                    <div className="mb-6">
                        <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939]">
                            <h3 className="text-xl font-bold mb-4 text-[#30d939]">Create New Blog Post</h3>
                            <form onSubmit={handleCreateBlog}>
                                {/* Title input: controlled component with validation */}
                                <div className="mb-5">
                                    <label htmlFor="title" className="block mb-2 font-semibold text-[#30d939] text-base">
                                        Title:
                                    </label>
                                    <input
                                        id="title"
                                        value={createTitle}
                                        onChange={e => {
                                            setCreateTitle(e.target.value)
                                            if (createValidationErrors.title) {
                                                setCreateValidationErrors(prev => ({ ...prev, title: undefined }))
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60"
                                        type="text"
                                        placeholder="Enter blog title"
                                        required
                                    />
                                    {/* Title validation error message */}
                                    {createValidationErrors.title && (
                                        <p className="mt-2 text-sm text-red-300">{createValidationErrors.title}</p>
                                    )}
                                </div>
                                
                                {/* Content textarea: controlled component with validation */}
                                <div className="mb-5">
                                    <label htmlFor="content" className="block mb-2 font-semibold text-[#30d939] text-base">
                                        Content:
                                    </label>
                                    <textarea
                                        id="content"
                                        value={createContent}
                                        onChange={e => {
                                            setCreateContent(e.target.value)
                                            if (createValidationErrors.content) {
                                                setCreateValidationErrors(prev => ({ ...prev, content: undefined }))
                                            }
                                        }}
                                        className="w-full px-4 py-3 border-2 border-white/20 rounded-lg bg-white/10 text-white text-base transition-all duration-300 focus:outline-none focus:border-[#30d939] focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(48,217,57,0.2)] placeholder:text-white/60 resize-y min-h-[150px]"
                                        placeholder="Enter blog content"
                                        required
                                    />
                                    {/* Content validation error message */}
                                    {createValidationErrors.content && (
                                        <p className="mt-2 text-sm text-red-300">{createValidationErrors.content}</p>
                                    )}
                                </div>
                                
                                {/* Form action buttons: Cancel and Save */}
                                <div className="flex gap-3">
                                    {/* Cancel button: closes form and clears state */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false)
                                            setCreateTitle("")
                                            setCreateContent("")
                                            setCreateError(null)
                                            setCreateSuccess(null)
                                            setCreateValidationErrors({})
                                        }}
                                        className="flex-1 bg-white/20 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-white/30"
                                        disabled={creating}
                                    >
                                        Cancel
                                    </button>
                                    {/* Save button: submits form to create blog post */}
                                    <button
                                        type="submit"
                                        className="flex-1 bg-white text-[#30d939] py-3 px-6 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                        disabled={creating}
                                    >
                                        {creating 
                                            ? <span className="loading loading-spinner"></span>
                                            : <span>Save</span>
                                        }
                                    </button>
                                </div>
                            </form>
                            
                            {/* Create error message: displays if blog creation fails */}
                            {createError && (
                                <div className="mt-4 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                                    <span>{createError}</span>
                                </div>
                            )}
                            
                            {/* Create success message: displays when blog post is created successfully */}
                            {createSuccess && (
                                <div className="mt-4 bg-green-500/20 border border-green-500 text-white p-4 rounded-lg text-center">
                                    <span>{createSuccess}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Loading spinner: shown while fetching selected blog details */}
                {selectedBlogLoading && (
                    <div className="mb-6 bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] flex justify-center">
                        <span className="loading loading-spinner loading-xl"></span>
                    </div>
                )}

                {/* Error message: displays if selected blog fetch fails */}
                {selectedBlogError && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                        <span>{selectedBlogError}</span>
                    </div>
                )}

                {/* Selected blog details panel: displays full blog post information */}
                {selectedBlog && !showCreateForm && (
                    <div className="mb-6 bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] relative">
                        {/* Close button: closes blog details and returns to list view */}
                        <button
                            onClick={handleCloseSelectedBlog}
                            className="absolute top-2 right-4 text-white/70 hover:text-white text-sm font-semibold"
                        >
                            Close ✕
                        </button>
                        {/* Blog header: title and creation date */}
                        <div className="text-center mb-4 relative">
                            <div className="mb-2">
                                <h3 className="text-2xl font-bold">{selectedBlog.title}</h3>
                            </div>
                            {/* Creation date display */}
                            <p className="text-sm text-white/70">
                                {formatDate(selectedBlog.createdAt)}
                            </p>
                        </div>
                        {/* Blog content: displays with preserved line breaks */}
                        <div className="bg-white/5 rounded-lg p-4 text-sm leading-relaxed text-white/90 whitespace-pre-line">
                            {selectedBlog.content}
                        </div>
                        {/* Delete button: shown only for blog post author, positioned outside and to the right of content */}
                        {user && selectedBlog.authorId === user.id && (
                            <button
                                onClick={handleOpenDeleteModal}
                                disabled={deletingBlog}
                                className="absolute bottom-4 right-4 text-red-300 hover:text-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={deletingBlog ? "Deleting..." : "Delete Post"}
                            >
                                <FaTrash className="text-lg" />
                            </button>
                        )}
                        {/* Delete error message: shown if delete operation fails */}
                        {user && selectedBlog.authorId === user.id && deleteError && (
                            <div className="mt-2 bg-red-500/20 border border-red-500 text-white p-3 rounded-lg text-center text-sm">
                                {deleteError}
                            </div>
                        )}
                    </div>
                )}

                {/* Delete Confirmation Modal: shown when user clicks delete button */}
                {showDeleteModal && selectedBlog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#6a2f6a] border-2 border-[#30d939] rounded-lg p-6 md:p-8 max-w-md w-full shadow-2xl">
                            {/* Modal header */}
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-[#30d939] mb-2">Confirm Deletion</h3>
                                <p className="text-white/90">
                                    Are you sure you want to delete this blog post?
                                </p>
                                <p className="text-red-300 text-sm mt-2 font-semibold">
                                    This action cannot be undone.
                                </p>
                            </div>
                            
                            {/* Blog post preview */}
                            <div className="bg-white/10 rounded-lg p-4 mb-6">
                                <p className="text-white font-semibold mb-1">{selectedBlog.title}</p>
                                <p className="text-white/70 text-sm">{formatDate(selectedBlog.createdAt)}</p>
                            </div>

                            {/* Modal action buttons */}
                            <div className="flex gap-3">
                                {/* Cancel button */}
                                <button
                                    onClick={handleCloseDeleteModal}
                                    disabled={deletingBlog}
                                    className="flex-1 bg-white/20 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                {/* Confirm delete button */}
                                <button
                                    onClick={handleDeleteSelectedBlog}
                                    disabled={deletingBlog}
                                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 hover:bg-red-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deletingBlog ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main content container: holds new post button, blogs list, and error/loading states */}
                <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border-l-4 border-[#30d939] relative">
                    {/* Sticky New Post Button: shown only when logged in and create form is not displayed */}
                    {user && !showCreateForm && (
                        <div className="absolute -top-6 right-4 pointer-events-none z-50">
                            <button
                                onClick={() => {
                                    setSelectedBlog(null)
                                    setSelectedBlogError(null)
                                    setDeleteError(null)
                                    setShowCreateForm(true)
                                }}
                                className="bg-[#30d939] text-white p-3 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 flex items-center justify-center pointer-events-auto"
                                title="Create New Post"
                            >
                                <FaEdit className="text-lg" />
                            </button>
                        </div>
                    )}
                    
                    {/* Blogs list error message: displays if fetching blogs fails */}
                    {error && (
                        <div className="mb-6 bg-red-500/20 border border-red-500 text-white p-4 rounded-lg text-center">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading state: spinner shown while fetching blogs list */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-xl"></span>
                        </div>
                    ) : !error && blogs.length === 0 ? (
                        // Empty state: shown when no blogs found
                        <div className="p-8 text-center">
                            <p className="text-white/80">No blogs available</p>
                        </div>
                    ) : (
                        // Blogs list: scrollable list of blog post buttons
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {blogs.map(blog => (
                                // Blog button: clickable to view blog post details
                                <button
                                    key={blog.id}
                                    type="button"
                                    onClick={() => handleViewBlog(blog.id)}
                                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-left transition-all duration-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <FaInfoCircle className="text-xl text-[#30d939] shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {/* Blog title with "My Post" badge if user is author */}
                                            <div className="font-semibold text-base text-white mb-1 flex items-center gap-2">
                                                <span className="truncate">{blog.title}</span>
                                                {/* "My Post" badge: shown only for blog post author */}
                                                {user && blog.authorId === user.id && (
                                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#30d939] bg-white/10 px-2 py-0.5 rounded-full">
                                                        My Post
                                                    </span>
                                                )}
                                            </div>
                                            {/* Creation date display */}
                                            <div className="text-xs text-white/60">
                                                {formatDate(blog.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
            </div>
            </div>
    </section>
    )
}

export default BlogListView
