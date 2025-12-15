/*
 * Dashboard Helpers
 * Utility functions for dashboard service
 */
import WebSocket from 'ws';

async function retrievePlayerData(redisClient, mqClient, wsSocket) {
    let playerList = [];
    let sortedPlayers = [];

    const playerIds = await redisClient.sMembers('userIds');
    console.log("PLAYER_IDS: ", playerIds);
    const idKeys = playerIds.map(id => `player:${id}`);
    if (idKeys && idKeys[0]) {
        playerList = await redisClient.sendCommand([
            'JSON.MGET',
            ...idKeys,
            '$'
        ]);
        console.log("HAHOMA PLAYERS: ", playerList);
        sortedPlayers = await Promise.all(playerList
            .map(jsonPlayer => {
                const playerData = JSON.parse(jsonPlayer);
                if (playerData && playerData[0])
                    return playerData[0];
            })
        );

        sortedPlayers.sort(rankPlayers);
        console.log("Players from dashboard-service", sortedPlayers);

        sortedPlayers.forEach((playerData, rank) => {
            if (playerData.rank !== rank + 1) {
                mqClient.produceMessage({
                    type: 'UPDATE_RANK',
                    userId: playerData.userId,
                    rank: rank + 1
                }, 'profile.rank.update');
                playerData.rank = rank + 1;
            }
        });
    }
    return sortedPlayers;
}

function rankPlayers(player1, player2) {
    if (player1.level !== player2.level)
        return player2.level - player1.level;

    if (player1.xp !== player2.xp)
        return player2.xp - player1.xp;

    if (player1.matches_won !== player2.matches_won)
        return player2.matches_won - player1.matches_won;

    if (player1.matches_played !== player2.matches_played)
        return player2.matches_played - player1.matches_played;

    return (1);
}

export async function showDashboard(redisClient, wsSocket, mqClient) {
    if (wsSocket.isAuthenticated && wsSocket.readyState === WebSocket.OPEN) {
        const playerList = await retrievePlayerData(redisClient, mqClient, wsSocket);
        if (playerList)
            wsSocket.send(JSON.stringify(playerList));
    }
}  	
