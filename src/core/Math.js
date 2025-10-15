// @ts-check
'use strict';

/**
 * Математические утилиты
 */

/**
 * Ограничить значение между min и max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Линейная интерполяция
 * @param {number} a
 * @param {number} b
 * @param {number} t - [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Расстояние между двумя точками (2D)
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Расстояние в 3D
 * @param {number} x1
 * @param {number} y1
 * @param {number} z1
 * @param {number} x2
 * @param {number} y2
 * @param {number} z2
 * @returns {number}
 */
export function distance3D(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Угол между двумя точками (радианы)
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function angleTo(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Нормализовать угол к диапазону [-PI, PI]
 * @param {number} angle
 * @returns {number}
 */
export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

/**
 * Преобразовать градусы в радианы
 * @param {number} degrees
 * @returns {number}
 */
export function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Преобразовать радианы в градусы
 * @param {number} radians
 * @returns {number}
 */
export function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Проверка пересечения двух AABB
 * @param {number} x1 - X первого AABB
 * @param {number} y1 - Y первого AABB
 * @param {number} w1 - Ширина первого AABB
 * @param {number} h1 - Высота первого AABB
 * @param {number} x2 - X второго AABB
 * @param {number} y2 - Y второго AABB
 * @param {number} w2 - Ширина второго AABB
 * @param {number} h2 - Высота второго AABB
 * @returns {boolean}
 */
export function aabbIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Проверка пересечения двух кругов
 * @param {number} x1
 * @param {number} y1
 * @param {number} r1
 * @param {number} x2
 * @param {number} y2
 * @param {number} r2
 * @returns {boolean}
 */
export function circleIntersect(x1, y1, r1, x2, y2, r2) {
    const dist = distance(x1, y1, x2, y2);
    return dist < r1 + r2;
}

/**
 * Проверка точки в круге
 * @param {number} px
 * @param {number} py
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @returns {boolean}
 */
export function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) <= radius;
}

/**
 * Проверка точки в прямоугольнике
 * @param {number} px
 * @param {number} py
 * @param {number} rx
 * @param {number} ry
 * @param {number} rw
 * @param {number} rh
 * @returns {boolean}
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Сглаживание (ease-out cubic)
 * @param {number} t - [0, 1]
 * @returns {number}
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Сглаживание (ease-in-out cubic)
 * @param {number} t - [0, 1]
 * @returns {number}
 */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Генератор случайных чисел с сидом (XOR Shift)
 */
export class Random {
    /**
     * @param {number} [seed]
     */
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Следующее случайное число [0, 1)
     * @returns {number}
     */
    next() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return ((x >>> 0) / 0xFFFFFFFF);
    }

    /**
     * Случайное целое число в диапазоне [min, max]
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Случайное число с плавающей точкой в диапазоне [min, max)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    float(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Случайный выбор из массива
     * @template T
     * @param {T[]} array
     * @returns {T}
     */
    choice(array) {
        return array[this.int(0, array.length - 1)];
    }

    /**
     * Случайное boolean значение
     * @param {number} [probability=0.5] - Вероятность true
     * @returns {boolean}
     */
    bool(probability = 0.5) {
        return this.next() < probability;
    }
}

/**
 * Глобальный генератор случайных чисел (по умолчанию Math.random)
 */
export const globalRandom = {
    /**
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    /**
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    float: (min, max) => Math.random() * (max - min) + min,
    
    /**
     * @template T
     * @param {T[]} array
     * @returns {T}
     */
    choice: (array) => array[Math.floor(Math.random() * array.length)],
    
    /**
     * @param {number} [probability=0.5]
     * @returns {boolean}
     */
    bool: (probability = 0.5) => Math.random() < probability,
};



