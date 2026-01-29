import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyA4CUDPN0HEAxdmHgyWTwK-sjWJN9UoGOw",
  authDomain: "milliy-bb1f8.firebaseapp.com",
  projectId: "milliy-bb1f8",
  storageBucket: "milliy-bb1f8.firebasestorage.app",
  messagingSenderId: "538445511448",
  appId: "1:538445511448:web:e22bac4a5ee2a5c71afc6d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
