

// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update,
  query as dbQuery,
  orderByChild,
  equalTo
} from "firebase/database";
import { getMessaging } from "firebase/messaging";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCm2Va0UofAdGW7PH9h2hYIzt0IwM02_Vs",
  authDomain: "todoapp-b1322.firebaseapp.com",
  projectId: "todoapp-b1322",
  storageBucket: "todoapp-b1322.firebasestorage.app",
  messagingSenderId: "224387757120",
  appId: "1:224387757120:web:7d4c7b93849af421e45ba5",
  measurementId: "G-F1CVF6VE98",
  databaseURL: "https://todoapp-b1322-default-rtdb.firebaseio.com" // Add your database URL here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const messaging = getMessaging(app);

// Auth functions
export const signUp = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user profile with the name
    if (name) {
      await updateProfile(userCredential.user, {
        displayName: name
      });
    }
    
    return userCredential;
  } catch (error) {
    return { error: error.message };
  }
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const googleSignIn = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const logout = () => {
  return signOut(auth);
};

// Export Firebase instances
export { app, auth, messaging, db };

// Realtime Database functions
export const addTask = async (userId, taskData) => {
  const tasksRef = ref(db, 'tasks');
  const newTaskRef = push(tasksRef);
  
  await set(newTaskRef, {
    userId,
    task: String(taskData.task),
    dueDate: taskData.dueDate,
    dueTime: taskData.dueTime,
    priority: taskData.priority || 'medium',
    category: taskData.category || 'personal',
    status: 'pending',
    notified: {
      hour: false,
      thirtyMin: false,
      overdue: false
    },
    createdAt: new Date().toISOString(),
  });
};

export const getTasks = async (userId, setTasks) => {
  if (!userId) {
    setTasks([]);
    return;
  }
  
  const tasksRef = ref(db, 'tasks');
  const userTasksQuery = dbQuery(tasksRef, orderByChild('userId'), equalTo(userId));
  
  const unsubscribe = onValue(userTasksQuery, (snapshot) => {
    const tasks = [];
    snapshot.forEach((childSnapshot) => {
      tasks.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    setTasks(tasks);
  });
  
  return unsubscribe;
};

export const deleteTask = async (taskId) => {
  const taskRef = ref(db, `tasks/${taskId}`);
  await remove(taskRef);
};

export const updateTask = async (taskId, newData) => {
  const taskRef = ref(db, `tasks/${taskId}`);
  await update(taskRef, {
    task: String(newData.task),
    dueDate: newData.dueDate,
    dueTime: newData.dueTime,
    priority: newData.priority || 'medium',
    category: newData.category || 'personal',
    updatedAt: new Date().toISOString()
  });
};

// Update notification preferences in user settings
export const updateUserNotificationSettings = async (userId, settings) => {
  const userRef = ref(db, `users/${userId}/notificationSettings`);
  await set(userRef, settings);
};

export const getUserNotificationSettings = async (userId) => {
  const userRef = ref(db, `users/${userId}/notificationSettings`);
  return new Promise((resolve) => {
    onValue(userRef, (snapshot) => {
      resolve(snapshot.exists() ? snapshot.val() : null);
    }, { onlyOnce: true });
  });
};

// Save FCM tokens to user profile
export const saveFCMToken = async (userId, token) => {
  const tokenRef = ref(db, `users/${userId}/fcmTokens/${token}`);
  await set(tokenRef, true);
};
