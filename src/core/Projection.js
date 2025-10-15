// @ts-check
'use strict';

import { CONFIG } from '../config.js';

/**
 * Изометрическая проекция для игры
 * Преобразование между мировыми координатами (x, y, z) и экранными (sx, sy)
 */

/**
 * Преобразовать мировые координаты в экранные (изометрия)
 * @param {number} x - Мировая координата X (метры)
 * @param {number} y - Мировая координата Y (метры)
 * @param {number} z - Высота над землей (метры)
 * @returns {{sx: number, sy: number}}
 */
export function worldToScreen(x, y, z = 0) {
    const isoX = CONFIG.ISO.TILE_WIDTH / 2;
    const isoY = CONFIG.ISO.TILE_HEIGHT / 2;
    const scale = CONFIG.ISO.SCALE;
    
    const sx = (x - y) * isoX * scale;
    const sy = (x + y) * isoY * scale - z * isoY * scale * 2;
    
    return { sx, sy };
}

/**
 * Преобразовать экранные координаты в мировые (изометрия, z=0)
 * @param {number} sx - Экранная координата X
 * @param {number} sy - Экранная координата Y
 * @returns {{x: number, y: number}}
 */
export function screenToWorld(sx, sy) {
    const isoX = CONFIG.ISO.TILE_WIDTH / 2;
    const isoY = CONFIG.ISO.TILE_HEIGHT / 2;
    const scale = CONFIG.ISO.SCALE;
    
    const x = (sx / (isoX * scale) + sy / (isoY * scale)) / 2;
    const y = (sy / (isoY * scale) - sx / (isoX * scale)) / 2;
    
    return { x, y };
}

/**
 * Вычислить порядок отрисовки для изометрии (сортировка по Y, затем по Z)
 * @param {Array<{x: number, y: number, z?: number}>} entities
 * @returns {Array<{x: number, y: number, z?: number}>}
 */
export function sortIsometric(entities) {
    return entities.slice().sort((a, b) => {
        const ay = a.y + (a.z || 0) * 0.1;
        const by = b.y + (b.z || 0) * 0.1;
        return ay - by;
    });
}

/**
 * Получить смещение камеры для центрирования корта на экране
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{offsetX: number, offsetY: number}}
 */
export function getCameraOffset(canvasWidth, canvasHeight) {
    // Вычисляем bbox всего корта с учетом кольца
    const corners = [
        worldToScreen(0, 0, 0),
        worldToScreen(CONFIG.COURT.WIDTH, 0, 0),
        worldToScreen(CONFIG.COURT.WIDTH, CONFIG.COURT.LENGTH, 0),
        worldToScreen(0, CONFIG.COURT.LENGTH, 0),
    ];
    
    // Кольцо - самая высокая точка
    const rimX = CONFIG.COURT.WIDTH / 2;
    const rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
    const rimZ = CONFIG.COURT.RIM_HEIGHT;
    const rimPos = worldToScreen(rimX, rimY, rimZ);
    
    // Находим границы
    let minSX = Infinity, maxSX = -Infinity, minSY = Infinity, maxSY = -Infinity;
    for (const p of corners) {
        if (p.sx < minSX) minSX = p.sx;
        if (p.sx > maxSX) maxSX = p.sx;
        if (p.sy < minSY) minSY = p.sy;
        if (p.sy > maxSY) maxSY = p.sy;
    }
    
    // Учитываем кольцо
    if (rimPos.sy < minSY) minSY = rimPos.sy;
    
    // Визуальный центр bbox (с небольшим смещением влево для компенсации изометрии)
    const bboxCenterX = (minSX + maxSX) / 2;
    const bboxCenterY = (minSY + maxSY) / 2;
    
    // Добавляем небольшую коррекцию влево (компенсация визуального восприятия изометрии)
    const visualCorrectionX = -30; // пикселей влево
    
    // Центрируем на экране
    const offsetX = canvasWidth / 2 - bboxCenterX + visualCorrectionX;
    const offsetY = canvasHeight / 2 - bboxCenterY;

    return { offsetX, offsetY };
}

/**
 * Преобразовать мировые координаты в экранные с учетом камеры
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} cameraX
 * @param {number} cameraY
 * @returns {{sx: number, sy: number}}
 */
export function worldToScreenWithCamera(x, y, z, cameraX, cameraY) {
    const { sx, sy } = worldToScreen(x, y, z);
    return {
        sx: sx + cameraX,
        sy: sy + cameraY,
    };
}

/**
 * Класс для управления камерой
 */
export class Camera {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        const offset = getCameraOffset(canvasWidth, canvasHeight);
        this.x = offset.offsetX;
        this.y = offset.offsetY;
        
        this.targetX = this.x;
        this.targetY = this.y;
        this.smoothing = 0.1;
    }

    /**
     * Обновить размер canvas
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        const offset = getCameraOffset(width, height);
        this.x = offset.offsetX;
        this.y = offset.offsetY;
        this.targetX = this.x;
        this.targetY = this.y;
    }

    /**
     * Обновить положение камеры (сглаживание)
     * @param {number} dt
     */
    update(dt) {
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    /**
     * Преобразовать мировые координаты в экранные с учетом камеры
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{sx: number, sy: number}}
     */
    worldToScreen(x, y, z = 0) {
        const { sx, sy } = worldToScreen(x, y, z);
        return {
            sx: sx + this.x,
            sy: sy + this.y,
        };
    }

    /**
     * Преобразовать экранные координаты в мировые
     * @param {number} sx
     * @param {number} sy
     * @returns {{x: number, y: number}}
     */
    screenToWorld(sx, sy) {
        return screenToWorld(sx - this.x, sy - this.y);
    }
}

