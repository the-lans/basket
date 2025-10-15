// @ts-check
'use strict';

/**
 * Конфигурация игры Баскет
 * Все параметры игры собраны в одном месте для удобной настройки
 */

export const CONFIG = {
    // Размеры canvas (логические пиксели)
    CANVAS: {
        WIDTH: 1280,
        HEIGHT: 720,
        BACKGROUND: '#0E1320',
    },

    // Изометрическая проекция
    ISO: {
        TILE_WIDTH: 64,  // Ширина изометрической плитки
        TILE_HEIGHT: 32, // Высота изометрической плитки
        SCALE: 1.0,      // Общий масштаб
    },

    // Размеры корта (в метрах, реальные размеры половины корта)
    COURT: {
        WIDTH: 15,          // Ширина корта в метрах
        LENGTH: 14,         // Длина половины корта в метрах
        THREE_POINT_RADIUS: 6.75, // Радиус трехочковой дуги
        FREE_THROW_DISTANCE: 4.6, // Расстояние до линии штрафной
        KEY_WIDTH: 4.9,     // Ширина штрафной зоны
        KEY_LENGTH: 5.8,    // Длина штрафной зоны
        RIM_RADIUS: 0.23,   // Радиус обода
        RIM_HEIGHT: 3.05,   // Высота обода над полом
        BACKBOARD_WIDTH: 1.8,
        BACKBOARD_HEIGHT: 1.05,
        BACKBOARD_DISTANCE: 1.2, // От задней линии до щита
    },

    // Игровые механики
    GAME: {
        WIN_SCORE: 11,               // Очки для победы
        SHOT_CLOCK_DEFAULT: 24,      // Шот-клок по умолчанию (секунды)
        SHOT_CLOCK_WARNING: 5,       // Предупреждение при оставшихся секундах
        SHOT_CLOCK_OPTIONS: [12, 24, Infinity], // Варианты шот-клока
        
        // Система очков
        SCORING_STREET: { INSIDE: 1, THREE_POINT: 2 },  // Стритбольная система
        SCORING_CLASSIC: { INSIDE: 2, THREE_POINT: 3 }, // Классическая система
        DEFAULT_SCORING: 'street',
        
        // Фолы
        FOUL_PROBABILITY: 0.35,      // Вероятность фола при контакте
        FOUL_FREE_THROW_POINTS: 1,   // Очки за штрафной
        
        // Таймеры и кулдауны
        STEAL_COOLDOWN: 0.7,         // Кулдаун перехвата (секунды)
        STEPBACK_COOLDOWN: 0.5,      // Кулдаун step-back
        STEPBACK_INVULN_TIME: 0.15,  // Время неуязвимости при step-back
    },

    // Параметры игрока
    PLAYER: {
        BASE_SPEED: 3.6,             // Базовая скорость (м/с)
        SPRINT_MULTIPLIER: 2.0,      // Множитель скорости при спринте (было 1.5, теперь 2.0 для заметности)
        ACCELERATION: 15.0,          // Ускорение
        FRICTION: 12.0,              // Трение
        
        STAMINA_MAX: 100,            // Максимальная выносливость
        STAMINA_SPRINT_DRAIN: 12,    // Расход выносливости при спринте (снижен с 15 до 12)
        STAMINA_REGEN: 12,           // Восстановление выносливости (увеличено с 10 до 12)
        STAMINA_MIN_FOR_SPRINT: 5,   // Минимум выносливости для спринта
        
        RADIUS: 0.35,                // Радиус коллизии (метры)
        HEIGHT: 1.85,                // Рост игрока (метры)
        
        // Влияние выносливости
        LOW_STAMINA_THRESHOLD: 30,
        LOW_STAMINA_SPEED_PENALTY: 0.8,
        LOW_STAMINA_ACCURACY_PENALTY: 0.85,
    },

    // Параметры мяча
    BALL: {
        RADIUS: 0.12,                // Радиус мяча (метры)
        GRAVITY: 9.81,               // Гравитация (м/с²)
        BOUNCE_FACTOR: 0.75,         // Коэффициент отскока
        FRICTION_GROUND: 0.95,       // Трение о землю
        FRICTION_AIR: 0.99,          // Сопротивление воздуха
        
        // Параметры броска
        MIN_SHOT_POWER: 0.2,         // Минимальная сила броска
        MAX_SHOT_POWER: 1.0,         // Максимальная сила броска
        POWER_CHARGE_RATE: 1.2,      // Скорость зарядки силы (в секунду)
        
        // "Магнитное" окно для попаданий (аркадность)
        MAGNETIC_WINDOW: 0.08,       // Допуск для попадания (метры)
        OPTIMAL_POWER_TOLERANCE: 0.08, // Допуск оптимальной силы (±8%)
        
        // Формула оптимальной силы: initialSpeed = BASE_SPEED + distance * DISTANCE_FACTOR
        SHOT_BASE_SPEED: 6.0,
        SHOT_DISTANCE_FACTOR: 0.5,
    },

    // Параметры AI
    AI: {
        // Уровни сложности
        DIFFICULTIES: {
            CASUAL: {
                REACTION_TIME: 0.5,
                SHOT_ACCURACY: 0.6,
                DEFENSE_DISTANCE: 1.5,
                STEAL_CHANCE: 0.15,
                DECISION_DELAY: 0.3,
            },
            STANDARD: {
                REACTION_TIME: 0.3,
                SHOT_ACCURACY: 0.75,
                DEFENSE_DISTANCE: 1.2,
                STEAL_CHANCE: 0.25,
                DECISION_DELAY: 0.2,
            },
            COMPETITIVE: {
                REACTION_TIME: 0.15,
                SHOT_ACCURACY: 0.85,
                DEFENSE_DISTANCE: 0.9,
                STEAL_CHANCE: 0.35,
                DECISION_DELAY: 0.1,
            },
        },
        DEFAULT_DIFFICULTY: 'STANDARD',
        
        // Параметры поведения
        DEFENSE_PRESS_DISTANCE: 2.0,  // Дистанция прессинга
        OFFENSE_DRIVE_DISTANCE: 4.0,  // Дистанция для прохода
        CONTEST_DISTANCE: 1.5,        // Дистанция для контеста
        SHOT_DECISION_TIME: 1.0,      // Время на решение о броске
        FORCE_SHOT_TIME: 5.0,         // Форсировать бросок при оставшихся секундах
    },

    // Физика и коллизии
    PHYSICS: {
        FIXED_TIMESTEP: 1 / 60,       // Фиксированный шаг физики (60 FPS)
        MAX_ACCUMULATOR: 1 / 15,      // Максимальный аккумулятор времени
        COLLISION_ITERATIONS: 2,      // Итерации разрешения коллизий
        PUSH_FORCE: 2.0,              // Сила отталкивания при коллизии
    },

    // Цветовая схема (стандартный баскетбол)
    COLORS: {
        COURT_YELLOW: '#C87533',  // Стандартный баскетбольный паркет (коричнево-оранжевый)
        TRIBUNE_RED: '#FF4D5A',
        TRIBUNE_BLUE: '#39B8FF',
        LINE_WHITE: '#FFFFFF',
        ACCENT_NEON: '#7CFFEA',
        TEXT_DARK: '#0E1320',
        
        // Дополнительные
        SHADOW: 'rgba(14, 19, 32, 0.3)',
        BOARD_GLASS: 'rgba(255, 255, 255, 0.15)',
        RIM_ORANGE: '#FF6600',
        NET_WHITE: 'rgba(255, 255, 255, 0.7)',
        
        // Команды
        TEAM_PLAYER: '#39B8FF',  // Голубые
        TEAM_AI: '#FF4D5A',      // Красные
    },

    // Аудио
    AUDIO: {
        MASTER_VOLUME: 0.7,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.7,
    },

    // Отладка
    DEBUG: {
        SHOW_FPS: false,
        SHOW_COLLIDERS: false,
        SHOW_AI_STATE: false,
        SHOW_COORDINATES: false,
    },

    // Локальное хранилище
    STORAGE: {
        KEY: 'basket_game',
        VERSION: 1,
    },
};

