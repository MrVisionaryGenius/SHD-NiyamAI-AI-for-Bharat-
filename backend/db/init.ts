import { getDbPool } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize database schema
 * Reads and executes the schema.sql file
 */
export async function initializeDatabase(): Promise<void> {
  const pool = getDbPool();
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Initializing database schema...');
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables(): Promise<void> {
  const pool = getDbPool();
  
  try {
    console.log('Dropping all tables...');
    await pool.query(`
      DROP TABLE IF EXISTS security_responses CASCADE;
      DROP TABLE IF EXISTS recommendations CASCADE;
      DROP TABLE IF EXISTS risks CASCADE;
      DROP TABLE IF EXISTS assessments CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
    `);
    console.log('All tables dropped successfully');
  } catch (error) {
    console.error('Failed to drop tables:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'init') {
    initializeDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'drop') {
    dropAllTables()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'reset') {
    dropAllTables()
      .then(() => initializeDatabase())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Usage: ts-node init.ts [init|drop|reset]');
    process.exit(1);
  }
}
