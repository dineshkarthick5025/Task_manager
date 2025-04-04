import React, { useState, useEffect } from "react";
import "./App.css";
import { auth, signUp, signIn, googleSignIn, resetPassword, logout, addTask, getTasks, deleteTask, updateTask } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaGoogle, FaSignOutAlt, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaUser, FaSearch, FaArrowLeft } from "react-icons/fa";

function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [task, setTask] = useState("");
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editedTaskText, setEditedTaskText] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    // Listen for Auth changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchTasks(currentUser.uid);
            } else {
                setTasks([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchTasks = async (userId) => {
        setLoading(true);
        try {
            await getTasks(userId, setTasks);
        } catch (error) {
            toast.error("Failed to fetch tasks: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Auth Handlers
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let result;
            if (isSignUp) {
                result = await signUp(email, password);
            } else {
                result = await signIn(email, password);
            }
            
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(isSignUp ? "Account Created Successfully!" : "Signed In Successfully!");
                setShowAuthModal(false);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const result = await googleSignIn();
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Signed In with Google!");
                setShowAuthModal(false);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            toast.warning("Please enter your email first");
            return;
        }
        setLoading(true);
        try {
            const result = await resetPassword(email);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Password reset email sent!");
                setResetEmailSent(true);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.info("Logged Out Successfully!");
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Task Handlers
    const handleAddTask = async () => {
        if (task.trim() === "") {
            toast.warning("Please enter a task");
            return;
        }
        try {
            await addTask(user.uid, task);
            setTask("");
            toast.success("Task added successfully!");
        } catch (error) {
            toast.error("Failed to add task: " + error.message);
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await deleteTask(id);
            toast.success("Task deleted successfully!");
        } catch (error) {
            toast.error("Failed to delete task: " + error.message);
        }
    };

    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setEditedTaskText(task.task);
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
        setEditedTaskText("");
    };

    const handleUpdateTask = async (taskId) => {
        if (editedTaskText.trim() === "") {
            toast.warning("Task cannot be empty");
            return;
        }
        try {
            await updateTask(taskId, { task: editedTaskText });
            setEditingTaskId(null);
            toast.success("Task updated successfully!");
        } catch (error) {
            toast.error("Failed to update task: " + error.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            if (editingTaskId) {
                handleUpdateTask(editingTaskId);
            } else {
                handleAddTask();
            }
        }
    };

    const filteredTasks = tasks.filter(task => 
        typeof task?.task === 'string' && task.task.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get user initial for profile picture
    const getUserInitial = () => {
        if (user?.displayName) {
            return user.displayName.charAt(0).toUpperCase();
        } else if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return <FaUser />;
    };

    return (
        <div className="app">
            <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                toastClassName="toast-message"
            />
            
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">TaskMaster</div>
                <div className="navbar-actions">
                    {user ? (
                        <>
                            <div className="search-box">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="user-profile">
                                {user.photoURL ? (
                                    <img 
                                        src={user.photoURL} 
                                        alt="Profile" 
                                        className="profile-pic"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            document.querySelector('.default-pic').style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className="profile-pic default-pic" style={{ display: user.photoURL ? 'none' : 'flex' }}>
                                    {getUserInitial()}
                                </div>
                                <button className="logout-btn" onClick={handleLogout}>
                                    <FaSignOutAlt />
                                </button>
                            </div>
                        </>
                    ) : (
                        <button 
                            className="signin-btn" 
                            onClick={() => setShowAuthModal(true)}
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </nav>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="modal-overlay">
                    <div className="auth-modal">
                        <button 
                            className="close-modal" 
                            onClick={() => {
                                setShowAuthModal(false);
                                setShowForgotPassword(false);
                                setResetEmailSent(false);
                                setEmail("");
                                setPassword("");
                            }}
                        >
                            &times;
                        </button>
                        
                        {showForgotPassword ? (
                            <div className="forgot-password-container">
                                {resetEmailSent ? (
                                    <>
                                        <h2>Check Your Email</h2>
                                        <p>We've sent a password reset link to <strong>{email}</strong></p>
                                        <button 
                                            className="back-to-login"
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setResetEmailSent(false);
                                            }}
                                        >
                                            <FaArrowLeft /> Back to Login
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h2>Reset Password</h2>
                                        <p>Enter your email to receive a reset link</p>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            handleResetPassword();
                                        }}>
                                            <input 
                                                type="email" 
                                                placeholder="Email" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)} 
                                                required
                                                autoFocus
                                            />
                                            <button type="submit" disabled={loading}>
                                                {loading ? "Sending..." : "Send Reset Link"}
                                            </button>
                                        </form>
                                        <button 
                                            className="back-to-login"
                                            onClick={() => setShowForgotPassword(false)}
                                        >
                                            <FaArrowLeft /> Back to Login
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                                
                                <form onSubmit={handleAuthSubmit}>
                                    <input 
                                        type="email" 
                                        placeholder="Email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required
                                        autoFocus
                                    />
                                    <input 
                                        type="password" 
                                        placeholder="Password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required
                                    />
                                    
                                    <button type="submit" disabled={loading}>
                                        {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                                    </button>
                                    
                                    <div className="divider">
                                        <span>or</span>
                                    </div>
                                    
                                    <button 
                                        type="button"
                                        className="google-sign-in" 
                                        onClick={handleGoogleSignIn}
                                        disabled={loading}
                                    >
                                        <FaGoogle /> {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
                                    </button>
                                    
                                    <div className="auth-footer">
                                        <p>
                                            {isSignUp ? "Already have an account?" : "Don't have an account?"}
                                            <button 
                                                type="button"
                                                className="toggle-auth"
                                                onClick={() => setIsSignUp(!isSignUp)}
                                            >
                                                {isSignUp ? "Sign In" : "Sign Up"}
                                            </button>
                                        </p>
                                        {!isSignUp && (
                                            <button 
                                                type="button"
                                                className="forgot-password-link" 
                                                onClick={() => setShowForgotPassword(true)}
                                            >
                                                Forgot Password?
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="main-content">
                {user ? (
                    <>
                        <div className="welcome-message">
                            <h1>Welcome{user.displayName ? `, ${user.displayName}` : user.email ? `, ${user.email}` : ''}</h1>
                            <p>You have {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
                        </div>

                        <div className="task-input-container">
                            <input 
                                type="text" 
                                value={task} 
                                onChange={(e) => setTask(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter a new task..." 
                            />
                            <button onClick={handleAddTask} disabled={loading}>
                                <FaPlus /> Add
                            </button>
                        </div>

                        {loading && tasks.length === 0 ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <p>Loading your tasks...</p>
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            <ul className="task-list">
                                {filteredTasks.map((t) => (
                                    <li key={t.id} className="task-item">
                                        {editingTaskId === t.id ? (
                                            <div className="edit-task">
                                                <input
                                                    type="text"
                                                    value={editedTaskText}
                                                    onChange={(e) => setEditedTaskText(e.target.value)}
                                                    onKeyPress={handleKeyPress}
                                                    autoFocus
                                                />
                                                <div className="edit-buttons">
                                                    <button 
                                                        className="save-btn"
                                                        onClick={() => handleUpdateTask(t.id)}
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                    <button 
                                                        className="cancel-btn"
                                                        onClick={cancelEditing}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="task-text">{t.task}</span>
                                                <div className="task-actions">
                                                    <button 
                                                        className="edit-btn"
                                                        onClick={() => startEditing(t)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button 
                                                        className="delete-btn"
                                                        onClick={() => handleDeleteTask(t.id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="no-tasks">
                                {searchTerm ? (
                                    <p>No tasks match your search.</p>
                                ) : (
                                    <>
                                        <p>No tasks yet. Add your first task above!</p>
                                        <div className="illustration"></div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="hero-section">
                        <h1>Organize Your Work & Life</h1>
                        <p>TaskMaster helps you stay organized and get more done.</p>
                        <button 
                            className="cta-button"
                            onClick={() => setShowAuthModal(true)}
                        >
                            Get Started - It's Free
                        </button>
                        <div className="hero-illustration"></div>
                    </div>
                )}
            </main>

            <footer className="app-footer">
                <p>© {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;
