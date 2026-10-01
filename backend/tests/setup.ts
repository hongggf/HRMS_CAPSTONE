import dotenv from 'dotenv';
import path from 'path';

// Load .env.test BEFORE any test code runs.
// This ensures tests always use the test database, never the dev database.
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
