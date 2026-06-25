import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

let sequelize;
const dbUrl = process.env.DATABASE_URL;

console.log('[Database] Initializing...\n');

let usePostgres = false;

if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
  usePostgres = true;
}

if (usePostgres) {
  console.log('[Database] Connecting to PostgreSQL...\n');
  try {
    const dialectOptions = {};
    
    try {
      const urlString = dbUrl.replace('postgresql://', 'http://').replace('postgres://', 'http://');
      const parsed = new URL(urlString);
      const host = parsed.hostname || 'localhost';
      if (host !== 'localhost' && host !== '127.0.0.1') {
        dialectOptions.ssl = {
          require: true,
          rejectUnauthorized: false
        };
      }
    } catch (err) {
      // Ignore URL parsing errors
    }

    sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions
    });

    await sequelize.authenticate();
    console.log('[Database] Connected to PostgreSQL successfully.\n');
    console.log('[Database] PostgreSQL authentication successful.\n');
    console.log('[Database] Using PostgreSQL.');
  } catch (error) {
    console.log('[Database] PostgreSQL authentication failed.\n');
    console.log(`Reason: ${error.message || error}\n`);
    console.log('Switching to SQLite fallback...');
    usePostgres = false;
  }
}

if (!usePostgres) {
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
