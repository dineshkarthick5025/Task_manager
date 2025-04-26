

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
export const addTask = async (userId, task) => {
  await addDoc(collection(db, "tasks"), {
    userId,
    task: String(task),
    createdAt: new Date()
  });
};

export const getTasks = async (userId, setTasks) => {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  
  // Return the unsubscribe function
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

// Add this new function for updating tasks
export const updateTask = async (taskId, newData) => {
  await updateDoc(doc(db, "tasks", taskId), {
    task: String(newData.task),
    updatedAt: new Date()
  });
};

export { auth };
