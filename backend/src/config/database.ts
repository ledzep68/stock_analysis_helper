import { Pool, PoolConfig } from 'pg';
import { sqliteDb } from './sqlite';
import dotenv from 'dotenv';

dotenv.config();

const USE_SQLITE = process.env.USE_SQLITE === 'true' || !process.env.DB_HOST;

const databaseConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'stock_analysis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class Database {
  private pool: Pool | null = null;
  private useSqlite: boolean;

  constructor() {
    this.useSqlite = USE_SQLITE;
    
    if (!this.useSqlite) {
      this.pool = new Pool(databaseConfig);
      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client:', err);
      });
    } else {
      // Initialize SQLite connection
      sqliteDb.connect().catch(console.error);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (this.useSqlite) {
      return await sqliteDb.query(text, params);
    }

    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async run(text: string, params?: any[]): Promise<any> {
    if (this.useSqlite) {
      return await sqliteDb.query(text, params);
    }

    // For PostgreSQL, run is same as query for INSERT/UPDATE/DELETE
    return await this.query(text, params);
  }

  async get(text: string, params?: any[]): Promise<any> {
    if (this.useSqlite) {
      const result = await sqliteDb.query(text, params);
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }

    // For PostgreSQL
    const result = await this.query(text, params);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  async all(text: string, params?: any[]): Promise<any[]> {
    if (this.useSqlite) {
      const result = await sqliteDb.query(text, params);
      return result.rows || [];
    }

    // For PostgreSQL
    const result = await this.query(text, params);
    return result.rows || [];
  }

  async transaction<T>(callback: (query: (text: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
    if (this.useSqlite) {
      // SQLite auto-commit mode, simplified transaction
      return await callback(this.query.bind(this));
    }

    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = (text: string, params?: any[]) => client.query(text, params);
      const result = await callback(query);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.useSqlite) {
      await sqliteDb.close();
    } else if (this.pool) {
      await this.pool.end();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.useSqlite) {
        await sqliteDb.testConnection();
        console.log('SQLite database connection successful');
        return true;
      } else {
        const result = await this.query('SELECT NOW()');
        console.log('PostgreSQL database connection successful:', result.rows[0].now);
        return true;
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  getDatabaseType(): string {
    return this.useSqlite ? 'SQLite' : 'PostgreSQL';
  }
}

export const db = new Database();
export default db;