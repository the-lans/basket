// @ts-check
'use strict';

/**
 * Boot Scene - первая сцена, быстрая инициализация
 */
export class BootScene {
    constructor(game) {
        this.game = game;
        this.name = 'boot';
    }

    enter() {
        console.log('[BootScene] Entering...');
        
        // Быстрая инициализация, затем переход к прелоадеру
        setTimeout(() => {
            this.game.sceneManager.switchTo('preload');
        }, 100);
    }

    exit() {
        console.log('[BootScene] Exiting...');
    }

    update(dt) {
        // Ничего не делаем
    }

    render(ctx, alpha) {
        // Показать логотип или пустой экран
        ctx.fillStyle = '#0E1320';
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }
}



