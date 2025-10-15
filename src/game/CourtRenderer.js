// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { worldToScreen } from '../core/Projection.js';

/**
 * Рендер корта, трибун, кольца и пиктограмм
 */
export class CourtRenderer {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Создать оффскрин canvas для статических элементов
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = canvasWidth;
        this.offscreen.height = canvasHeight;
        this.offscreenCtx = this.offscreen.getContext('2d');
        
        this.needsRedraw = true;
    }

    /**
     * Отрисовать всю сцену корта
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    render(ctx, worldToScreenFn) {
        // Отрисовать статические элементы (оптимизация)
        if (this.needsRedraw && this.offscreenCtx) {
            this.renderStatic(this.offscreenCtx, worldToScreenFn);
            this.needsRedraw = false;
        }
        
        // Копировать оффскрин на основной canvas
        if (this.offscreen) {
            ctx.drawImage(this.offscreen, 0, 0);
        }
    }

    /**
     * Отрисовать статические элементы
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderStatic(ctx, worldToScreenFn) {
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Фон
        ctx.fillStyle = CONFIG.CANVAS.BACKGROUND;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Трибуны (задний план)
        this.renderTribunes(ctx, worldToScreenFn);
        
        // Корт
        this.renderCourt(ctx, worldToScreenFn);
        
        // Разметка
        this.renderCourtLines(ctx, worldToScreenFn);
        
        // Кольцо и щит
        this.renderRimAndBackboard(ctx, worldToScreenFn);
        
        // Борта с пиктограммами
        this.renderSideboards(ctx, worldToScreenFn);
    }

    /**
     * Отрисовать трибуны
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderTribunes(ctx, worldToScreenFn) {
        // Трибуны временно отключены для лучшей видимости корта
        // Можно включить позже с правильной изометрической отрисовкой
        return;
    }

    /**
     * Отрисовать поверхность корта
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderCourt(ctx, worldToScreenFn) {
        // Углы корта
        const corners = [
            worldToScreenFn(0, 0, 0),
            worldToScreenFn(CONFIG.COURT.WIDTH, 0, 0),
            worldToScreenFn(CONFIG.COURT.WIDTH, CONFIG.COURT.LENGTH, 0),
            worldToScreenFn(0, CONFIG.COURT.LENGTH, 0),
        ];
        
        ctx.save();
        
        // Градиент для баскетбольного паркета
        const gradient = ctx.createLinearGradient(
            corners[0].sx, corners[0].sy,
            corners[2].sx, corners[2].sy
        );
        gradient.addColorStop(0, CONFIG.COLORS.COURT_YELLOW);
        gradient.addColorStop(0.5, '#D68A3D');
        gradient.addColorStop(1, CONFIG.COLORS.COURT_YELLOW);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        ctx.lineTo(corners[1].sx, corners[1].sy);
        ctx.lineTo(corners[2].sx, corners[2].sy);
        ctx.lineTo(corners[3].sx, corners[3].sy);
        ctx.closePath();
        ctx.fill();
        
        // Тень/затемнение по краям
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Отрисовать разметку корта
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderCourtLines(ctx, worldToScreenFn) {
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.LINE_WHITE;
        ctx.lineWidth = 3;
        ctx.shadowColor = CONFIG.COLORS.ACCENT_NEON;
        ctx.shadowBlur = 4;
        
        // Боковые линии
        this.drawLine(ctx, worldToScreenFn, 0, 0, 0, CONFIG.COURT.LENGTH);
        this.drawLine(ctx, worldToScreenFn, CONFIG.COURT.WIDTH, 0, CONFIG.COURT.WIDTH, CONFIG.COURT.LENGTH);
        
        // Базовая линия (у кольца)
        this.drawLine(ctx, worldToScreenFn, 0, 0, CONFIG.COURT.WIDTH, 0);
        
        // Задняя линия (конец половины корта)
        this.drawLine(ctx, worldToScreenFn, 0, CONFIG.COURT.LENGTH, CONFIG.COURT.WIDTH, CONFIG.COURT.LENGTH);
        
        // Трехочковая дуга
        this.drawThreePointArc(ctx, worldToScreenFn);
        
        // Штрафная зона (ключ)
        this.drawKey(ctx, worldToScreenFn);
        
        // Линия штрафного броска
        const ftLeft = (CONFIG.COURT.WIDTH - CONFIG.COURT.KEY_WIDTH) / 2;
        const ftRight = ftLeft + CONFIG.COURT.KEY_WIDTH;
        const ftY = CONFIG.COURT.BACKBOARD_DISTANCE + CONFIG.COURT.FREE_THROW_DISTANCE;
        this.drawLine(ctx, worldToScreenFn, ftLeft, ftY, ftRight, ftY);
        
        // Полукруг под кольцом (ограниченная зона)
        this.drawRestrictedArc(ctx, worldToScreenFn);
        
        // Центральная точка штрафного броска
        const ftCenterX = CONFIG.COURT.WIDTH / 2;
        const ftCenterY = ftY;
        const ftPoint = worldToScreenFn(ftCenterX, ftCenterY, 0);
        ctx.fillStyle = CONFIG.COLORS.LINE_WHITE;
        ctx.beginPath();
        ctx.arc(ftPoint.sx, ftPoint.sy, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Нарисовать линию
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     */
    drawLine(ctx, worldToScreenFn, x1, y1, x2, y2) {
        const p1 = worldToScreenFn(x1, y1, 0);
        const p2 = worldToScreenFn(x2, y2, 0);
        
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
    }

    /**
     * Нарисовать трехочковую дугу
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    drawThreePointArc(ctx, worldToScreenFn) {
        const centerX = CONFIG.COURT.WIDTH / 2;
        const centerY = CONFIG.COURT.BACKBOARD_DISTANCE;
        const radius = CONFIG.COURT.THREE_POINT_RADIUS;
        
        ctx.beginPath();
        for (let angle = -80; angle <= 80; angle += 2) {
            const rad = angle * Math.PI / 180;
            const x = centerX + Math.cos(rad - Math.PI / 2) * radius;
            const y = centerY + Math.sin(rad - Math.PI / 2) * radius;
            
            const p = worldToScreenFn(x, y, 0);
            if (angle === -80) {
                ctx.moveTo(p.sx, p.sy);
            } else {
                ctx.lineTo(p.sx, p.sy);
            }
        }
        ctx.stroke();
    }

    /**
     * Нарисовать штрафную зону
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    drawKey(ctx, worldToScreenFn) {
        const keyLeft = (CONFIG.COURT.WIDTH - CONFIG.COURT.KEY_WIDTH) / 2;
        const keyRight = keyLeft + CONFIG.COURT.KEY_WIDTH;
        const keyTop = CONFIG.COURT.BACKBOARD_DISTANCE;
        const keyBottom = keyTop + CONFIG.COURT.KEY_LENGTH;
        
        // Прямоугольник ключа
        this.drawLine(ctx, worldToScreenFn, keyLeft, keyTop, keyLeft, keyBottom);
        this.drawLine(ctx, worldToScreenFn, keyRight, keyTop, keyRight, keyBottom);
        this.drawLine(ctx, worldToScreenFn, keyLeft, keyBottom, keyRight, keyBottom);
    }

    /**
     * Нарисовать полукруг ограниченной зоны под кольцом
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    drawRestrictedArc(ctx, worldToScreenFn) {
        const centerX = CONFIG.COURT.WIDTH / 2;
        const centerY = CONFIG.COURT.BACKBOARD_DISTANCE;
        const radius = 1.25; // Радиус ограниченной зоны 1.25м
        
        ctx.beginPath();
        for (let angle = -90; angle <= 90; angle += 5) {
            const rad = angle * Math.PI / 180;
            const x = centerX + Math.cos(rad) * radius;
            const y = centerY + Math.sin(rad) * radius;
            
            const p = worldToScreenFn(x, y, 0);
            if (angle === -90) {
                ctx.moveTo(p.sx, p.sy);
            } else {
                ctx.lineTo(p.sx, p.sy);
            }
        }
        ctx.stroke();
    }

    /**
     * Отрисовать кольцо и щит
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderRimAndBackboard(ctx, worldToScreenFn) {
        const rimX = CONFIG.COURT.WIDTH / 2;
        const rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
        const rimZ = CONFIG.COURT.RIM_HEIGHT;
        
        // Debug: вывести позицию корзины в консоль (только первый раз)
        if (!this._debugLogged) {
            const rimPos = worldToScreenFn(rimX, rimY, rimZ);
            console.log(`Rim position: world(${rimX}, ${rimY}, ${rimZ}) -> screen(${rimPos.sx}, ${rimPos.sy})`);
            this._debugLogged = true;
        }
        
        // Щит (увеличенный для видимости)
        const boardTop = worldToScreenFn(rimX, rimY, rimZ + CONFIG.COURT.BACKBOARD_HEIGHT);
        const boardBottom = worldToScreenFn(rimX, rimY, rimZ);
        const boardLeft = worldToScreenFn(rimX - CONFIG.COURT.BACKBOARD_WIDTH / 2, rimY, rimZ + CONFIG.COURT.BACKBOARD_HEIGHT / 2);
        const boardRight = worldToScreenFn(rimX + CONFIG.COURT.BACKBOARD_WIDTH / 2, rimY, rimZ + CONFIG.COURT.BACKBOARD_HEIGHT / 2);
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Более заметный щит
        ctx.strokeStyle = CONFIG.COLORS.ACCENT_NEON;
        ctx.lineWidth = 4;
        
        const boardWidth = Math.max(60, boardRight.sx - boardLeft.sx); // Минимум 60px
        const boardHeight = Math.max(40, boardBottom.sy - boardTop.sy); // Минимум 40px
        
        ctx.fillRect(boardLeft.sx, boardTop.sy, boardWidth, boardHeight);
        ctx.strokeRect(boardLeft.sx, boardTop.sy, boardWidth, boardHeight);
        ctx.restore();
        
        // Кольцо (увеличено для лучшей видимости)
        const rimPos = worldToScreenFn(rimX, rimY, rimZ);
        const rimRadius = CONFIG.COURT.RIM_RADIUS * CONFIG.ISO.TILE_WIDTH * 2; // x2 для видимости
        
        ctx.save();
        // Тень кольца для глубины
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(rimPos.sx, rimPos.sy + 2, rimRadius, rimRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Само кольцо
        ctx.strokeStyle = CONFIG.COLORS.RIM_ORANGE;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(rimPos.sx, rimPos.sy, rimRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Сетка (упрощенная)
        ctx.strokeStyle = CONFIG.COLORS.NET_WHITE;
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = rimPos.sx + Math.cos(angle) * rimRadius;
            const y1 = rimPos.sy + Math.sin(angle) * rimRadius;
            const x2 = rimPos.sx;
            const y2 = rimPos.sy + rimRadius * 1.5;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Отрисовать борта с пиктограммами
     * @param {CanvasRenderingContext2D} ctx
     * @param {Function} worldToScreenFn
     */
    renderSideboards(ctx, worldToScreenFn) {
        const icons = ['circle', 'triangle', 'square'];
        const iconSize = 20;
        const spacing = 60;
        
        ctx.save();
        
        // Левый борт
        for (let i = 0; i < 10; i++) {
            const y = i * spacing + spacing / 2;
            const pos = worldToScreenFn(-0.5, y % CONFIG.COURT.LENGTH, 0.5);
            const iconType = icons[i % icons.length];
            
            this.drawIcon(ctx, pos.sx, pos.sy, iconSize, iconType);
        }
        
        // Правый борт
        for (let i = 0; i < 10; i++) {
            const y = i * spacing + spacing / 2;
            const pos = worldToScreenFn(CONFIG.COURT.WIDTH + 0.5, y % CONFIG.COURT.LENGTH, 0.5);
            const iconType = icons[i % icons.length];
            
            this.drawIcon(ctx, pos.sx, pos.sy, iconSize, iconType);
        }
        
        ctx.restore();
    }

    /**
     * Нарисовать пиктограмму
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {string} type
     */
    drawIcon(ctx, x, y, size, type) {
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.ACCENT_NEON;
        ctx.fillStyle = 'rgba(124, 255, 234, 0.2)';
        ctx.lineWidth = 2;
        
        switch (type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x + size / 2, y + size / 2);
                ctx.lineTo(x - size / 2, y + size / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'square':
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                ctx.strokeRect(x - size / 2, y - size / 2, size, size);
                break;
        }
        
        ctx.restore();
    }

    /**
     * Пометить для перерисовки
     */
    invalidate() {
        this.needsRedraw = true;
    }
}

