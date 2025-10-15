// @ts-check
'use strict';

/**
 * Pause Scene - сцена паузы
 */
export class PauseScene {
    constructor(game) {
        this.game = game;
        this.name = 'pause';
        
        this.returnScene = 'game';
        this.menuElement = null;
    }

    enter(payload = {}) {
        console.log('[PauseScene] Entering...');
        
        this.returnScene = payload.returnScene || 'game';
        this.returnPayload = payload.returnPayload || {}; // Сохранить payload для возврата
        
        // Приостановить аудио
        this.game.audio.suspend();
        
        // Создать меню паузы
        this.createMenu();
    }

    exit() {
        console.log('[PauseScene] Exiting...');
        
        // Возобновить аудио
        this.game.audio.resume();
        
        // Удалить меню
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }
    }

    update(dt) {
        // Ничего не обновляем
    }

    render(ctx, alpha) {
        // Затемнение (оверлей сделан через CSS)
    }

    createMenu() {
        const overlay = document.getElementById('ui-overlay');
        if (!overlay) return;
        
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'menu-screen glass-panel animate-slide-down';
        this.menuElement.innerHTML = `
            <h1 class="menu-title">ПАУЗА</h1>
            <div class="menu-buttons">
                <button class="btn btn-primary" id="btn-resume">Продолжить</button>
                <button class="btn" id="btn-restart">Начать заново</button>
                <button class="btn" id="btn-menu">Главное меню</button>
            </div>
        `;
        
        overlay.appendChild(this.menuElement);
        
        // Привязать события
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo(this.returnScene, this.returnPayload);
        });
        
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo('game', this.returnPayload);
        });
        
        document.getElementById('btn-menu')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo('menu');
        });
        
        // ESC для возврата
        const handleResume = (e) => {
            if (e.code === 'Escape') {
                this.game.sceneManager.switchTo(this.returnScene, this.returnPayload);
                window.removeEventListener('keydown', handleResume);
            }
        };
        
        window.addEventListener('keydown', handleResume);
    }
}



