/**
 * CareBridge - Firebase Admin SDK
 * Verifica tokens Google no servidor antes de emitir JWT da aplicação.
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
    || path.join(__dirname, '../carebridge-cb89b-firebase-adminsdk-fbsvc-eae0068b6d.json');

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  return null;
}

export function initFirebaseAdmin() {
  if (initialized) return admin;

  try {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      console.warn('⚠️  Firebase Admin não configurado — login Google desativado.');
      return null;
    }

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
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return true;

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
    || path.join(__dirname, '../carebridge-cb89b-firebase-adminsdk-fbsvc-eae0068b6d.json');

  return fs.existsSync(filePath);
}

export async function verifyGoogleIdToken(idToken) {
  const firebaseAdmin = initFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Autenticação Google não está configurada no servidor.');
  }

  return firebaseAdmin.auth().verifyIdToken(idToken);
}
