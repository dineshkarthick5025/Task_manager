import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { auth, signUp, signIn, googleSignIn, resetPassword, logout, addTask, getTasks, deleteTask, updateTask } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaGoogle, FaSignOutAlt, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaUser, FaSearch, FaArrowLeft, FaClock, FaCalendar } from "react-icons/fa";
import { requestNotificationPermission, sendNotification, checkTaskDeadlines, setupFCMListener } from "./services/notificationService";

function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [taskInput, setTaskInput] = useState({
        task: "",
        dueDate: "",
        dueTime: ""
    });
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [editingTask, setEditingTask] = useState({
        id: null,
        task: "",
        dueDate: "",
        dueTime: ""
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    
    // Request notification permission on mount
    useEffect(() => {
        const setupNotifications = async () => {
            const permission = await requestNotificationPermission();
            setNotificationEnabled(permission);
        };
        setupNotifications();
    }, []);

    // Check deadlines periodically
    const checkDeadlines = useCallback(() => {
        if (!user || !tasks.length) return;

        const checkedTasks = checkTaskDeadlines(tasks);
        
        checkedTasks.forEach(task => {
            if (!task.notified) return;

            const notificationOptions = {
                body: task.task,
                icon: '/path/to/your/icon.png',
                badge: '/path/to/your/badge.png',
                tag: task.id // Prevents duplicate notifications
            };

            // Hour notification
            if (task.minutesLeft <= 60 && task.minutesLeft > 30 && !task.notified.hour) {
                sendNotification(`Task due in 1 hour: ${task.task}`, notificationOptions);
                toast.info(`Task "${task.task}" is due in 1 hour!`);
                updateTaskNotificationStatus(task.id, { hour: true });
            }

            // 30 minutes notification
            if (task.minutesLeft <= 30 && task.minutesLeft > 0 && !task.notified.thirtyMin) {
                sendNotification(`Task due in 30 minutes: ${task.task}`, notificationOptions);
                toast.warning(`Task "${task.task}" is due in 30 minutes!`);
                updateTaskNotificationStatus(task.id, { thirtyMin: true });
            }

            // Overdue notification
            if (task.status === 'overdue' && !task.notified.overdue) {
                sendNotification(`Task overdue: ${task.task}`, notificationOptions);
                toast.error(`Task "${task.task}" is overdue!`);
                updateTaskNotificationStatus(task.id, { overdue: true });
            }
        });
    }, [tasks, user]);

    // Set up periodic checks
    useEffect(() => {
        const intervalId = setInterval(checkDeadlines, 60000); // Check every minute
        return () => clearInterval(intervalId);
    }, [checkDeadlines]);

    const updateTaskNotificationStatus = async (taskId, notificationStatus) => {
        try {
            await updateDoc(doc(db, "tasks", taskId), {
                notified: {
                    ...notificationStatus
                }
            });
        } catch (error) {
            console.error("Error updating notification status:", error);
        }
    };

    // Listen for Auth changes
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Start listening to tasks
                const unsubscribeTasks = getTasks(currentUser.uid, setTasks);
                return () => {
                    unsubscribeTasks();
                };
            } else {
                setTasks([]);
            }
        });
        return () => unsubscribeAuth();
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
        // Check all required fields
        if (taskInput.task.trim() === "") {
            toast.warning("Please enter a task description");
            return;
        }
        if (!taskInput.dueDate) {
            toast.warning("Please select a due date");
            return;
        }
        if (!taskInput.dueTime) {
            toast.warning("Please select a due time");
            return;
        }

        try {
            await addTask(user.uid, taskInput);
            setTaskInput({ task: "", dueDate: "", dueTime: "" });
            toast.success("Task added successfully!");
        } catch (error) {
            toast.error("Failed to add task: " + error.message);
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await deleteTask(id);
            // Refresh tasks list
            await fetchTasks(user.uid);
            toast.success("Task deleted successfully!");
        } catch (error) {
            toast.error("Failed to delete task: " + error.message);
        }
    };

    const startEditing = (task) => {
        setEditingTask({
            id: task.id,
            task: task.task,
            dueDate: task.dueDate || "",
            dueTime: task.dueTime || ""
        });
    };

    const handleUpdateTask = async () => {
        if (editingTask.task.trim() === "") {
            toast.warning("Task cannot be empty");
            return;
        }
        try {
            await updateTask(editingTask.id, editingTask);
            setEditingTask({ id: null, task: "", dueDate: "", dueTime: "" });
            toast.success("Task updated successfully!");
        } catch (error) {
            toast.error("Failed to update task: " + error.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            if (editingTask.id) {
                handleUpdateTask();
            } else {
                handleAddTask();
            }
        }
    };

    // Format date for display
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    // Format time for display
    const formatTime = (time) => {
        return time;
    };

    // Calculate time remaining
    const getTimeRemaining = (dueDate, dueTime) => {
        if (!dueDate || !dueTime) return null;
        
        const now = new Date();
        const deadline = new Date(`${dueDate} ${dueTime}`);
        const difference = deadline - now;

        if (difference < 0) return "Overdue";

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);

        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
    };

    // First, filter tasks to only include the current user's tasks
    const userTasks = tasks.filter(task => task.userId === user.uid);

    // Then filter those tasks based on search term
    const filteredTasks = userTasks.filter(task => 
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

    const NotificationSettings = () => {
        const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

        const getBrowserSpecificInstructions = () => {
            const browser = detectBrowser();
            switch (browser) {
                case 'chrome':
                    return (
                        <>
                            <p>To enable notifications in Chrome:</p>
                            <ol>
                                <li>Click the lock icon (🔒) in the address bar</li>
                                <li>Click "Site Settings"</li>
                                <li>Find "Notifications" and change it to "Allow"</li>
                                <li>Refresh this page</li>
                            </ol>
                        </>
                    );
                case 'firefox':
                    return (
                        <>
                            <p>To enable notifications in Firefox:</p>
                            <ol>
                                <li>Click the lock icon (🔒) in the address bar</li>
                                <li>Clear the "Block" setting for Notifications</li>
                                <li>Refresh this page</li>
                            </ol>
                        </>
                    );
                default:
                    return (
                        <>
                            <p>To enable notifications:</p>
                            <ol>
                                <li>Open your browser settings</li>
                                <li>Look for Site Settings or Permissions</li>
                                <li>Find Notifications settings</li>
                                <li>Allow notifications for this site</li>
                                <li>Refresh this page</li>
                            </ol>
                        </>
                    );
            }
        };

        // Helper function to detect browser
        const detectBrowser = () => {
            if (navigator.userAgent.indexOf("Chrome") !== -1) return 'chrome';
            if (navigator.userAgent.indexOf("Firefox") !== -1) return 'firefox';
            return 'other';
        };

        const handlePermissionRequest = async () => {
            try {
                const isGranted = await requestNotificationPermission();
                setNotificationEnabled(isGranted);
                setPermissionStatus(Notification.permission);
                
                if (isGranted) {
                    toast.success("Notifications enabled successfully!");
                    sendNotification("Notifications Enabled", {
                        body: "You will now receive task notifications",
                    });
                } else {
                    toast.warning("Notifications are not enabled. You might miss important task deadlines.");
                }
            } catch (error) {
                console.error("Error requesting notification permission:", error);
                toast.error("Failed to enable notifications");
            }
        };

        return (
            <div className="notification-settings">
                <h3>Notification Settings</h3>
                <div className="settings-options">
                    <div className="notification-status">
                        <p>Current Status: <strong>{permissionStatus}</strong></p>
                        {permissionStatus !== "granted" && (
                            <button 
                                className="enable-notifications-btn"
                                onClick={handlePermissionRequest}
                            >
                                Enable Notifications
                            </button>
                        )}
                    </div>
                    {permissionStatus === "denied" && (
                        <div className="notification-warning">
                            <h4>Notifications are currently blocked</h4>
                            {getBrowserSpecificInstructions()}
                            <button 
                                className="refresh-page-btn"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const TaskDeadlineStatus = ({ task }) => {
        const deadlineStatus = getTimeRemaining(task.dueDate, task.dueTime);
        const statusClass = deadlineStatus === "Overdue" ? "overdue" :
                          deadlineStatus?.includes("m remaining") ? "urgent" :
                          "normal";
        
        return (
            <span className={`deadline-status ${statusClass}`}>
                {deadlineStatus}
            </span>
        );
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
                            {searchTerm ? (
                                <p>{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found</p>
                            ) : (
                                <p>You have {userTasks.length} {userTasks.length === 1 ? 'task' : 'tasks'}</p>
                            )}
                        </div>

                        <div className="task-input-container">
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    value={taskInput.task}
                                    onChange={(e) => setTaskInput({...taskInput, task: e.target.value})}
                                    placeholder="Enter a new task *" 
                                    required
                                />
                                <span className="required-indicator">*</span>
                            </div>
                            <div className="input-group">
                                <input 
                                    type="date"
                                    value={taskInput.dueDate}
                                    onChange={(e) => setTaskInput({...taskInput, dueDate: e.target.value})}
                                    required
                                />
                                <span className="required-indicator">*</span>
                            </div>
                            <div className="input-group">
                                <input 
                                    type="time"
                                    value={taskInput.dueTime}
                                    onChange={(e) => setTaskInput({...taskInput, dueTime: e.target.value})}
                                    required
                                />
                                <span className="required-indicator">*</span>
                            </div>
                            <button onClick={handleAddTask} disabled={loading}>
                                <FaPlus /> Add
                            </button>
                        </div>

                        {loading && userTasks.length === 0 ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <p>Loading your tasks...</p>
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            <ul className="task-list">
                                {filteredTasks.map((t) => (
                                    <li key={t.id} className={`task-item ${t.status}`}>
                                        {editingTask.id === t.id ? (
                                            <div className="edit-task">
                                                <input
                                                    type="text"
                                                    value={editingTask.task}
                                                    onChange={(e) => setEditingTask({
                                                        ...editingTask,
                                                        task: e.target.value
                                                    })}
                                                    autoFocus
                                                />
                                                <input
                                                    type="date"
                                                    value={editingTask.dueDate}
                                                    onChange={(e) => setEditingTask({
                                                        ...editingTask,
                                                        dueDate: e.target.value
                                                    })}
                                                />
                                                <input
                                                    type="time"
                                                    value={editingTask.dueTime}
                                                    onChange={(e) => setEditingTask({
                                                        ...editingTask,
                                                        dueTime: e.target.value
                                                    })}
                                                />
                                                <div className="edit-buttons">
                                                    <button 
                                                        className="save-btn"
                                                        onClick={handleUpdateTask}
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                    <button 
                                                        className="cancel-btn"
                                                        onClick={() => setEditingTask({
                                                            id: null,
                                                            task: "",
                                                            dueDate: "",
                                                            dueTime: ""
                                                        })}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="task-content">
                                                    <span className="task-text">{t.task}</span>
                                                    {(t.dueDate || t.dueTime) && (
                                                        <div className="task-deadline">
                                                            {t.dueDate && (
                                                                <span className="due-date">
                                                                    <FaCalendar /> {formatDate(t.dueDate)}
                                                                </span>
                                                            )}
                                                            {t.dueTime && (
                                                                <span className="due-time">
                                                                    <FaClock /> {formatTime(t.dueTime)}
                                                                </span>
                                                            )}
                                                            <span className="time-remaining">
                                                                {getTimeRemaining(t.dueDate, t.dueTime)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
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
                                        <TaskDeadlineStatus task={t} />
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
                <p>© {new Date().getFullYear()} by DineshKarthick TaskMaster. All rights reserved.</p>
            </footer>
            {user && <NotificationSettings />}
        </div>
    );
}

export default App;
