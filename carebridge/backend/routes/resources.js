/**
 * CareBridge - Rotas de Biblioteca de Recursos (DSR)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Engenharia de Software):
 * O uso de `multer` permite a receção segura de ficheiros (multipart/form-data).
 * Ficheiros são guardados com nomes únicos gerados automaticamente para evitar conflitos.
 * Permissões baseadas em `role` garantem que só profissionais/admins fazem upload.
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Pasta de uploads — garantir que existe
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer — guardar ficheiro localmente com nome único
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não suportado. Aceite: PDF, DOCX, PPTX, TXT.'));
    }
  }
});

// Middleware para verificar role de admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Permissões administrativas requeridas.' });
  }
};

// Serve ficheiros de upload no endpoint /uploads
router.use('/files', express.static(uploadsDir));

// GET /api/resources — Listar todos os documentos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const documents = await db.all(
      'SELECT d.*, u.name as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id ORDER BY d.created_at DESC'
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resources — Adicionar documento (apenas metadados, sem ficheiro)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, description, file_path } = req.body;
    const userId = req.user.id;

    if (!title || !category) {
      return res.status(400).json({ error: 'Título e Categoria são obrigatórios.' });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO documents (title, category, description, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [title, category, description || null, file_path || null, userId]
    );

    const newDoc = await db.get('SELECT * FROM documents WHERE id = ?', [result.lastID]);
    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resources/upload — Upload real de ficheiro + metadados (multipart/form-data)
router.post('/upload', authenticateToken, requireAdmin, upload.single('document'), async (req, res) => {
  try {
    const { title, category, description } = req.body;
    const userId = req.user.id;

    if (!title || !category) {
      // Se o ficheiro já foi guardado mas os dados são inválidos, apagar o ficheiro
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Título e Categoria são obrigatórios.' });
    }

    // Caminho relativo para guardar na BD (acessível via /api/resources/files/...)
    const filePath = req.file
      ? `uploads/documents/${req.file.filename}`
      : null;

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO documents (title, category, description, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [title, category, description || null, filePath, userId]
    );

    const newDoc = await db.get('SELECT * FROM documents WHERE id = ?', [result.lastID]);
    res.status(201).json(newDoc);
  } catch (error) {
    // Apagar ficheiro se o registo na BD falhar
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
