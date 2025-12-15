/*
 * SQLite Plugin
 * Database connection for relationships service
 */
import fp from 'fastify-plugin';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = './relationships.db.sqlite';

async function sqlitePlugin(fastify, opts) {
    const dbConn = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    fastify.decorate('db', dbConn);
};

export default fp(sqlitePlugin);
