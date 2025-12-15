/*
 * Utility Functions
 * Response helpers for game service
 */
import WebSocket from 'ws';


export function createResponse(status, code, data) {
    return ({
        statusCode: status,
        code: code,
        data: data
    });
}
