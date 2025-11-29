import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkB1qTtGJYyAhTTfFS5u4HM84XN_PWvps",
  authDomain: "studio-1240793450-4e50c.firebaseapp.com",
  projectId: "studio-1240793450-4e50c",
  storageBucket: "studio-1240793450-4e50c.firebasestorage.app",
  messagingSenderId: "1009373349368",
  appId: "1:1009373349368:web:84debe33f5badd9bd5c20d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
