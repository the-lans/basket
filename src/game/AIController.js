// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { distance, angleTo, globalRandom } from '../core/Math.js';
import { calculateOptimalShotPower, isThreePoint } from './Physics.js';

/**
 * AI контроллер с состояниями для управления ботом
 */
export class AIController {
    /**
     * @param {Player} player
     * @param {string} difficulty
     */
    constructor(player, difficulty = 'STANDARD') {
        this.player = player;
        this.difficulty = difficulty;
        this.params = CONFIG.AI.DIFFICULTIES[difficulty] || CONFIG.AI.DIFFICULTIES.STANDARD;
        
        // Состояние
        this.state = 'idle';
        this.stateTime = 0;
        this.decisionTimer = 0;
        
        // Цели
        this.targetX = player.x;
        this.targetY = player.y;
        
        // Кольцо
        this.rimX = CONFIG.COURT.WIDTH / 2;
        this.rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
    }

    /**
     * Установить сложность
     * @param {string} difficulty
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.params = CONFIG.AI.DIFFICULTIES[difficulty] || CONFIG.AI.DIFFICULTIES.STANDARD;
    }

    /**
     * Обновить AI
     * @param {number} dt
     * @param {Object} world - {ball, opponent, shotClock}
     */
    update(dt, world) {
        this.stateTime += dt;
        this.decisionTimer -= dt;
        
        // Принять решение если таймер истек
        if (this.decisionTimer <= 0) {
            this.makeDecision(world);
            this.decisionTimer = this.params.DECISION_DELAY;
        }
        
        // Выполнить текущее состояние
        this.executeState(dt, world);
    }

    /**
     * Принять решение о действии
     * @param {Object} world
     */
    makeDecision(world) {
        const { ball, opponent, shotClock } = world;
        
        // Если у нас мяч
        if (this.player.hasBall) {
            this.decideOffense(ball, opponent, shotClock);
        } else {
            // Защита
            this.decideDefense(ball, opponent);
        }
    }

    /**
     * Решение в атаке
     * @param {Ball} ball
     * @param {Player} opponent
     * @param {number} shotClock
     */
    decideOffense(ball, opponent, shotClock) {
        const distToRim = distance(this.player.x, this.player.y, this.rimX, this.rimY);
        const distToOpponent = distance(this.player.x, this.player.y, opponent.x, opponent.y);
        
        // Форсировать бросок если шот-клок заканчивается
        if (shotClock < CONFIG.AI.FORCE_SHOT_TIME) {
            this.state = 'shoot';
            return;
        }
        
        // Близко к кольцу - лэйап
        if (distToRim < 2.0 && distToOpponent > 1.5) {
            this.state = 'layup';
            return;
        }
        
        // Открытый бросок
        const isOpen = distToOpponent > CONFIG.AI.CONTEST_DISTANCE;
        const inRange = distToRim < 7.0;
        
        if (isOpen && inRange) {
            const shootChance = this.calculateShootChance(distToRim, distToOpponent);
            if (globalRandom.bool(shootChance)) {
                this.state = 'shoot';
                return;
            }
        }
        
        // Двигаться к кольцу
        if (distToRim > 3.0) {
            this.state = 'attack_drive';
            this.targetX = this.rimX;
            this.targetY = this.rimY + 2.0;
        } else {
            // Маневр
            this.state = 'attack_probe';
            this.chooseProbeTarget();
        }
    }

    /**
     * Решение в защите
     * @param {Ball} ball
     * @param {Player} opponent
     */
    decideDefense(ball, opponent) {
        const distToOpponent = distance(this.player.x, this.player.y, opponent.x, opponent.y);
        
        // Если мяч свободен
        if (ball.state === 'free') {
            this.state = 'rebound';
            this.targetX = ball.x;
            this.targetY = ball.y;
            return;
        }
        
        // Если противник с мячом
        if (opponent.hasBall) {
            // Контест если противник бросает
            if (opponent.shotCharging) {
                this.state = 'defend_contest';
                this.targetX = opponent.x;
                this.targetY = opponent.y;
            } else {
                // Прессинг
                if (distToOpponent > CONFIG.AI.DEFENSE_PRESS_DISTANCE) {
                    this.state = 'defend_press';
                    this.targetX = opponent.x;
                    this.targetY = opponent.y;
                } else {
                    // Перекрыть путь к кольцу
                    this.state = 'defend_press';
                    const angleToRim = angleTo(opponent.x, opponent.y, this.rimX, this.rimY);
                    this.targetX = opponent.x + Math.cos(angleToRim) * 1.2;
                    this.targetY = opponent.y + Math.sin(angleToRim) * 1.2;
                }
            }
        }
    }

