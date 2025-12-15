/*
 * SQLite Plugin - Database Connection
 * Provides SQLite database access for auth service
 */
import fp from 'fastify-plugin';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_FILE_PATH = './auth.db.sqlite';

async function sqlitePlugin(fastify, options) {
    const dbConnection = await open({
        filename: DB_FILE_PATH,
        driver: sqlite3.Database
    });
    fastify.decorate('db', dbConnection);
}

export default fp(sqlitePlugin);
