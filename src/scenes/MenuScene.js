// @ts-check
'use strict';

import { CONFIG, GameSettings } from '../config.js';

/**
 * Menu Scene - главное меню
 */
export class MenuScene {
    constructor(game) {
        this.game = game;
        this.name = 'menu';
        
        this.settings = new GameSettings();
        this.currentMenu = 'main'; // 'main', 'settings', 'controls'
        
        this.menuElement = null;
    }

    enter() {
        console.log('[MenuScene] Entering...');
        
        // Загрузить настройки
        this.settings.load();
        
        // Создать меню
        this.createMenu();
        
        // Запустить фоновую музыку меню (8-bit)
        this.game.audio.playMusic('menu-music', this.settings.musicVolume * 0.7);
    }

    exit() {
        console.log('[MenuScene] Exiting...');
        
        // Удалить меню
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }
        
        // Остановить музыку
        this.game.audio.stopMusic();
    }

    update(dt) {
        // Ничего не обновляем в меню
    }

    render(ctx, alpha) {
        // Отрисовать фон
        ctx.fillStyle = 'linear-gradient(135deg, #0E1320 0%, #1a2332 100%)';
        ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
        
        // Декоративные элементы (опционально)
        this.renderBackground(ctx);
    }

    renderBackground(ctx) {
        ctx.save();
        
        // Сетка
        ctx.strokeStyle = 'rgba(124, 255, 234, 0.1)';
        ctx.lineWidth = 1;
        
        const step = 50;
        for (let x = 0; x < CONFIG.CANVAS.WIDTH; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS.HEIGHT);
            ctx.stroke();
        }
        
        for (let y = 0; y < CONFIG.CANVAS.HEIGHT; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.CANVAS.WIDTH, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    createMenu() {
        const overlay = document.getElementById('ui-overlay');
        if (!overlay) return;
        
        // Создать меню
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'menu-screen glass-panel animate-slide-down';
        
        // Добавить в DOM СНАЧАЛА
        overlay.appendChild(this.menuElement);
        
        // Теперь создать содержимое и привязать обработчики
        if (this.currentMenu === 'main') {
            this.createMainMenu();
        } else if (this.currentMenu === 'settings') {
            this.createSettingsMenu();
        } else if (this.currentMenu === 'controls') {
            this.createControlsMenu();
        }
    }

    createMainMenu() {
        this.menuElement.innerHTML = `
            <h1 class="menu-title">БАСКЕТ</h1>
            <div class="menu-buttons">
                <button class="btn btn-primary" id="btn-play">Играть</button>
                <button class="btn" id="btn-settings">Настройки</button>
                <button class="btn" id="btn-controls">Управление</button>
            </div>
        `;
        
        // Привязать события
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.game.sceneManager.switchTo('game', { settings: this.settings });
        });
        
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.switchMenu('settings');
        });
        
        document.getElementById('btn-controls')?.addEventListener('click', () => {
            this.switchMenu('controls');
        });
    }

    createSettingsMenu() {
        const scoringOptions = this.settings.scoringSystem === 'street' 
            ? '<option value="street" selected>Стритбольная (1/2)</option><option value="classic">Классическая (2/3)</option>'
            : '<option value="street">Стритбольная (1/2)</option><option value="classic" selected>Классическая (2/3)</option>';
        
        this.menuElement.innerHTML = `
            <h2 class="settings-title">Настройки</h2>
            
            <div class="settings-group">
                <label class="settings-label">Сложность</label>
                <select class="settings-select" id="difficulty">
                    <option value="CASUAL" ${this.settings.difficulty === 'CASUAL' ? 'selected' : ''}>Легкая</option>
                    <option value="STANDARD" ${this.settings.difficulty === 'STANDARD' ? 'selected' : ''}>Средняя</option>
                    <option value="COMPETITIVE" ${this.settings.difficulty === 'COMPETITIVE' ? 'selected' : ''}>Сложная</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label class="settings-label">Шот-клок (сек)</label>
                <select class="settings-select" id="shotclock">
                    <option value="12" ${this.settings.shotClockDuration === 12 ? 'selected' : ''}>12</option>
                    <option value="24" ${this.settings.shotClockDuration === 24 ? 'selected' : ''}>24</option>
                    <option value="Infinity">∞ (без ограничений)</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label class="settings-label">Система очков</label>
                <select class="settings-select" id="scoring">
                    ${scoringOptions}
                </select>
            </div>
            
            <div class="settings-group">
                <label class="settings-label">
                    Громкость SFX
                    <span class="settings-value" id="sfx-value">${Math.round(this.settings.sfxVolume * 100)}%</span>
                </label>
                <input type="range" class="settings-range" id="sfx-volume" min="0" max="100" value="${this.settings.sfxVolume * 100}">
            </div>
            
            <div class="settings-group">
                <label class="settings-label">
                    Громкость музыки
                    <span class="settings-value" id="music-value">${Math.round(this.settings.musicVolume * 100)}%</span>
                </label>
                <input type="range" class="settings-range" id="music-volume" min="0" max="100" value="${this.settings.musicVolume * 100}">
            </div>
            
            <div class="menu-buttons">
                <button class="btn btn-primary" id="btn-save">Сохранить</button>
                <button class="btn" id="btn-back">Назад</button>
            </div>
        `;
        
        // События для слайдеров
        const sfxSlider = document.getElementById('sfx-volume');
        const musicSlider = document.getElementById('music-volume');
        
        sfxSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            document.getElementById('sfx-value').textContent = `${Math.round(value * 100)}%`;
        });
        
        musicSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            document.getElementById('music-value').textContent = `${Math.round(value * 100)}%`;
        });
        
        // Кнопки
        document.getElementById('btn-save')?.addEventListener('click', () => {
            this.saveSettings();
            this.switchMenu('main');
        });
        
        document.getElementById('btn-back')?.addEventListener('click', () => {
            this.switchMenu('main');
        });
    }

    createControlsMenu() {
        this.menuElement.innerHTML = `
            <h2 class="settings-title">Управление</h2>
            
            <div style="text-align: left; max-width: 500px; margin: 0 auto; padding: 20px;">
                <p style="margin-bottom: 16px;"><strong>WASD или стрелки</strong> — движение игрока</p>
                <p style="margin-bottom: 16px;"><strong>Shift</strong> — спринт (расходует выносливость)</p>
                <p style="margin-bottom: 16px;"><strong>ЛКМ (удерживать)</strong> — зарядка броска, отпустить для выполнения</p>
                <p style="margin-bottom: 16px;"><strong>ПКМ</strong> — в атаке: финт/step-back, в защите: попытка перехвата</p>
                <p style="margin-bottom: 16px;"><strong>Esc</strong> — пауза</p>
                
                <hr style="margin: 24px 0; border: none; border-top: 1px solid rgba(14, 19, 32, 0.2);">
                
                <p style="font-size: 14px; color: #666;">
                    <strong>Правила:</strong> Игра до 11 очков. После каждого попадания — check ball у дуги. 
                    При смене владения нужно вывести мяч за трехочковую линию.
                </p>
            </div>
            
            <div class="menu-buttons">
                <button class="btn btn-primary" id="btn-back">Назад</button>
            </div>
        `;
        
        document.getElementById('btn-back')?.addEventListener('click', () => {
            this.switchMenu('main');
        });
    }

    switchMenu(menuName) {
        this.currentMenu = menuName;
        
        if (this.menuElement) {
            this.menuElement.remove();
        }
        
        this.createMenu();
    }

    saveSettings() {
        // Получить значения
        const difficulty = document.getElementById('difficulty').value;
        const shotClock = document.getElementById('shotclock').value;
        const scoring = document.getElementById('scoring').value;
        const sfxVolume = parseInt(document.getElementById('sfx-volume').value) / 100;
        const musicVolume = parseInt(document.getElementById('music-volume').value) / 100;
        
        // Обновить настройки
        this.settings.difficulty = difficulty;
        this.settings.shotClockDuration = shotClock === 'Infinity' ? Infinity : parseInt(shotClock);
        this.settings.scoringSystem = scoring;
        this.settings.sfxVolume = sfxVolume;
        this.settings.musicVolume = musicVolume;
        
        // Сохранить
        this.settings.save();
        
        // Применить громкость
        this.game.audio.setSFXVolume(sfxVolume);
        this.game.audio.setMusicVolume(musicVolume);
        
        console.log('Settings saved:', this.settings);
    }
}