/**
 * Настройки, которые пользователь может изменить
 */
export class GameSettings {
    constructor() {
        this.difficulty = CONFIG.AI.DEFAULT_DIFFICULTY;
        this.shotClockDuration = CONFIG.GAME.SHOT_CLOCK_DEFAULT;
        this.scoringSystem = CONFIG.GAME.DEFAULT_SCORING;
        this.masterVolume = CONFIG.AUDIO.MASTER_VOLUME;
        this.musicVolume = CONFIG.AUDIO.MUSIC_VOLUME;
        this.sfxVolume = CONFIG.AUDIO.SFX_VOLUME;
    }

    /**
     * Загрузить настройки из localStorage
     */
    load() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE.KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.version === CONFIG.STORAGE.VERSION && parsed.settings) {
                    Object.assign(this, parsed.settings);
                }
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }

    /**
     * Сохранить настройки в localStorage
     */
    save() {
        try {
            const data = {
                version: CONFIG.STORAGE.VERSION,
                settings: {
                    difficulty: this.difficulty,
                    shotClockDuration: this.shotClockDuration,
                    scoringSystem: this.scoringSystem,
                    masterVolume: this.masterVolume,
                    musicVolume: this.musicVolume,
                    sfxVolume: this.sfxVolume,
                },
            };
            localStorage.setItem(CONFIG.STORAGE.KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    /**
     * Получить текущие параметры AI
     * @returns {Object}
     */
    getAIDifficulty() {
        return CONFIG.AI.DIFFICULTIES[this.difficulty] || CONFIG.AI.DIFFICULTIES.STANDARD;
    }

    /**
     * Получить текущую систему очков
     * @returns {Object}
     */
    getScoringSystem() {
        return this.scoringSystem === 'street' 
            ? CONFIG.GAME.SCORING_STREET 
            : CONFIG.GAME.SCORING_CLASSIC;
    }
}

