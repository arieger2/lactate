/**
 * Database pool manager with dynamic configuration
 * 
 * This module exports the database pool from dbPoolManager which:
 * 1. Reads configuration from config/app.config.json (single source of truth)
 * 2. Automatically recreates pool when configuration changes
 * 3. Notifies via file watching (no manual server restart needed)
 */

export { pool as default } from './dbPoolManager'
export { pool } from './dbPoolManager'