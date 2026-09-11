/**
 * CareBridge - Rotas de Autenticação
 * --------------------------------------------------
 * NOTA ACADÉMICA (Segurança e Privacidade):
 * Implementação do registo e login de utilizadores. 
 * A biblioteca 'bcrypt' é utilizada para aplicar um hash criptográfico às palavras-passe
 * (princípio de mitigação de vulnerabilidades - Data Breach). 
 * Nenhuma palavra-passe é guardada em plain-text, assegurando confidencialidade.
 */
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../config/database.js';
import { isFirebaseConfigured, verifyGoogleIdToken } from '../config/firebaseAdmin.js';

const router = express.Router();

function issueAppToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, keyword } = req.body;
    const db = await getDb();
    
    // Check if user exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Set role & validate admin keyword
    let userRole = 'user';
    if (role === 'admin') {
      if (!keyword || keyword.toLowerCase() !== 'allycare') {
        return res.status(400).json({ error: 'Chave de acesso profissional inválida.' });
      }
      userRole = 'admin';
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    const user = { id: result.lastID, name, email, role: userRole };
    res.json({ token: issueAppToken(user), user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({ token: issueAppToken(user), user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    if (!isFirebaseConfigured()) {
      return res.status(503).json({ error: 'Autenticação Google não está configurada no servidor.' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Token Google em falta.' });
    }

    const decoded = await verifyGoogleIdToken(idToken);
    const firebaseUid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name || email?.split('@')[0] || 'Utilizador Google';

    if (!email) {
      return res.status(400).json({ error: 'A conta Google não disponibilizou um email.' });
    }

    const db = await getDb();
    let user = await db.get('SELECT * FROM users WHERE firebase_uid = ?', [firebaseUid]);

    if (!user) {
      user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (user) {
        await db.run(
          "UPDATE users SET firebase_uid = ?, auth_provider = 'google' WHERE id = ?",
          [firebaseUid, user.id]
        );
        user = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
      }
    }

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const result = await db.run(
        "INSERT INTO users (name, email, password, role, auth_provider, firebase_uid) VALUES (?, ?, ?, 'user', 'google', ?)",
        [name, email, hashedPassword, firebaseUid]
      );
      user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    }

    res.json({ token: issueAppToken(user), user: formatUser(user) });
  } catch (error) {
    console.error('[auth/google]', error.message);
    res.status(401).json({ error: 'Não foi possível validar a conta Google.' });
  }
});

export default router;
