// @ts-check
'use strict';

/**
 * Менеджер аудио на Web Audio API
 * Поддержка разблокировки, управление громкостью, SFX и музыка
 */
export class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.context = null;
        
        /** @type {GainNode|null} */
        this.masterGain = null;
        
        /** @type {GainNode|null} */
        this.sfxGain = null;
        
        /** @type {GainNode|null} */
        this.musicGain = null;
        
        /** @type {Map<string, AudioBuffer>} */
        this.buffers = new Map();
        
        /** @type {Map<string, AudioBufferSourceNode>} */
        this.playing = new Map();
        
        this.unlocked = false;
        this.muted = false;
        
        /** @type {{key: string, volume: number}|null} */
        this.pendingMusic = null;
    }

    /**
     * Инициализация Audio Context
     */
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Создание узлов громкости
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            
            this.sfxGain = this.context.createGain();
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.context.createGain();
            this.musicGain.connect(this.masterGain);
            
            // Попытка разблокировки на первом взаимодействии
            this.setupUnlock();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Настройка разблокировки аудио при первом клике/тапе
     */
    setupUnlock() {
        const unlock = () => {
            if (this.unlocked || !this.context) return;
            
            // Воспроизвести тишину для разблокировки
            const buffer = this.context.createBuffer(1, 1, 22050);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.start(0);
            
            // Возобновить контекст если приостановлен
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
            
            this.unlocked = true;
            console.log('[AudioManager] Audio context unlocked');
            
            // Запустить отложенную музыку
            if (this.pendingMusic) {
                console.log('[AudioManager] Playing pending music:', this.pendingMusic.key);
                this.playMusic(this.pendingMusic.key, this.pendingMusic.volume);
                this.pendingMusic = null;
            }
            
            // Удалить слушатели
            document.removeEventListener('pointerdown', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };
        
        document.addEventListener('pointerdown', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);
    }

    /**
     * Загрузить аудио файл
     * @param {string} key
     * @param {string} url
     * @returns {Promise<void>}
     */
    async load(key, url) {
        if (!this.context) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(key, audioBuffer);
        } catch (e) {
            console.warn(`Failed to load audio: ${key}`, e);
        }
    }

    /**
     * Воспроизвести звуковой эффект
     * @param {string} key
     * @param {number} [volume=1.0]
     * @param {number} [rate=1.0]
     */
    playSFX(key, volume = 1.0, rate = 1.0) {
        if (!this.context || !this.unlocked || this.muted) return;
        
        const buffer = this.buffers.get(key);
        if (!buffer) {
            console.warn(`Audio not loaded: ${key}`);
            return;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        source.start(0);
    }

    /**
     * Воспроизвести музыку (с зацикливанием)
     * @param {string} key
     * @param {number} [volume=1.0]
     */
    playMusic(key, volume = 1.0) {
        if (!this.context) return;
        
        // Если еще не разблокирован, сохранить в очередь
        if (!this.unlocked) {
            console.log('[AudioManager] Audio not unlocked yet, queuing music:', key);
            this.pendingMusic = { key, volume };
            return;
        }
        
        if (this.muted) return;
        
        // Остановить текущую музыку
        this.stopMusic();
        
        const buffer = this.buffers.get(key);
        if (!buffer) {
            console.warn(`Audio not loaded: ${key}`);
            return;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        source.start(0);
        this.playing.set('__music__', source);
        console.log('[AudioManager] Playing music:', key, 'volume:', volume);
    }

    /**
     * Остановить музыку
     */
    stopMusic() {
        // Очистить очередь
        this.pendingMusic = null;
        
        const music = this.playing.get('__music__');
        if (music) {
            try {
                music.stop();
            } catch (e) {
                // Игнорируем ошибку если уже остановлено
            }
            this.playing.delete('__music__');
        }
    }

    /**
     * Установить громкость мастера
     * @param {number} value - [0, 1]
     */
    setMasterVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Установить громкость SFX
     * @param {number} value - [0, 1]
     */
    setSFXVolume(value) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Установить громкость музыки
     * @param {number} value - [0, 1]
     */
    setMusicVolume(value) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Включить/выключить звук
     * @param {boolean} mute
     */
    setMuted(mute) {
        this.muted = mute;
        if (this.masterGain) {
            this.masterGain.gain.value = mute ? 0 : 1;
        }
    }

    /**
     * Приостановить аудио контекст
     */
    suspend() {
        if (this.context && this.context.state === 'running') {
            this.context.suspend();
        }
    }

    /**
     * Возобновить аудио контекст
     */
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}



