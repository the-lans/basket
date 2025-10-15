// @ts-check
'use strict';

import { CONFIG } from '../config.js';

/**
 * Preload Scene - загрузка ассетов
 */
export class PreloadScene {
    constructor(game) {
        this.game = game;
        this.name = 'preload';
        
        this.progress = 0;
        this.assetsToLoad = [];
        this.assetsLoaded = 0;
    }

    enter() {
        console.log('[PreloadScene] Entering...');
        
        // Показать загрузочный экран
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
        }
        
        // Подготовить список ассетов (пока заглушки)
        this.prepareAssets();
        
        // Начать загрузку
        this.loadAssets();
    }

    exit() {
        console.log('[PreloadScene] Exiting...');
        
        // Скрыть загрузочный экран
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
    }

    update(dt) {
        // Прогресс обновляется в loadAssets
    }

    render(ctx, alpha) {
        // Обновить прогресс-бар
        const progressEl = document.getElementById('loading-progress');
        if (progressEl) {
            progressEl.style.width = `${this.progress * 100}%`;
        }
    }

    prepareAssets() {
        // Аудио ассеты
        this.assetsToLoad = [
            // Фоновая музыка (толпа на баскетбольной игре)
            { type: 'audio', key: 'crowd', url: 'assets/audio/basketball_crowd_noise.wav' },
            
            // Музыка для меню (8-bit)
            { type: 'audio', key: 'menu-music', url: 'assets/audio/8-bit-game-loop-006-simple-mix-1-short-120-bpm.wav' },
            
            // Звуковые эффекты
            { type: 'audio', key: 'sneaker', url: 'assets/audio/loud-sneaker-shoe-squeak-step-sound-fx-nova-sound.wav' },
            { type: 'audio', key: 'ball', url: 'assets/audio/nova-hoops-full-thick-punchy-basketball-basket-ball-dribble-hooping-flanger-mono-3-nova-sound.wav' },
        ];
    }

    async loadAssets() {
        if (this.assetsToLoad.length === 0) {
            // Нет ассетов - сразу переходим
            this.progress = 1.0;
            await this.delay(500);
            this.game.sceneManager.switchTo('menu');
            return;
        }
        
        for (const asset of this.assetsToLoad) {
            try {
                if (asset.type === 'audio') {
                    await this.game.audio.load(asset.key, asset.url);
                }
                // Можно добавить загрузку изображений и т.д.
                
                this.assetsLoaded++;
                this.progress = this.assetsLoaded / this.assetsToLoad.length;
            } catch (e) {
                console.warn(`Failed to load asset: ${asset.key}`, e);
                this.assetsLoaded++;
                this.progress = this.assetsLoaded / this.assetsToLoad.length;
            }
        }
        
        // Загрузка завершена
        await this.delay(500);
        this.game.sceneManager.switchTo('menu');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}



