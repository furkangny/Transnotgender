import { wsClient } from "../../components/WebSocketClient";
import { navigate } from "../../router";
import { COLORS, FONTS } from "../../components/consts";
import * as gameState from './gameState';

export function setupDisconnectionHandlers(): void
{
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (gameState.gameRunning || wsClient.isConnected()) {
            wsClient.disconnect();
            console.log('[GAME] Disconnecting on page close');
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden && gameState.gameRunning) {
            console.log('[GAME] Page hidden during game, disconnecting...');
            wsClient.disconnect();
            gameState.setGameRunning(false);
        }
    };

    const handleSurrender = () => {
        if (confirm('Oyunu gerçekten terk etmek istiyor musunuz?')) {
            console.log('[GAME] Surrendering');
            if (wsClient.isConnected())
                wsClient.surrender()
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const surrenderButton = document.getElementById('surrenderButton');
    if (surrenderButton)
        surrenderButton.addEventListener('click', handleSurrender);

    gameState.addCleanupHandler(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (surrenderButton)
            surrenderButton.removeEventListener('click', handleSurrender);
    });
}

export function showGameOver(winner: 'player1' | 'player2', lives1: number, lives2: number, isTournament?: boolean, isBattleRoyale?: boolean, shouldDisconnect?: boolean, forfeit?: boolean): void
{
    gameState.setGameRunning(false);
    
    let isWinner: boolean;
    if (isBattleRoyale)
    {
        const winnerIndex = parseInt(winner.replace('player', '')) - 1;
        isWinner = winnerIndex === gameState.playerIndex;
    }
    else
        isWinner = winner === gameState.currentPlayerRole;
    
    let message = isWinner ? 'Kazandınız!' : 'Kaybettiniz!';
    if (forfeit) {
        message = isWinner ? 'Terk ile kazanılan zafer!' : 'Terk ettiniz';
    }
    const livesText = isBattleRoyale ? '' : `Son canlar: ${lives1} - ${lives2}`;
    
    if (!gameState.ctx || !gameState.canvas)
    {
        console.error('[GAME] showGameOver: ctx ou canvas null, redirection directe');
        const destination = (isTournament || isBattleRoyale) ? 'lobby' : 'home';
        setTimeout(() => returnToLobby(destination), 100);
        return;
    }
    
    gameState.ctx.save();
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    gameState.ctx.fillStyle = isWinner ? COLORS.SONPI16_ORANGE : '#ff0000';
    gameState.ctx.font = '48px ' + FONTS.QUENCY_PIXEL;
    gameState.ctx.textAlign = 'center';
    gameState.ctx.textBaseline = 'middle';
    gameState.ctx.fillText(message, gameState.canvas.width / 2, gameState.canvas.height / 2 - 40);
    
    if (livesText)
    {
        gameState.ctx.fillStyle = COLORS.SONPI16_ORANGE;
        gameState.ctx.font = '32px ' + FONTS.QUENCY_PIXEL;
        gameState.ctx.fillText(livesText, gameState.canvas.width / 2, gameState.canvas.height / 2 + 20);
    }
    
    gameState.ctx.font = '24px ' + FONTS.QUENCY_PIXEL;
    gameState.ctx.fillStyle = COLORS.SONPI16_ORANGE;
    if (isTournament && !shouldDisconnect)
    {
        gameState.ctx.fillText('Sonraki maç bekleniyor...', gameState.canvas.width / 2, gameState.canvas.height / 2 + 80);
        gameState.setPlayer1(null);
        gameState.setPlayer2(null);
        gameState.setBall(null);
        gameState.setCloneBalls([]);
        gameState.setBalls([]);
        gameState.setFruits([]);
        gameState.setIsWaitingForTournamentMatch(true);
        gameState.setGameRunning(true);
    }
    else
    {
        const destination = (isTournament || isBattleRoyale) ? 'lobby' : 'home';
        gameState.ctx.fillText('3 saniye içinde lobiye dönülüyor...', gameState.canvas.width / 2, gameState.canvas.height / 2 + 80);
        setTimeout(() => {
            returnToLobby(destination);
        }, 3000);
    }
    gameState.ctx.restore();
}

export function returnToLobby(destination: 'home' | 'lobby' = 'home'): void
{
    if (gameState.isReturningToLobby) {
        console.log('[GAME] Return to lobby already in progress, ignoring');
        return;
    }
    
    console.log(`[GAME] Returning to ${destination}, disconnecting WebSocket...`);
    gameState.setIsReturningToLobby(true);
    gameState.setGameRunning(false);
    gameState.setCurrentPlayerRole(null);
    gameState.setPlayer1(null);
    gameState.setPlayer2(null);
    gameState.setBall(null);
    gameState.setCloneBalls([]);
    gameState.setBalls([]);
    gameState.setFruits([]);
    gameState.setIsBattleRoyale(false);
    gameState.setPolygonData(null);
    gameState.setPlayerIndex(0);
    gameState.setAllPlayers([]);
    gameState.setTournamentCountdown(null);
    gameState.setTournamentSiblingMatch(null);
    gameState.setTournamentOtherMatches([]);
    gameState.setIsWaitingForTournamentMatch(false);
    
    if (gameState.animationFrameId !== null) {
        cancelAnimationFrame(gameState.animationFrameId);
        gameState.setAnimationFrameId(null);
    }
    
    wsClient.disconnect();
    gameState.clearCleanupHandlers();
    navigate(destination);
    
    setTimeout(() => {
        gameState.setIsReturningToLobby(false);
    }, 1000);
}

let lastPingSentTime = 0;

export function updatePing(): void
{
    const now = Date.now();
    if (now - lastPingSentTime > 500)
    {
        wsClient.sendPing();
        lastPingSentTime = now;
    }
}
