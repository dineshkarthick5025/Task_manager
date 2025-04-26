

// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCm2Va0UofAdGW7PH9h2hYIzt0IwM02_Vs",
  authDomain: "todoapp-b1322.firebaseapp.com",
  projectId: "todoapp-b1322",
  storageBucket: "todoapp-b1322.firebasestorage.app",
  messagingSenderId: "224387757120",
  appId: "1:224387757120:web:7d4c7b93849af421e45ba5",
  measurementId: "G-F1CVF6VE98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth functions
export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
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

// Firestore functions
export const addTask = async (userId, taskData) => {
  await addDoc(collection(db, "tasks"), {
    userId,
    task: String(taskData.task),
    dueDate: taskData.dueDate,
    dueTime: taskData.dueTime,
    status: 'pending',
    notified: {
      hour: false,
      thirtyMin: false,
      overdue: false
    },
    createdAt: new Date(),
  });
};

export const getTasks = async (userId, setTasks) => {
  if (!userId) {
    setTasks([]);
    return;
  }
  
  const q = query(
    collection(db, "tasks"), 
    where("userId", "==", userId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    setTasks(tasks);
  });
};

export const deleteTask = async (taskId) => {
  await deleteDoc(doc(db, "tasks", taskId));
};

export const updateTask = async (taskId, newData) => {
  await updateDoc(doc(db, "tasks", taskId), {
    task: String(newData.task),
    dueDate: newData.dueDate,
    dueTime: newData.dueTime,
    updatedAt: new Date()
  });
};

export { auth };

// Add notification preferences to user settings
export const updateUserNotificationSettings = async (userId, settings) => {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { notificationSettings: settings }, { merge: true });
};

export const getUserNotificationSettings = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? userDoc.data().notificationSettings : null;
};
