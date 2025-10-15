// @ts-check
'use strict';

import { CONFIG } from '../config.js';

/**
 * Игровой цикл с фиксированным шагом физики и интерполяцией рендера
 */
export class GameLoop {
    /**
     * @param {Function} updateFn - Функция обновления логики (dt)
     * @param {Function} renderFn - Функция рендера (ctx, alpha)
     */
    constructor(updateFn, renderFn) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        
        this.isRunning = false;
        this.lastTime = 0;
        this.accumulator = 0;
        
        this.fixedDelta = CONFIG.PHYSICS.FIXED_TIMESTEP;
        this.maxAccumulator = CONFIG.PHYSICS.MAX_ACCUMULATOR;
        
        // FPS счетчик
        this.fps = 60;
        this.frameCount = 0;
        this.fpsTime = 0;
        
        this.boundLoop = this.loop.bind(this);
    }

    /**
     * Запустить цикл
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        
        requestAnimationFrame(this.boundLoop);
    }

    /**
     * Остановить цикл
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Основной цикл
     * @param {number} currentTime
     */
    loop(currentTime) {
        if (!this.isRunning) return;
        
        // Вычислить deltaTime
        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Ограничить deltaTime для предотвращения спирали смерти
        if (deltaTime > this.maxAccumulator) {
            deltaTime = this.maxAccumulator;
        }
        
        // Накопить время
        this.accumulator += deltaTime;
        
        // Обновление логики фиксированным шагом
        while (this.accumulator >= this.fixedDelta) {
            this.updateFn(this.fixedDelta);
            this.accumulator -= this.fixedDelta;
        }
        
        // Интерполяция для рендера
        const alpha = this.accumulator / this.fixedDelta;
        this.renderFn(alpha);
        
        // FPS счетчик
        this.updateFPS(deltaTime);
        
        // Следующий кадр
        requestAnimationFrame(this.boundLoop);
    }

    /**
     * Обновить счетчик FPS
     * @param {number} deltaTime
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        this.fpsTime += deltaTime;
        
        if (this.fpsTime >= 1.0) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTime = 0;
        }
    }

    /**
     * Получить текущий FPS
     * @returns {number}
     */
    getFPS() {
        return this.fps;
    }
}



