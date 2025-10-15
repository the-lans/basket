// @ts-check
'use strict';

/**
 * Точка входа в игру Баскет
 */

import { Game } from './core/Game.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

/**
 * Инициализация игры
 */
function init() {
    console.log('🏀 Initializing Basket Game...');
    
    // Получить canvas
    const canvas = document.getElementById('game');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Создать игру
    const game = new Game(canvas);
    
    // Зарегистрировать сцены
    game.sceneManager.register('boot', new BootScene(game));
    game.sceneManager.register('preload', new PreloadScene(game));
    game.sceneManager.register('menu', new MenuScene(game));
    game.sceneManager.register('game', new GameScene(game));
    game.sceneManager.register('pause', new PauseScene(game));
    game.sceneManager.register('gameover', new GameOverScene(game));
    
    // Начать с boot сцены
    game.sceneManager.switchTo('boot');
    
    // Запустить игровой цикл
    game.start();
    
    console.log('✅ Game initialized and running!');
    
    // Экспортировать в window для отладки
    if (typeof window !== 'undefined') {
        window.game = game;
    }
}

// Запустить когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}



