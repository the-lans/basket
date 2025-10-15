// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { circleIntersect, distance } from '../core/Math.js';

/**
 * Физические вычисления и коллизии
 */

/**
 * Проверка коллизии игрок-игрок (круги)
 * @param {Object} p1
 * @param {Object} p2
 * @returns {boolean}
 */
export function checkPlayerCollision(p1, p2) {
    return circleIntersect(
        p1.x, p1.y, CONFIG.PLAYER.RADIUS,
        p2.x, p2.y, CONFIG.PLAYER.RADIUS
    );
}

/**
 * Разрешение коллизии между двумя игроками (отталкивание)
 * @param {Object} p1
 * @param {Object} p2
 */
export function resolvePlayerCollision(p1, p2) {
    const dist = distance(p1.x, p1.y, p2.x, p2.y);
    const minDist = CONFIG.PLAYER.RADIUS * 2;
    
    if (dist < minDist && dist > 0) {
        // Вектор нормали
        const nx = (p2.x - p1.x) / dist;
        const ny = (p2.y - p1.y) / dist;
        
        // Величина перекрытия
        const overlap = minDist - dist;
        
        // Отталкивание (50/50)
        const pushX = nx * overlap * 0.5;
        const pushY = ny * overlap * 0.5;
        
        p1.x -= pushX;
        p1.y -= pushY;
        p2.x += pushX;
        p2.y += pushY;
    }
}

/**
 * Ограничить позицию внутри корта
 * @param {Object} entity
 */
export function clampToCourtBounds(entity) {
    const margin = CONFIG.PLAYER.RADIUS;
    const maxX = CONFIG.COURT.WIDTH - margin;
    const maxY = CONFIG.COURT.LENGTH - margin;
    
    if (entity.x < margin) entity.x = margin;
    if (entity.x > maxX) entity.x = maxX;
    if (entity.y < margin) entity.y = margin;
    if (entity.y > maxY) entity.y = maxY;
}

/**
 * Проверка попадания мяча в кольцо
 * @param {number} ballX
 * @param {number} ballY
 * @param {number} ballZ
 * @param {number} rimX
 * @param {number} rimY
 * @param {number} rimZ
 * @returns {boolean}
 */
export function checkRimCollision(ballX, ballY, ballZ, rimX, rimY, rimZ) {
    // Мяч должен быть на высоте кольца (с допуском)
    const heightDiff = Math.abs(ballZ - rimZ);
    if (heightDiff > CONFIG.BALL.RADIUS * 2) {
        return false;
    }
    
    // Мяч должен быть в радиусе кольца (с магнитным окном)
    const dist2D = distance(ballX, ballY, rimX, rimY);
    const threshold = CONFIG.COURT.RIM_RADIUS + CONFIG.BALL.MAGNETIC_WINDOW;
    
    return dist2D <= threshold;
}

/**
 * Проверка столкновения с щитом
 * @param {number} ballX
 * @param {number} ballY
 * @param {number} ballZ
 * @param {number} boardX
 * @param {number} boardY
 * @returns {boolean}
 */
export function checkBackboardCollision(ballX, ballY, ballZ, boardX, boardY) {
    const halfWidth = CONFIG.COURT.BACKBOARD_WIDTH / 2;
    const boardMinY = boardY - 0.1;
    const boardMaxY = boardY + 0.1;
    
    // Проверка по Y (глубина)
    if (ballY < boardMinY || ballY > boardMaxY) {
        return false;
    }
    
    // Проверка по X (ширина)
    if (Math.abs(ballX - boardX) > halfWidth) {
        return false;
    }
    
    // Проверка по Z (высота)
    const boardBottom = CONFIG.COURT.RIM_HEIGHT;
    const boardTop = boardBottom + CONFIG.COURT.BACKBOARD_HEIGHT;
    
    if (ballZ < boardBottom || ballZ > boardTop) {
        return false;
    }
    
    return true;
}

/**
 * Отражение вектора от вертикальной плоскости (щит)
 * @param {Object} velocity - {x, y, z}
 * @returns {Object}
 */
export function reflectFromBackboard(velocity) {
    return {
        x: velocity.x,
        y: -velocity.y * 0.6, // Отскок с потерей энергии
        z: velocity.z * 0.8,
    };
}

/**
 * Вычислить оптимальную силу броска для заданной дистанции
 * @param {number} distance - Расстояние до кольца (метры)
 * @returns {number} - Оптимальная начальная скорость
 */
export function calculateOptimalShotPower(distance) {
    return CONFIG.BALL.SHOT_BASE_SPEED + distance * CONFIG.BALL.SHOT_DISTANCE_FACTOR;
}

/**
 * Проверка, находится ли точка за трехочковой линией
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function isThreePoint(x, y) {
    // Кольцо находится в точке (courtWidth/2, 0)
    const rimX = CONFIG.COURT.WIDTH / 2;
    const rimY = CONFIG.COURT.BACKBOARD_DISTANCE;
    
    const dist = distance(x, y, rimX, rimY);
    return dist >= CONFIG.COURT.THREE_POINT_RADIUS;
}

/**
 * Проверка, находится ли точка в зоне штрафной
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function isInKey(x, y) {
    const keyLeft = (CONFIG.COURT.WIDTH - CONFIG.COURT.KEY_WIDTH) / 2;
    const keyRight = keyLeft + CONFIG.COURT.KEY_WIDTH;
    const keyTop = CONFIG.COURT.BACKBOARD_DISTANCE;
    const keyBottom = keyTop + CONFIG.COURT.KEY_LENGTH;
    
    return x >= keyLeft && x <= keyRight && y >= keyTop && y <= keyBottom;
}



