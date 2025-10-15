// @ts-check
'use strict';

import { CONFIG } from '../config.js';

/**
 * HUD - отображение счета, шот-клока, индикаторов
 */
export class HUD {
    constructor() {
        this.showControls = true;
        this.controlsTimer = 10; // Показывать 10 секунд
    }

    /**
     * Обновить HUD
     * @param {number} dt
     */
    update(dt) {
        if (this.showControls) {
            this.controlsTimer -= dt;
            if (this.controlsTimer <= 0) {
                this.showControls = false;
            }
        }
    }

    /**
     * Отрисовать HUD
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} gameData - {rules, player, ai, ball}
     */
    render(ctx, gameData) {
        const { rules, player, ai } = gameData;
        
        // Счет
        this.renderScore(ctx, rules.playerScore, rules.aiScore);
        
        // Шот-клок
        if (rules.shotClockActive) {
            this.renderShotClock(ctx, rules.shotClock);
        }
        
        // Подсказки управления
        if (this.showControls) {
            this.renderControls(ctx);
        }
        
        // Индикатор зарядки броска и прицел
        if (player && player.shotCharging) {
            this.renderShotPowerIndicator(ctx, player);
            this.renderAimLine(ctx, player, gameData);
        }
        
        // Курсор мыши (если игрок с мячом)
        if (player && player.hasBall) {
            this.renderMouseCursor(ctx);
        }
        
        // Индикатор выносливости
        if (player) {
            this.renderStaminaBar(ctx, player);
        }
        
        // Индикатор автовозврата мяча
        if (gameData.outOfBoundsTimer !== null && gameData.outOfBoundsTimer !== undefined) {
            this.renderOutOfBoundsTimer(ctx, gameData.outOfBoundsTimer);
        }
    }

    /**
     * Отрисовать счет
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} playerScore
     * @param {number} aiScore
     */
    renderScore(ctx, playerScore, aiScore) {
        const x = CONFIG.CANVAS.WIDTH / 2;
        const y = 40;
        
        ctx.save();
        
        // Фон
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 120, y - 25, 240, 50);
        
