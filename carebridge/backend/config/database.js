/**
 * CareBridge - Configuração da Base de Dados (Bun SQLite Adapter)
 * --------------------------------------------------
 * NOTA ACADÉMICA:
 * A utilização do adaptador nativo do Bun (bun:sqlite) elimina a dependência de 
 * compilação nativa (C++ / node-gyp), garantindo que a base de dados funciona 
 * imediatamente em qualquer sistema operativo (incluindo Windows sem VS Build Tools) 
 * com excelente performance.
 */
import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Classe Adapter para manter compatibilidade exata com as chamadas da biblioteca 'sqlite'
class BunSqliteAdapter {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }

  async get(sql, params = []) {
    // Normaliza os parâmetros para array caso venha um valor simples
    const normalizedParams = Array.isArray(params) ? params : [params];
    const stmt = this.db.query(sql);
    try {
      return stmt.get(...normalizedParams);
    } finally {
      stmt.finalize();
    }
  }

  async all(sql, params = []) {
    const normalizedParams = Array.isArray(params) ? params : [params];
    const stmt = this.db.query(sql);
    try {
      return stmt.all(...normalizedParams);
    } finally {
      stmt.finalize();
    }
  }

  async run(sql, params = []) {
    const normalizedParams = Array.isArray(params) ? params : [params];
    const stmt = this.db.query(sql);
    try {
      const result = stmt.run(...normalizedParams);
      return {
        lastID: result.lastInsertRowid,
        changes: result.changes
      };
    } finally {
      stmt.finalize();
    }
  }

  async exec(sql) {
    // Executa múltiplos statements (como o schema.sql)
    this.db.run(sql);
  }
}

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  
  const dbPath = process.env.DB_FILE || path.join(__dirname, '../database/carebridge.db');
  
  // Garante que o diretório da base de dados existe
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new BunSqliteAdapter(dbPath);
  return dbInstance;
}

export async function initializeDatabase() {
  const database = await getDb();
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await database.exec(schema);

  // Garante que a coluna is_starred existe (retrocompatibilidade)
  try {
    await database.run('ALTER TABLE conversations ADD COLUMN is_starred BOOLEAN DEFAULT 0');
  } catch (error) {
    // Ignorar se já existir
  }

  // Garante que a coluna role existe (retrocompatibilidade)
  try {
    await database.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  } catch (error) {
    // Ignorar se já existir
  }

  // T8: Garante que a preferência de tamanho de letra existe (retrocompatibilidade)
  try {
    await database.run("ALTER TABLE users ADD COLUMN font_size_preference TEXT DEFAULT 'medium'");
  } catch (error) {
    // Ignorar se já existir
  }

  // Garante que a preferência de idioma existe (retrocompatibilidade)
  try {
    await database.run("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'pt'");
  } catch (error) {
    // Ignorar se já existir
  }

  // Semeia a conta demo de cuidador
  const bcrypt = await import('bcrypt');
  const demoEmail = 'demo@carebridge.com';
  const existingDemo = await database.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingDemo) {
    const hashed = await bcrypt.default.hash('demo123', 10);
    await database.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      ['Demo User', demoEmail, hashed]
    );
  }

  // Semeia a conta demo de administrador/médico
  const demoAdminEmail = 'demoadmin@carebridge.com';
  const existingAdminDemo = await database.get('SELECT id FROM users WHERE email = ?', [demoAdminEmail]);
  if (!existingAdminDemo) {
    const hashedAdmin = await bcrypt.default.hash('demoadmin123', 10);
    await database.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      ['Demo Admin', demoAdminEmail, hashedAdmin]
    );
  }
}
