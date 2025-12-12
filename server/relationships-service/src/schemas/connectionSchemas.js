export const connectionRequestSchema = {
    type: 'object',
    required: ['addresseeId'],
    properties: {
        addresseeId: { type: 'integer', minimum: 1 }
    },
    additionalProperties: false
};

export const connectionDecisionSchema = {
    type: 'object',
    required: ['requesterId'],
    properties: {
        requesterId: { type: 'integer', minimum: 1 }
    },
    additionalProperties: false
};


export const friendIdSchema = {
    type: 'object',
    required: ['friendId'],
    properties: {
        friendId: { type: 'number' }
    },
    additionalProperties: false
};
