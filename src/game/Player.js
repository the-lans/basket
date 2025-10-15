// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { clamp, distance, angleTo } from '../core/Math.js';
import { calculateOptimalShotPower } from './Physics.js';

/**
 * Игрок с управлением, стаминой и анимациями
 */
export class Player {
    /**
     * @param {string} id
     * @param {string} team - 'player' | 'ai'
     * @param {number} x
     * @param {number} y
     */
    constructor(id, team, x, y) {
        this.id = id;
        this.team = team;
        
        // Позиция
        this.x = x;
        this.y = y;
        this.z = 0;
        
        // Скорость
        this.vx = 0;
        this.vy = 0;
        
        // Направление взгляда (радианы)
        this.facing = 0;
        
        // Стамина
        this.stamina = CONFIG.PLAYER.STAMINA_MAX;
        this.isSprinting = false;
        
        // Состояние
        this.hasBall = false;
        this.state = 'idle'; // idle, run, dribble, shoot, layup, defend
        this.stateTime = 0;
        
        // Бросок
        this.shotPower = 0;
        this.shotCharging = false;
        this.shotAngle = 0;
        
        // Кулдауны
        this.stealCooldown = 0;
        this.stepBackCooldown = 0;
        this.invulnerableTime = 0;
        
        // Цвет команды
        this.color = team === 'player' ? CONFIG.COLORS.TEAM_PLAYER : CONFIG.COLORS.TEAM_AI;
        
        // Позиция кольца
        this.rimX = CONFIG.COURT.WIDTH / 2;
        this.rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
    }

    /**
     * Обновить игрока
     * @param {number} dt
     */
    update(dt) {
        // Обновить таймеры
        this.stateTime += dt;
        this.stealCooldown = Math.max(0, this.stealCooldown - dt);
        this.stepBackCooldown = Math.max(0, this.stepBackCooldown - dt);
        this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
        
        // Обновить скорость (трение)
        this.vx *= (1 - CONFIG.PLAYER.FRICTION * dt);
        this.vy *= (1 - CONFIG.PLAYER.FRICTION * dt);
        
        // Обновить позицию
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Обновить стамину
        this.updateStamina(dt);
        
        // Обновить состояние
        this.updateState(dt);
    }

    /**
     * Обновить стамину
     * @param {number} dt
     */
    updateStamina(dt) {
        if (this.isSprinting) {
            this.stamina -= CONFIG.PLAYER.STAMINA_SPRINT_DRAIN * dt;
            if (this.stamina < 0) {
                this.stamina = 0;
                this.isSprinting = false;
            }
        } else {
            this.stamina += CONFIG.PLAYER.STAMINA_REGEN * dt;
            if (this.stamina > CONFIG.PLAYER.STAMINA_MAX) {
                this.stamina = CONFIG.PLAYER.STAMINA_MAX;
            }
        }
    }

    /**
     * Обновить состояние анимации
     * @param {number} dt
     */
    updateState(dt) {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        
        if (this.shotCharging) {
            this.state = 'shoot';
        } else if (speed > 0.5) {
            this.state = this.hasBall ? 'dribble' : 'run';
        } else {
            this.state = 'idle';
        }
    }

    /**
     * Применить движение
     * @param {number} dirX
     * @param {number} dirY
     */
    applyMovement(dirX, dirY) {
        const speed = this.getEffectiveSpeed();
        const accel = CONFIG.PLAYER.ACCELERATION;
        
        this.vx += dirX * accel * (1 / 60);
        this.vy += dirY * accel * (1 / 60);
        
        // Ограничить скорость
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > speed) {
            this.vx = (this.vx / currentSpeed) * speed;
            this.vy = (this.vy / currentSpeed) * speed;
        }
        
