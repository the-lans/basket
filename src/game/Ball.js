// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { checkRimCollision, checkBackboardCollision, reflectFromBackboard } from './Physics.js';
import { distance } from '../core/Math.js';

/**
 * Мяч с баллистической физикой
 */
export class Ball {
    constructor() {
        // Позиция
        this.x = CONFIG.COURT.WIDTH / 2;
        this.y = CONFIG.COURT.LENGTH / 2;
        this.z = 0;
        
        // Скорость
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        
        // Состояние
        this.state = 'free'; // 'free', 'held', 'inFlight'
        this.holderId = null;
        
        // Кольцо
        this.rimX = CONFIG.COURT.WIDTH / 2;
        this.rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
        this.rimZ = CONFIG.COURT.RIM_HEIGHT;
        
        // Флаги
        this.hasScored = false;
        this.isOutOfBounds = false;
        this.justReleased = false; // Мяч только что был брошен (для звука приземления)
        
        // Анимация дриблинга
        this.dribbleTime = 0;
        this.dribbleBounceHeight = 0.3; // Амплитуда отскока при дриблинге
    }

    /**
     * Привязать мяч к игроку
     * @param {string} playerId
     * @param {number} x
     * @param {number} y
     */
    attachTo(playerId, x, y) {
        this.state = 'held';
        this.holderId = playerId;
        this.x = x;
        this.y = y;
        this.z = 1.2; // Высота держания мяча
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.hasScored = false;
        this.isOutOfBounds = false; // Сброс флага аута
        this.justReleased = false; // Сброс флага броска
        
        // Для анимации дриблинга
        if (!this.dribbleTime) {
            this.dribbleTime = 0;
        }
    }

    /**
     * Отпустить мяч (бросок)
     * @param {number} vx
     * @param {number} vy
     * @param {number} vz
     */
    release(vx, vy, vz) {
        this.state = 'inFlight';
        // НЕ обнуляем holderId - нужно помнить кто бросал для засчитывания очков!
        // this.holderId останется от того кто держал мяч
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.hasScored = false;
        this.justReleased = true; // Отметить что мяч только что выпущен
    }

    /**
     * Обновить физику мяча
     * @param {number} dt
     * @param {Object} [audio] - AudioManager для звуков
     */
    update(dt, audio = null) {
        if (this.state === 'held') {
            // Анимация дриблинга
            this.dribbleTime += dt;
            const bounceFrequency = 2.0; // Частота отскока (раз в секунду)
            this.z = 1.2 + Math.abs(Math.sin(this.dribbleTime * bounceFrequency * Math.PI)) * this.dribbleBounceHeight;
            return;
        }
        
        // Гравитация
        this.vz -= CONFIG.BALL.GRAVITY * dt;
        
        // Обновление позиции
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
        
        // Трение воздуха
        this.vx *= CONFIG.BALL.FRICTION_AIR;
        this.vy *= CONFIG.BALL.FRICTION_AIR;
        
        // Коллизия с землей
        if (this.z <= CONFIG.BALL.RADIUS) {
            this.z = CONFIG.BALL.RADIUS;
            
            // Звук приземления при достаточной скорости
            const impactSpeed = Math.abs(this.vz);
            if (audio && impactSpeed > 1.0) { // Порог для избежания звуков при микро-отскоках
                // Громкость зависит от скорости удара
                const volume = Math.min(0.8, 0.3 + impactSpeed * 0.1);
                const pitch = 0.7 + Math.random() * 0.2; // Небольшая вариация высоты тона
                audio.playSFX('ball', volume, pitch);
            }
            
            this.vz = -this.vz * CONFIG.BALL.BOUNCE_FACTOR;
            this.justReleased = false; // Сброс флага броска
            
            // Трение земли
            this.vx *= CONFIG.BALL.FRICTION_GROUND;
            this.vy *= CONFIG.BALL.FRICTION_GROUND;
            
            // Остановка если скорость низкая
            if (Math.abs(this.vz) < 0.5) {
                this.vz = 0;
                this.z = CONFIG.BALL.RADIUS;
                this.state = 'free';
            }
        }
        
        // Проверка кольца (только если летит вниз)
        if (this.state === 'inFlight' && this.vz < 0 && !this.hasScored) {
            if (checkRimCollision(this.x, this.y, this.z, this.rimX, this.rimY, this.rimZ)) {
                this.hasScored = true;
                // Мяч проходит через кольцо
                this.vz *= 0.7; // Небольшое замедление
            }
        }
        
        // Проверка щита
        if (this.state === 'inFlight') {
            if (checkBackboardCollision(this.x, this.y, this.z, this.rimX, this.rimY)) {
                const reflected = reflectFromBackboard({ x: this.vx, y: this.vy, z: this.vz });
                this.vx = reflected.x;
                this.vy = reflected.y;
                this.vz = reflected.z;
            }
        }
        
        // Проверка границ корта
        this.checkBounds();
    }

    /**
     * Проверка выхода за границы
     */
    checkBounds() {
        const margin = 0.3; // Небольшой отступ за границу корта
        if (this.x < -margin || this.x > CONFIG.COURT.WIDTH + margin ||
            this.y < -margin || this.y > CONFIG.COURT.LENGTH + margin) {
            this.isOutOfBounds = true;
            console.log(`Ball out of bounds detected! Position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`);
        }
    }

    /**
     * Отрисовка мяча
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreen
     */
    render(ctx, worldToScreen) {
        const { sx, sy } = worldToScreen(this.x, this.y, this.z);
        
        // Тень
        const shadowPos = worldToScreen(this.x, this.y, 0);
        const shadowRadius = CONFIG.BALL.RADIUS * CONFIG.ISO.TILE_WIDTH * 0.5;
        const shadowOpacity = Math.max(0.1, 1 - this.z / 5);
        
        ctx.save();
        ctx.fillStyle = `rgba(14, 19, 32, ${shadowOpacity * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(shadowPos.sx, shadowPos.sy, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Мяч
        const ballRadius = CONFIG.BALL.RADIUS * CONFIG.ISO.TILE_WIDTH;
        
        ctx.save();
        
        // Градиент для объема
        const gradient = ctx.createRadialGradient(sx - ballRadius * 0.3, sy - ballRadius * 0.3, 0, sx, sy, ballRadius);
        gradient.addColorStop(0, '#FF9966');
        gradient.addColorStop(0.7, '#FF6633');
        gradient.addColorStop(1, '#CC4422');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Черные линии мяча
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, ballRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Проверка, забил ли мяч
     * @returns {boolean}
     */
    isScore() {
        return this.hasScored && this.z < this.rimZ;
    }

    /**
     * Получить дистанцию до кольца
     * @returns {number}
     */
    getDistanceToRim() {
        return distance(this.x, this.y, this.rimX, this.rimY);
    }

    /**
     * Сброс состояния
     * @param {number} x
     * @param {number} y
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.state = 'free';
        this.holderId = null;
        this.hasScored = false;
        this.isOutOfBounds = false;
    }
}



