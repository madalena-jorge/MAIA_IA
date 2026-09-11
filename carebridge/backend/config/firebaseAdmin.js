/**
 * CareBridge - Firebase Admin SDK
 * Verifica tokens Google no servidor antes de emitir JWT da aplicação.
 */
import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return admin;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT não definida — login Google desativado.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('Firebase Admin inicializado.');
    return admin;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error.message);
    return null;
  }
}

export function isFirebaseConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

export async function verifyGoogleIdToken(idToken) {
  const firebaseAdmin = initFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Autenticação Google não está configurada no servidor.');
  }

  return firebaseAdmin.auth().verifyIdToken(idToken);
}