    /**
     * Выполнить текущее состояние
     * @param {number} dt
     * @param {Object} world
     */
    executeState(dt, world) {
        switch (this.state) {
            case 'attack_drive':
            case 'attack_probe':
            case 'defend_press':
            case 'defend_contest':
            case 'rebound':
                this.moveToTarget();
                break;
                
            case 'shoot':
                this.executeShoot(world);
                break;
                
            case 'layup':
                this.executeLayup(world);
                break;
        }
    }

    /**
     * Двигаться к целевой точке
     */
    moveToTarget() {
        const dist = distance(this.player.x, this.player.y, this.targetX, this.targetY);
        
        if (dist < 0.5) return;
        
        const angle = angleTo(this.player.x, this.player.y, this.targetX, this.targetY);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Спринт если далеко
        this.player.isSprinting = dist > 3.0;
        
        this.player.applyMovement(dirX, dirY);
    }

    /**
     * Выполнить бросок
     * @param {Object} world
     */
    executeShoot(world) {
        if (!this.player.hasBall) {
            this.state = 'idle';
            return;
        }
        
        // Начать зарядку если еще не начата
        if (!this.player.shotCharging) {
            const angleToRim = angleTo(this.player.x, this.player.y, this.rimX, this.rimY);
            this.player.startShot(angleToRim);
        }
        
        // Зарядить бросок
        const distToRim = distance(this.player.x, this.player.y, this.rimX, this.rimY);
        const optimalPower = this.calculateOptimalPowerForDistance(distToRim);
        
        this.player.chargeShot(1 / 60);
        
        // Выполнить бросок когда сила достигнута
        if (this.player.shotPower >= optimalPower - 0.1) {
            const shotData = this.player.executeShot();
            if (shotData) {
                world.ball.release(shotData.vx, shotData.vy, shotData.vz);
                
                // Звук броска мяча AI
                if (world.audio) {
                    world.audio.playSFX('ball', 0.6, 1.0);
                }
                
                this.state = 'idle';
            }
        }
    }

    /**
     * Выполнить лэйап
     * @param {Object} world
     */
    executeLayup(world) {
        if (!this.player.hasBall) {
            this.state = 'idle';
            return;
        }
        
        // Двигаться к кольцу
        this.targetX = this.rimX;
        this.targetY = this.rimY + 0.5;
        this.moveToTarget();
        
        // Если близко - бросить
        const distToRim = distance(this.player.x, this.player.y, this.rimX, this.rimY);
        if (distToRim < 1.5) {
            const angleToRim = angleTo(this.player.x, this.player.y, this.rimX, this.rimY);
            this.player.startShot(angleToRim);
            this.player.shotPower = 0.6; // Средняя сила для лэйапа
            
            const shotData = this.player.executeShot();
            if (shotData) {
                world.ball.release(shotData.vx, shotData.vy, shotData.vz);
                
                // Звук лэйапа AI
                if (world.audio) {
                    world.audio.playSFX('ball', 0.6, 1.0);
                }
                
                this.state = 'idle';
            }
        }
    }

    /**
     * Вычислить шанс броска
     * @param {number} distToRim
     * @param {number} distToOpponent
     * @returns {number}
     */
    calculateShootChance(distToRim, distToOpponent) {
        let chance = 0.3;
        
        // Ближе к кольцу - выше шанс
        if (distToRim < 4.0) chance += 0.3;
        else if (distToRim < 6.0) chance += 0.2;
        
        // Открытый бросок
        if (distToOpponent > 2.5) chance += 0.2;
        
        return Math.min(chance, 0.8);
    }

    /**
     * Вычислить оптимальную силу для дистанции
     * @param {number} distance
     * @returns {number}
     */
    calculateOptimalPowerForDistance(distance) {
        const baseSpeed = calculateOptimalShotPower(distance);
        const normalized = baseSpeed / (CONFIG.BALL.SHOT_BASE_SPEED + 7 * CONFIG.BALL.SHOT_DISTANCE_FACTOR);
        return Math.min(normalized * this.params.SHOT_ACCURACY, CONFIG.BALL.MAX_SHOT_POWER);
    }

    /**
     * Выбрать целевую точку для маневрирования
     */
    chooseProbeTarget() {
        const angles = [-45, -30, 0, 30, 45];
        const chosenAngle = globalRandom.choice(angles) * Math.PI / 180;
        const angleToRim = angleTo(this.player.x, this.player.y, this.rimX, this.rimY);
        
        const finalAngle = angleToRim + chosenAngle;
        const dist = 1.5;
        
        this.targetX = this.player.x + Math.cos(finalAngle) * dist;
        this.targetY = this.player.y + Math.sin(finalAngle) * dist;
    }

    /**
     * Получить текущее состояние (для отладки)
     * @returns {string}
     */
    getState() {
        return this.state;
    }
}



