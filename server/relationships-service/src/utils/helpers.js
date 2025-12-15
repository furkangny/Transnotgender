/*
 * Utility Functions
 * Response helpers for relationships service
 */

export function createResponse(status, code, data) {
    return ({
        statusCode: status,
        code: code,
        data: data
    });
}
