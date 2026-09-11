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
import { getDb } from '../config/database.js';

const router = express.Router();

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

    const token = jwt.sign({ id: result.lastID, email, role: userRole }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: result.lastID, name, email, role: userRole } });
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
