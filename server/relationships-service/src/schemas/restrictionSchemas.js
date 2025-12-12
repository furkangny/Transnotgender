
export const restrictionSchema = {
    type: 'object',
    required: ['blockedId'],
    properties: {
        blockedId: { type: 'number' }
    },
    additionalProperties: false
};
