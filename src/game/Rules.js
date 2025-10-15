// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { isThreePoint } from './Physics.js';
import { GameSettings } from '../config.js';

/**
 * Система правил игры (счет, владение, шот-клок, фолы)
 */
export class Rules {
    /**
     * @param {GameSettings} settings
     */
    constructor(settings) {
        this.settings = settings;
        
        // Счет
        this.playerScore = 0;
        this.aiScore = 0;
        
        // Владение
        this.possession = 'player'; // 'player' | 'ai'
        this.needsCheckBall = false;
        this.checkBallPosition = {
            x: CONFIG.COURT.WIDTH / 2,
            y: CONFIG.COURT.FREE_THROW_DISTANCE + CONFIG.COURT.BACKBOARD_DISTANCE,
        };
        
        // Шот-клок
        this.shotClock = settings.shotClockDuration;
        this.shotClockActive = false;
        
        // Состояние игры
        this.gameState = 'checkBall'; // 'checkBall', 'liveBall', 'freeThrow', 'gameOver'
        
        // Позиции для очистки мяча
        this.clearBallDistance = CONFIG.COURT.THREE_POINT_RADIUS;
        
        // Статистика
        this.stats = {
            playerShots: 0,
            playerMakes: 0,
            aiShots: 0,
            aiMakes: 0,
            fouls: 0,
        };
    }

    /**
     * Обновить правила
     * @param {number} dt
     */
    update(dt) {
        // Обновить шот-клок
        if (this.shotClockActive && this.gameState === 'liveBall') {
            this.shotClock -= dt;
            
            if (this.shotClock <= 0) {
                this.handleShotClockViolation();
            }
        }
    }

    /**
     * Засчитать очко
     * @param {string} team - 'player' | 'ai'
     * @param {number} shotX
     * @param {number} shotY
     */
    scorePoints(team, shotX, shotY) {
        const scoringSystem = this.settings.getScoringSystem();
        const points = isThreePoint(shotX, shotY) ? scoringSystem.THREE_POINT : scoringSystem.INSIDE;
        
        if (team === 'player') {
            this.playerScore += points;
            this.stats.playerMakes++;
        } else {
            this.aiScore += points;
            this.stats.aiMakes++;
        }
        
        // Смена владения (в стритболе после очка владение остается)
        // В данном случае делаем check ball
        this.changePossession(team);
        this.needsCheckBall = true;
        this.gameState = 'checkBall';
        this.shotClockActive = false;
        
        // Проверка победы
        if (this.playerScore >= CONFIG.GAME.WIN_SCORE) {
            this.gameState = 'gameOver';
        } else if (this.aiScore >= CONFIG.GAME.WIN_SCORE) {
            this.gameState = 'gameOver';
        }
    }

    /**
     * Сменить владение
     * @param {string} newPossession
     */
    changePossession(newPossession) {
        this.possession = newPossession;
        this.needsCheckBall = true;
        this.resetShotClock();
    }

    /**
     * Начать живую игру (после check ball)
     */
    startLiveBall() {
        this.gameState = 'liveBall';
        this.needsCheckBall = false;
        this.shotClockActive = true;
        this.resetShotClock();
    }

    /**
     * Сброс в состояние check ball (для экстренного сброса)
     */
    resetToCheckBall() {
        this.gameState = 'checkBall';
        this.needsCheckBall = true;
        this.shotClockActive = false;
        this.resetShotClock();
    }

    /**
     * Сброс шот-клока
     */
    resetShotClock() {
        this.shotClock = this.settings.shotClockDuration;
    }

    /**
     * Обработка нарушения шот-клока
     */
    handleShotClockViolation() {
        console.log('Shot clock violation!');
        
        // Смена владения
        const newPossession = this.possession === 'player' ? 'ai' : 'player';
        this.changePossession(newPossession);
        this.gameState = 'checkBall';
        this.shotClockActive = false;
    }

    /**
     * Обработка фола
     * @param {string} foulOn - На ком фол
     * @returns {boolean} - Нужен ли штрафной
     */
    handleFoul(foulOn) {
        this.stats.fouls++;
        
        // В нашей упрощенной системе - 1 штрафной
        this.gameState = 'freeThrow';
        this.changePossession(foulOn);
        
        return true;
    }

    /**
     * Выполнить штрафной
     * @param {boolean} made
     */
    processFreeThrow(made) {
        if (made) {
            if (this.possession === 'player') {
                this.playerScore += CONFIG.GAME.FOUL_FREE_THROW_POINTS;
            } else {
                this.aiScore += CONFIG.GAME.FOUL_FREE_THROW_POINTS;
            }
        }
        
        // После штрафного - check ball
        this.gameState = 'checkBall';
        this.needsCheckBall = true;
        
        // Проверка победы
        if (this.playerScore >= CONFIG.GAME.WIN_SCORE || this.aiScore >= CONFIG.GAME.WIN_SCORE) {
            this.gameState = 'gameOver';
        }
    }

    /**
     * Проверить, нужна ли очистка мяча за дугой
     * @param {number} ballX
     * @param {number} ballY
     * @returns {boolean}
     */
    needsClearBall(ballX, ballY) {
        // Проверить, что мяч за трехочковой линией
        return isThreePoint(ballX, ballY);
    }

    /**
     * Получить текущее владение
     * @returns {string}
     */
    getPossession() {
        return this.possession;
    }

    /**
     * Получить состояние игры
     * @returns {string}
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * Проверка окончания игры
     * @returns {string|null} - 'player' | 'ai' | null
     */
    getWinner() {
        if (this.gameState !== 'gameOver') return null;
        
        if (this.playerScore >= CONFIG.GAME.WIN_SCORE) return 'player';
        if (this.aiScore >= CONFIG.GAME.WIN_SCORE) return 'ai';
        
        return null;
    }

    /**
     * Получить точность бросков игрока
     * @returns {number}
     */
    getPlayerAccuracy() {
        if (this.stats.playerShots === 0) return 0;
        return this.stats.playerMakes / this.stats.playerShots;
    }

    /**
     * Получить точность бросков AI
     * @returns {number}
     */
    getAIAccuracy() {
        if (this.stats.aiShots === 0) return 0;
        return this.stats.aiMakes / this.stats.aiShots;
    }

    /**
     * Зарегистрировать попытку броска
     * @param {string} team
     */
    registerShotAttempt(team) {
        if (team === 'player') {
            this.stats.playerShots++;
        } else {
            this.stats.aiShots++;
        }
    }

    /**
     * Сброс для новой игры
     */
    reset() {
        this.playerScore = 0;
        this.aiScore = 0;
        this.possession = 'player';
        this.needsCheckBall = true;
        this.gameState = 'checkBall';
        this.resetShotClock();
        this.shotClockActive = false;
        
        this.stats = {
            playerShots: 0,
            playerMakes: 0,
            aiShots: 0,
            aiMakes: 0,
            fouls: 0,
        };
    }
}