        // Обновить направление взгляда
        if (dirX !== 0 || dirY !== 0) {
            this.facing = Math.atan2(dirY, dirX);
        }
    }

    /**
     * Получить эффективную скорость с учетом спринта и стамины
     * @returns {number}
     */
    getEffectiveSpeed() {
        let speed = CONFIG.PLAYER.BASE_SPEED;
        
        // Спринт
        if (this.isSprinting && this.stamina > CONFIG.PLAYER.STAMINA_MIN_FOR_SPRINT) {
            speed *= CONFIG.PLAYER.SPRINT_MULTIPLIER;
        }
        
        // Штраф за низкую стамину
        if (this.stamina < CONFIG.PLAYER.LOW_STAMINA_THRESHOLD) {
            speed *= CONFIG.PLAYER.LOW_STAMINA_SPEED_PENALTY;
        }
        
        return speed;
    }

    /**
     * Начать зарядку броска
     * @param {number} angle - Угол к кольцу
     */
    startShot(angle) {
        if (!this.hasBall) return;
        
        this.shotCharging = true;
        this.shotPower = 0;
        this.shotAngle = angle;
    }

    /**
     * Зарядить бросок
     * @param {number} dt
     */
    chargeShot(dt) {
        if (!this.shotCharging) return;
        
        this.shotPower += CONFIG.BALL.POWER_CHARGE_RATE * dt;
        this.shotPower = clamp(this.shotPower, CONFIG.BALL.MIN_SHOT_POWER, CONFIG.BALL.MAX_SHOT_POWER);
    }

    /**
     * Выполнить бросок
     * @returns {{vx: number, vy: number, vz: number, power: number}}
     */
    executeShot() {
        if (!this.shotCharging || !this.hasBall) {
            return null;
        }
        
        // Вычислить дистанцию до кольца
        const distToRim = distance(this.x, this.y, this.rimX, this.rimY);
        
        // Оптимальная сила
        const optimalPower = calculateOptimalShotPower(distToRim);
        
        // Штраф за низкую стамину
        let accuracy = 1.0;
        if (this.stamina < CONFIG.PLAYER.LOW_STAMINA_THRESHOLD) {
            accuracy = CONFIG.PLAYER.LOW_STAMINA_ACCURACY_PENALTY;
        }
        
        // Угол к кольцу
        const angleToRim = angleTo(this.x, this.y, this.rimX, this.rimY);
        
        // Горизонтальная скорость
        const horizontalSpeed = this.shotPower * optimalPower * accuracy;
        const vx = Math.cos(angleToRim) * horizontalSpeed;
        const vy = Math.sin(angleToRim) * horizontalSpeed;
        
        // Вертикальная скорость (для достижения высоты кольца)
        const vz = Math.sqrt(2 * CONFIG.BALL.GRAVITY * CONFIG.COURT.RIM_HEIGHT) * (0.8 + this.shotPower * 0.4);
        
        // Сброс состояния
        this.shotCharging = false;
        this.hasBall = false;
        
        return { vx, vy, vz, power: this.shotPower };
    }

    /**
     * Выполнить step-back
     * @returns {boolean}
     */
    performStepBack() {
        if (this.stepBackCooldown > 0) return false;
        
        // Откат назад
        const backAngle = this.facing + Math.PI;
        const stepDistance = 1.5;
        
        this.x += Math.cos(backAngle) * stepDistance;
        this.y += Math.sin(backAngle) * stepDistance;
        
        // Установить кулдаун и неуязвимость
        this.stepBackCooldown = CONFIG.GAME.STEPBACK_COOLDOWN;
        this.invulnerableTime = CONFIG.GAME.STEPBACK_INVULN_TIME;
        
        return true;
    }

    /**
     * Попытка перехвата
     * @param {Player} target
     * @returns {boolean}
     */
    attemptSteal(target) {
        if (this.stealCooldown > 0) return false;
        if (!target.hasBall) return false;
        if (target.invulnerableTime > 0) return false;
        
        // Проверка дистанции
        const dist = distance(this.x, this.y, target.x, target.y);
        if (dist > CONFIG.PLAYER.RADIUS * 3) return false;
        
        // Установить кулдаун
        this.stealCooldown = CONFIG.GAME.STEAL_COOLDOWN;
        
        // Шанс успеха (зависит от расстояния)
        const successChance = 0.3 * (1 - dist / (CONFIG.PLAYER.RADIUS * 3));
        
        return Math.random() < successChance;
    }

    /**
     * Отрисовка игрока (упрощенная)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreen
     */
    render(ctx, worldToScreen) {
        const { sx, sy } = worldToScreen(this.x, this.y, this.z);
        
        // Тень
        const shadowPos = worldToScreen(this.x, this.y, 0);
        ctx.save();
        ctx.fillStyle = 'rgba(14, 19, 32, 0.3)';
        ctx.beginPath();
        ctx.ellipse(shadowPos.sx, shadowPos.sy, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Тело игрока (упрощенная форма)
        this.renderBody(ctx, sx, sy);
        
        // Индикатор выносливости (над головой)
        this.renderStaminaBar(ctx, sx, sy - 50);
    }

    /**
     * Отрисовка тела игрока (человечек)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} sx
     * @param {number} sy
     */
    renderBody(ctx, sx, sy) {
        ctx.save();
        
        // Голова
        ctx.fillStyle = '#FFD4A3'; // Цвет кожи
        ctx.beginPath();
        ctx.arc(sx, sy - 25, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка головы
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Тело (майка)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 5, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка майки
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Номер на майке
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.team === 'player' ? '1' : '2', sx, sy - 5);
        
        // Ноги (две линии)
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // Левая нога
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy + 13);
        ctx.lineTo(sx - 5, sy + 25);
        ctx.stroke();
        
        // Правая нога
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy + 13);
        ctx.lineTo(sx + 5, sy + 25);
        ctx.stroke();
        
        // Руки
        ctx.strokeStyle = '#FFD4A3';
        ctx.lineWidth = 3;
        
        // Левая рука
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy - 10);
        ctx.lineTo(sx - 15, sy);
        ctx.stroke();
        
        // Правая рука (поднята если держит мяч)
        if (this.hasBall) {
            ctx.beginPath();
            ctx.moveTo(sx + 10, sy - 10);
            ctx.lineTo(sx + 12, sy - 20);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(sx + 10, sy - 10);
            ctx.lineTo(sx + 15, sy);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Отрисовка шкалы выносливости
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} sx
     * @param {number} sy
     */
    renderStaminaBar(ctx, sx, sy) {
        const barWidth = 40;
        const barHeight = 4;
        const percent = this.stamina / CONFIG.PLAYER.STAMINA_MAX;
        
        ctx.save();
        
        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(sx - barWidth / 2, sy, barWidth, barHeight);
        
        // Заполнение
        let color = '#4CAF50'; // Зеленый
        if (percent < 0.3) {
            color = '#F44336'; // Красный
        } else if (percent < 0.6) {
            color = '#FFC107'; // Желтый
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(sx - barWidth / 2, sy, barWidth * percent, barHeight);
        
        ctx.restore();
    }

    /**
     * Получить позицию для мяча (когда игрок держит)
     * @returns {{x: number, y: number, z: number}}
     */
    getBallPosition() {
        return {
            x: this.x,
            y: this.y,
            z: 1.2,
        };
    }
}