        // Счет игрока (голубой)
        ctx.fillStyle = CONFIG.COLORS.TEAM_PLAYER;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(playerScore).padStart(2, '0'), x - 20, y);
        
        // Разделитель
        ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('—', x, y);
        
        // Счет AI (красный)
        ctx.fillStyle = CONFIG.COLORS.TEAM_AI;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(aiScore).padStart(2, '0'), x + 20, y);
        
        // Метки "ВЫ" и "БОТ"
        ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('ВЫ', x - 80, y);
        
        ctx.textAlign = 'left';
        ctx.fillText('БОТ', x + 80, y);
        
        ctx.restore();
    }

    /**
     * Отрисовать шот-клок
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} shotClock
     */
    renderShotClock(ctx, shotClock) {
        const x = CONFIG.CANVAS.WIDTH / 2;
        const y = 110;
        const time = Math.ceil(shotClock);
        
        ctx.save();
        
        // Фон
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        
        const width = 100;
        const height = 50;
        ctx.fillRect(x - width / 2, y - height / 2, width, height);
        
        // Рамка (красная если предупреждение)
        if (time <= CONFIG.GAME.SHOT_CLOCK_WARNING) {
            ctx.strokeStyle = CONFIG.COLORS.TEAM_AI;
            ctx.lineWidth = 3;
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
        }
        
        // Время
        ctx.fillStyle = time <= CONFIG.GAME.SHOT_CLOCK_WARNING ? CONFIG.COLORS.TEAM_AI : CONFIG.COLORS.TEXT_DARK;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(time), x, y);
        
        ctx.restore();
    }

    /**
     * Отрисовать подсказки управления
     * @param {CanvasRenderingContext2D} ctx
     */
    renderControls(ctx) {
        const x = CONFIG.CANVAS.WIDTH / 2;
        const y = CONFIG.CANVAS.HEIGHT - 60;
        
        ctx.save();
        
        // Фон (увеличен для 2 строк)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 360, y - 30, 720, 60);
        
        // Текст
        ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Компактные подсказки в 2 строки
        const line1 = 'У вас мяч! WASD — движение  |  Shift — спринт  |  ЛКМ (удерживать) — бросок';
        const line2 = 'ПКМ — финт/перехват  |  Esc — пауза';
        
        ctx.fillText(line1, x, y - 10);
        ctx.fillText(line2, x, y + 8);
        
        ctx.restore();
    }

    /**
     * Отрисовать индикатор силы броска
     * @param {CanvasRenderingContext2D} ctx
     * @param {Player} player
     */
    renderShotPowerIndicator(ctx, player) {
        // Получить позицию игрока на экране
        // Для упрощения - показываем в углу экрана
        const x = CONFIG.CANVAS.WIDTH - 100;
        const y = CONFIG.CANVAS.HEIGHT - 100;
        const radius = 40;
        
        ctx.save();
        
        // Фон круга
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Заполнение (зеленый -> желтый -> красный)
        const angle = player.shotPower * Math.PI * 2;
        let color = '#4CAF50'; // Зеленый
        
        if (player.shotPower > 0.7) {
            color = '#FF9800'; // Оранжевый
        } else if (player.shotPower > 0.9) {
            color = '#F44336'; // Красный
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + angle);
        ctx.stroke();
        
        // Текст
        ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(player.shotPower * 100) + '%', x, y);
        
        // Подсказка
        ctx.font = '12px sans-serif';
        ctx.fillText('Отпустите ЛКМ', x, y + 60);
        
        ctx.restore();
    }

    /**
     * Отрисовать линию прицеливания к кольцу
     * @param {CanvasRenderingContext2D} ctx
     * @param {Player} player
     * @param {Object} gameData
     */
    renderAimLine(ctx, player, gameData) {
        if (!gameData.ball) return;
        
        // Координаты игрока и кольца
        const playerX = player.x;
        const playerY = player.y;
        const rimX = CONFIG.COURT.WIDTH / 2;
        const rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
        
        // Преобразовать в экранные координаты (используем камеру из game)
        // Для упрощения нарисуем от центра экрана
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Рисуем пунктирную линию к кольцу
        // Примерная позиция кольца на экране
        const centerX = CONFIG.CANVAS.WIDTH / 2;
        const centerY = CONFIG.CANVAS.HEIGHT / 3;
        
        ctx.beginPath();
        ctx.moveTo(CONFIG.CANVAS.WIDTH / 2, CONFIG.CANVAS.HEIGHT / 2);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        
        // Целевой круг на кольце
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Отрисовать курсор мыши на canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    renderMouseCursor(ctx) {
        // Позиция мыши доступна через game.input.pointer
        // Для простоты просто покажем индикацию
        ctx.save();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Удерживайте ЛКМ для броска', CONFIG.CANVAS.WIDTH / 2, CONFIG.CANVAS.HEIGHT - 150);
        
        ctx.restore();
    }

    /**
     * Показать подсказки управления снова
     */
    showControlsAgain() {
        this.showControls = true;
        this.controlsTimer = 5;
    }

    /**
     * Отрисовать индикатор выносливости
     * @param {CanvasRenderingContext2D} ctx
     * @param {Player} player
     */
    renderStaminaBar(ctx, player) {
        const barWidth = 150;
        const barHeight = 10;
        const x = 20;
        const y = CONFIG.CANVAS.HEIGHT - 30;
        
        ctx.save();
        
        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Заполнение (цвет зависит от уровня)
        const staminaPercent = player.stamina / CONFIG.PLAYER.STAMINA_MAX;
        let barColor;
        
        if (staminaPercent > 0.5) {
            barColor = '#7CFFEA'; // Голубой (много стамины)
        } else if (staminaPercent > 0.2) {
            barColor = '#FFD700'; // Жёлтый (средне)
        } else {
            barColor = '#FF4444'; // Красный (мало)
        }
        
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth * staminaPercent, barHeight);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Текст "Выносливость" с индикацией спринта
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        const label = player.isSprinting ? '🏃 СПРИНТ' : 'Выносливость';
        ctx.fillText(label, x, y - 2);
        
        ctx.restore();
    }

    /**
     * Отрисовать таймер автовозврата мяча
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} timer
     */
    renderOutOfBoundsTimer(ctx, timer) {
        const x = CONFIG.CANVAS.WIDTH / 2;
        const y = CONFIG.CANVAS.HEIGHT / 2;
        
        ctx.save();
        
        // Полупрозрачный фон
        ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.fillRect(x - 150, y - 50, 300, 100);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 150, y - 50, 300, 100);
        
        // Текст "МЯЧ ЗА ПОЛЕМ"
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('МЯЧ ЗА ПОЛЕМ', x, y - 15);
        
        // Таймер
        ctx.font = 'bold 32px monospace';
        ctx.fillText(Math.ceil(timer).toString(), x, y + 20);
        
        ctx.restore();
    }
}

