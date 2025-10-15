// @ts-check
'use strict';

/**
 * Менеджер сцен игры
 * Управление переходами между сценами (Boot, Preload, Menu, Game, Pause, GameOver)
 */
export class SceneManager {
    constructor() {
        /** @type {Map<string, Scene>} */
        this.scenes = new Map();
        
        /** @type {Scene|null} */
        this.currentScene = null;
        
        /** @type {string|null} */
        this.currentSceneName = null;
        
        /** @type {Object|null} */
        this.pendingTransition = null;
    }

    /**
     * Зарегистрировать сцену
     * @param {string} name
     * @param {Scene} scene
     */
    register(name, scene) {
        this.scenes.set(name, scene);
        scene.name = name;
    }

    /**
     * Переключиться на другую сцену
     * @param {string} name
     * @param {Object} [payload]
     */
    switchTo(name, payload = {}) {
        const newScene = this.scenes.get(name);
        
        if (!newScene) {
            console.error(`Scene not found: ${name}`);
            return;
        }
        
        // Выход из текущей сцены
        if (this.currentScene) {
            this.currentScene.exit();
        }
        
        // Вход в новую сцену
        this.currentScene = newScene;
        this.currentSceneName = name;
        this.currentScene.enter(payload);
    }

    /**
     * Обновить текущую сцену
     * @param {number} dt
     */
    update(dt) {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }

    /**
     * Отрисовать текущую сцену
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} alpha
     */
    render(ctx, alpha) {
        if (this.currentScene) {
            this.currentScene.render(ctx, alpha);
        }
    }

    /**
     * Обработать событие ввода в текущей сцене
     * @param {Event} event
     */
    handleInput(event) {
        if (this.currentScene && this.currentScene.handleInput) {
            this.currentScene.handleInput(event);
        }
    }

    /**
     * Получить текущую сцену
     * @returns {Scene|null}
     */
    getCurrent() {
        return this.currentScene;
    }

    /**
     * Получить имя текущей сцены
     * @returns {string|null}
     */
    getCurrentName() {
        return this.currentSceneName;
    }
}

/**
 * Базовый класс сцены
 * @typedef {Object} Scene
 * @property {string} [name]
 * @property {Function} enter
 * @property {Function} exit
 * @property {Function} update
 * @property {Function} render
 * @property {Function} [handleInput]
 */



