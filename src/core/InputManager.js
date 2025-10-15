// @ts-check
'use strict';

/**
 * Менеджер управления вводом (клавиатура + мышь)
 * Централизованная обработка всех событий ввода
 */
export class InputManager {
    constructor() {
        // Клавиатура
        /** @type {Set<string>} */
        this.keys = new Set();
        /** @type {Set<string>} */
        this.keysPressed = new Set();
        /** @type {Set<string>} */
        this.keysReleased = new Set();

        // Мышь/Pointer
        this.pointer = {
            x: 0,
            y: 0,
            isDown: false,
            justPressed: false,
            justReleased: false,
            rightDown: false,
            rightJustPressed: false,
            rightJustReleased: false,
        };

        // Привязки
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundContextMenu = this.handleContextMenu.bind(this);

        // Canvas для расчета координат
        /** @type {HTMLCanvasElement|null} */
        this.canvas = null;
    }

    /**
     * Инициализация с привязкой к canvas
     * @param {HTMLCanvasElement} canvas
     */
    init(canvas) {
        this.canvas = canvas;

        // Клавиатура
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        // Мышь
        canvas.addEventListener('pointerdown', this.boundPointerDown);
        canvas.addEventListener('pointerup', this.boundPointerUp);
        canvas.addEventListener('pointermove', this.boundPointerMove);
        canvas.addEventListener('contextmenu', this.boundContextMenu);

        // Предотвратить потерю фокуса и установить фокус
        canvas.tabIndex = 1;
        canvas.focus();
        
        // Установить курсор
        canvas.style.cursor = 'crosshair';
    }

    /**
     * Очистка слушателей
     */
    destroy() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.canvas) {
            this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
            this.canvas.removeEventListener('pointerup', this.boundPointerUp);
            this.canvas.removeEventListener('pointermove', this.boundPointerMove);
            this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
        }
    }

    /**
     * Обновление состояния (вызывать в начале каждого кадра)
     */
    update() {
        // Очистить "just pressed/released" состояния
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.pointer.justPressed = false;
        this.pointer.justReleased = false;
        this.pointer.rightJustPressed = false;
        this.pointer.rightJustReleased = false;
    }

    /**
     * Обработчик нажатия клавиши
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        const key = e.code;
        if (!this.keys.has(key)) {
            this.keys.add(key);
            this.keysPressed.add(key);
        }

        // Предотвратить стандартное поведение для игровых клавиш
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
        }
    }

    /**
     * Обработчик отпускания клавиши
     * @param {KeyboardEvent} e
     */
    handleKeyUp(e) {
        const key = e.code;
        this.keys.delete(key);
        this.keysReleased.add(key);
    }

    /**
     * Обработчик нажатия указателя
     * @param {PointerEvent} e
     */
    handlePointerDown(e) {
        this.updatePointerPosition(e);
        
        if (e.button === 0) { // ЛКМ
            this.pointer.isDown = true;
            this.pointer.justPressed = true;
        } else if (e.button === 2) { // ПКМ
            this.pointer.rightDown = true;
            this.pointer.rightJustPressed = true;
        }
    }

    /**
     * Обработчик отпускания указателя
     * @param {PointerEvent} e
     */
    handlePointerUp(e) {
        this.updatePointerPosition(e);
        
        if (e.button === 0) { // ЛКМ
            this.pointer.isDown = false;
            this.pointer.justReleased = true;
        } else if (e.button === 2) { // ПКМ
            this.pointer.rightDown = false;
            this.pointer.rightJustReleased = true;
        }
    }

    /**
     * Обработчик движения указателя
     * @param {PointerEvent} e
     */
    handlePointerMove(e) {
        this.updatePointerPosition(e);
    }

    /**
     * Обработчик контекстного меню (отключить ПКМ меню)
     * @param {Event} e
     */
    handleContextMenu(e) {
        e.preventDefault();
    }

    /**
     * Обновить позицию указателя с учетом масштабирования canvas
     * @param {PointerEvent} e
     */
    updatePointerPosition(e) {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.pointer.x = (e.clientX - rect.left) * scaleX;
        this.pointer.y = (e.clientY - rect.top) * scaleY;
    }

    // === API для проверки состояния ===

    /**
     * Клавиша удерживается
     * @param {string} keyCode
     * @returns {boolean}
     */
    isKeyDown(keyCode) {
        return this.keys.has(keyCode);
    }

    /**
     * Клавиша была нажата в этом кадре
     * @param {string} keyCode
     * @returns {boolean}
     */
    isKeyPressed(keyCode) {
        return this.keysPressed.has(keyCode);
    }

    /**
     * Клавиша была отпущена в этом кадре
     * @param {string} keyCode
     * @returns {boolean}
     */
    isKeyReleased(keyCode) {
        return this.keysReleased.has(keyCode);
    }

    /**
     * Проверка нажатия любой из клавиш
     * @param {string[]} keyCodes
     * @returns {boolean}
     */
    isAnyKeyDown(...keyCodes) {
        return keyCodes.some(key => this.keys.has(key));
    }

    /**
     * Проверка нажатия для движения вверх
     * @returns {boolean}
     */
    isUpPressed() {
        return this.isAnyKeyDown('KeyW', 'ArrowUp');
    }

    /**
     * Проверка нажатия для движения вниз
     * @returns {boolean}
     */
    isDownPressed() {
        return this.isAnyKeyDown('KeyS', 'ArrowDown');
    }

    /**
     * Проверка нажатия для движения влево
     * @returns {boolean}
     */
    isLeftPressed() {
        return this.isAnyKeyDown('KeyA', 'ArrowLeft');
    }

    /**
     * Проверка нажатия для движения вправо
     * @returns {boolean}
     */
    isRightPressed() {
        return this.isAnyKeyDown('KeyD', 'ArrowRight');
    }

    /**
     * Проверка нажатия спринта
     * @returns {boolean}
     */
    isSprintPressed() {
        return this.isAnyKeyDown('ShiftLeft', 'ShiftRight');
    }

    /**
     * Получить направление движения (нормализованное)
     * @returns {{x: number, y: number}}
     */
    getMovementDirection() {
        let x = 0;
        let y = 0;

        if (this.isLeftPressed()) x -= 1;
        if (this.isRightPressed()) x += 1;
        if (this.isUpPressed()) y -= 1;
        if (this.isDownPressed()) y += 1;

        // Нормализация диагонали
        if (x !== 0 && y !== 0) {
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }

        return { x, y };
    }
}

