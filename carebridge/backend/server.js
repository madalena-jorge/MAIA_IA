/**
 * CareBridge - Servidor Principal (Ponto de Entrada)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Design Science Research):
 * Este ficheiro inicializa a aplicação backend utilizando Express.js.
 * A arquitetura RESTful foi escolhida para desacoplar totalmente o cliente (frontend)
 * do servidor (backend), permitindo escalabilidade e possível integração futura
 * com aplicações mobile sem necessidade de refatoração do core.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import profileRoutes from './routes/profile.js';
import resourceRoutes from './routes/resources.js';
import { initializeDatabase } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resources', resourceRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('⚠️  OPENROUTER_API_KEY não definida — o AllyCare não conseguirá responder.');
    }

    // Initialize SQLite Database
    await initializeDatabase();
    console.log('Database initialized successfully.');
    
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
