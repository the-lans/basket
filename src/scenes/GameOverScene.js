// @ts-check
'use strict';

/**
 * GameOver Scene - экран завершения игры
 */
export class GameOverScene {
    constructor(game) {
        this.game = game;
        this.name = 'gameover';
        
        this.winner = null;
        this.playerScore = 0;
        this.aiScore = 0;
        this.stats = {};
        
        this.menuElement = null;
    }

    enter(payload = {}) {
        console.log('[GameOverScene] Entering...');
        
        this.winner = payload.winner;
        this.playerScore = payload.playerScore;
        this.aiScore = payload.aiScore;
        this.stats = payload.stats || {};
        
        // Создать экран победы/поражения
        this.createMenu();
    }

    exit() {
        console.log('[GameOverScene] Exiting...');
        
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }
    }

    update(dt) {
        // Ничего не обновляем
    }

    render(ctx, alpha) {
        // UI создан через DOM
    }

    createMenu() {
        const overlay = document.getElementById('ui-overlay');
        if (!overlay) return;
        
        const isVictory = this.winner === 'player';
        const titleClass = isVictory ? 'victory' : 'defeat';
        const titleText = isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
        
        // Вычислить точность
        const playerAccuracy = this.stats.playerShots > 0 
            ? Math.round((this.stats.playerMakes / this.stats.playerShots) * 100) 
            : 0;
        
        const aiAccuracy = this.stats.aiShots > 0 
            ? Math.round((this.stats.aiMakes / this.stats.aiShots) * 100) 
            : 0;
        
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'gameover-screen glass-panel animate-slide-down';
        this.menuElement.innerHTML = `
            <h1 class="gameover-title ${titleClass}">${titleText}</h1>
            
            <div class="gameover-stats">
                <div class="stat-row">
                    <span class="stat-label">Финальный счет</span>
                    <span class="stat-value">${this.playerScore} — ${this.aiScore}</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Ваши попадания</span>
                    <span class="stat-value">${this.stats.playerMakes} / ${this.stats.playerShots}</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Ваша точность</span>
                    <span class="stat-value">${playerAccuracy}%</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Точность бота</span>
                    <span class="stat-value">${aiAccuracy}%</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Фолы</span>
                    <span class="stat-value">${this.stats.fouls}</span>
                </div>
            </div>
            
            <div class="menu-buttons">
                <button class="btn btn-primary" id="btn-replay">Играть еще</button>
                <button class="btn" id="btn-menu">Главное меню</button>
            </div>
        `;
        
        overlay.appendChild(this.menuElement);
        
        // Привязать события
        document.getElementById('btn-replay')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo('game');
        });
        
        document.getElementById('btn-menu')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo('menu');
        });
    }
}



