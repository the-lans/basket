// @ts-check
'use strict';

import { CONFIG, GameSettings } from '../config.js';
import { GameLoop } from './Loop.js';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { Camera } from './Projection.js';

/**
 * Главный класс игры
 * Управляет canvas, loop, сценами, вводом, аудио
 */
export class Game {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D context');
        }
        
        // Managers
        this.sceneManager = new SceneManager();
        this.input = new InputManager();
        this.audio = new AudioManager();
        
        // Дефолтные настройки игры (будут переопределены из MenuScene)
        this.settings = new GameSettings();
        
        // Loop
        this.loop = new GameLoop(
            (dt) => this.update(dt),
            (alpha) => this.render(alpha)
        );
        
        // Настройка canvas
        this.setupCanvas();
        
        // Camera (инициализируем после установки размеров canvas в логических пикселях)
        this.camera = new Camera(CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
        
        // Инициализация
        this.input.init(canvas);
        this.audio.init();
        
        // Видимость страницы
        this.setupVisibilityHandling();
        
        // Resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Настройка размеров canvas с учетом DPR
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = CONFIG.CANVAS.WIDTH;
        const height = CONFIG.CANVAS.HEIGHT;
        
        // CSS размер
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        // Реальный размер с DPR
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        
        // Масштабировать контекст
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
        
        // Отключить сглаживание для пиксель-арта (опционально)
        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = true;
        }
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        this.setupCanvas();
        this.camera.resize(this.canvas.width, this.canvas.height);
    }

    /**
     * Настройка обработки видимости страницы
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.audio.suspend();
            } else {
                this.audio.resume();
            }
        });
    }

    /**
     * Обновление игры
     * @param {number} dt
     */
    update(dt) {
        // Обновить ввод
        this.input.update();
        
        // Обновить камеру
        this.camera.update(dt);
        
        // Обновить текущую сцену
        this.sceneManager.update(dt);
    }

    /**
     * Рендер игры
     * @param {number} alpha
     */
    render(alpha) {
        if (!this.ctx) return;
        
        // Очистить canvas
        this.ctx.fillStyle = CONFIG.CANVAS.BACKGROUND;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
        
        // Отрисовать текущую сцену
        this.sceneManager.render(this.ctx, alpha);
        
        // Debug info
        if (CONFIG.DEBUG.SHOW_FPS) {
            this.renderFPS();
        }
    }

    /**
     * Отрисовка FPS
     */
    renderFPS() {
        if (!this.ctx) return;
        
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`FPS: ${this.loop.getFPS()}`, CONFIG.CANVAS.WIDTH - 10, 20);
        this.ctx.restore();
    }

    /**
     * Запустить игру
     */
    start() {
        this.loop.start();
    }

    /**
     * Остановить игру
     */
    stop() {
        this.loop.stop();
    }

    /**
     * Получить размеры canvas (логические пиксели)
     * @returns {{width: number, height: number}}
     */
    getSize() {
        return {
            width: CONFIG.CANVAS.WIDTH,
            height: CONFIG.CANVAS.HEIGHT,
        };
    }
}



