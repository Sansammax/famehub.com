import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import net from 'net';

dotenv.config();

let sequelize;
const dbUrl = process.env.DATABASE_URL;

// Helper to probe TCP connection
const checkPortOpen = (host, port, timeout = 1000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isOpened = false;

    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      isOpened = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(isOpened);
    });

    socket.connect(port, host);
  });
};

console.log('[Database] Initializing connection database...');

let usePostgres = false;

if (dbUrl && dbUrl.startsWith('postgres')) {
  try {
    // Parse host and port from connection URL
    // Format: postgres://user:pass@host:port/db
    const urlString = dbUrl.replace('postgresql://', 'http://').replace('postgres://', 'http://');
    const parsed = new URL(urlString);
    const host = parsed.hostname || 'localhost';
    const port = parseInt(parsed.port || '5432', 10);
    
    console.log(`[Database] Probing PostgreSQL endpoint ${host}:${port}...`);
    const isPgOpen = await checkPortOpen(host, port, 1500);
    if (isPgOpen) {
      usePostgres = true;
    } else {
      console.warn('[Database] PostgreSQL connection refused. Enabling SQLite fallback.');
    }
  } catch (error) {
    console.warn('[Database] Failed to parse postgres URL. Enabling SQLite fallback:', error.message);
  }
}

if (usePostgres) {
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      connectTimeout: 5000
    }
  });
  console.log('[Database] Configured for PostgreSQL.');
} else {
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  const sqlitePath = isTest ? ':memory:' : (process.env.SQLITE_DB_PATH || './database.sqlite');
  console.log(`[Database] Using fallback SQLite at: ${sqlitePath}`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false
  });
}

export { sequelize };
export default sequelize;
