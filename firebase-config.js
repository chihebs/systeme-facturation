const firebaseConfig = {
  apiKey: "AIzaSyBQa1NmHk-8VpomJPamDTEhQ8Vf6C6zCl8",
  authDomain: "facturation-entreprise.firebaseapp.com",
  projectId: "facturation-entreprise",
  storageBucket: "facturation-entreprise.firebasestorage.app",
  messagingSenderId: "412166367015",
  appId: "1:412166367015:web:ca2872abb43383d1806b02"
};
// NE MODIFIEZ PAS EN DESSOUS DE CETTE LIGNE
// ============================================

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Références aux services
const db = firebase.firestore();
const auth = firebase.auth();

// Configurer la langue en français
auth.languageCode = 'fr';

console.log('Firebase initialisé avec succès');
