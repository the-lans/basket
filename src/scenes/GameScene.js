// @ts-check
'use strict';

import { CONFIG } from '../config.js';
import { Player } from '../game/Player.js';
import { Ball } from '../game/Ball.js';
import { AIController } from '../game/AIController.js';
import { CourtRenderer } from '../game/CourtRenderer.js';
import { Rules } from '../game/Rules.js';
import { HUD } from '../game/HUD.js';
import { checkPlayerCollision, resolvePlayerCollision, clampToCourtBounds } from '../game/Physics.js';
import { distance } from '../core/Math.js';

/**
 * Game Scene - основная игровая сцена
 */
export class GameScene {
    constructor(game) {
        this.game = game;
        this.name = 'game';
        
        this.player = null;
        this.ai = null;
        this.ball = null;
        this.aiController = null;
        this.courtRenderer = null;
        this.rules = null;
        this.hud = null;
        
        this.settings = null;
    }

    enter(payload = {}) {
        console.log('[GameScene] Entering...');
        console.log('[GameScene] Payload:', payload);
        console.log('[GameScene] game.settings:', this.game.settings);
        
        // Получить настройки или использовать дефолтные
        this.settings = payload.settings || this.game.settings;
        
        // Создать сущности
        this.createEntities();
        
        // Создать рендерер корта
        this.courtRenderer = new CourtRenderer(CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
        
        // Создать правила
        this.rules = new Rules(this.settings);
        
        // Создать HUD
        this.hud = new HUD();
        
        // Начальная расстановка
        this.setupInitialPositions();
        
        // Таймер автовозврата мяча
        this.outOfBoundsTimer = null;
        
        // Таймеры для звуков
        this.sneakerSoundTimer = 0; // Периодический звук шагов
        
        // Обработка паузы
        this.handlePause = this.handlePause.bind(this);
        window.addEventListener('keydown', this.handlePause);
        
        // Запустить фоновую музыку толпы в игре (тише чем в меню)
        this.game.audio.playMusic('crowd', this.settings.musicVolume * 0.2);
    }

    exit() {
        console.log('[GameScene] Exiting...');
        
        // Удалить обработчик паузы
        window.removeEventListener('keydown', this.handlePause);
    }

    update(dt) {
        // Проверка победы
        if (this.rules.getGameState() === 'gameOver') {
            const winner = this.rules.getWinner();
            this.game.sceneManager.switchTo('gameover', { 
                winner, 
                playerScore: this.rules.playerScore,
                aiScore: this.rules.aiScore,
                stats: this.rules.stats,
            });
            return;
        }
        
        // Сохранить предыдущее состояние для отслеживания изменений
        const prevState = this.rules.getGameState();
        const prevPossession = this.rules.getPossession();
        
        // Обновить правила
        this.rules.update(dt);
        
        // Отследить изменение состояния на checkBall (например, после нарушения шот-клока)
        if (prevState === 'liveBall' && this.rules.getGameState() === 'checkBall') {
            // Произошло нарушение шот-клока или другое событие
            // Сбросить позиции и передать мяч новому владельцу
            this.setupInitialPositions();
        }
        
        // Обработка состояний игры
        if (this.rules.getGameState() === 'checkBall') {
            this.handleCheckBall(dt);
        } else if (this.rules.getGameState() === 'liveBall') {
            this.handleLiveBall(dt);
        }
        
        // Обновить HUD
        this.hud.update(dt);
    }

    render(ctx, alpha) {
        // Отрисовать корт
        this.courtRenderer.render(ctx, (x, y, z) => this.game.camera.worldToScreen(x, y, z));
        
        // Отрисовать мяч
        this.ball.render(ctx, (x, y, z) => this.game.camera.worldToScreen(x, y, z));
        
        // Отрисовать игроков (сортировка по Y)
        const entities = [this.player, this.ai].sort((a, b) => a.y - b.y);
        
        for (const entity of entities) {
            entity.render(ctx, (x, y, z) => this.game.camera.worldToScreen(x, y, z));
        }
        
        // Отрисовать HUD
        this.hud.render(ctx, {
            rules: this.rules,
            player: this.player,
            ai: this.ai,
            ball: this.ball,
            outOfBoundsTimer: this.outOfBoundsTimer,
        });
    }

    createEntities() {
        // Создать игрока
        this.player = new Player('player', 'player', CONFIG.COURT.WIDTH / 2, CONFIG.COURT.LENGTH * 0.7);
        
        // Создать AI
        this.ai = new Player('ai', 'ai', CONFIG.COURT.WIDTH / 2, CONFIG.COURT.LENGTH * 0.3);
        
        // Создать AI контроллер
        this.aiController = new AIController(this.ai, this.settings.difficulty);
        
        // Создать мяч
        this.ball = new Ball();
    }

    setupInitialPositions() {
        // Расставить игроков на check ball позициях
        const checkX = CONFIG.COURT.WIDTH / 2;
        const checkY = CONFIG.COURT.FREE_THROW_DISTANCE + CONFIG.COURT.BACKBOARD_DISTANCE;
        
        // Сбросить владение мячом
        this.player.hasBall = false;
        this.ai.hasBall = false;
        
        // Позиционировать игроков в зависимости от владения
        const currentPossession = this.rules.getPossession();
        
        if (currentPossession === 'player') {
            this.player.x = checkX;
            this.player.y = checkY + 2;
            this.ai.x = checkX;
            this.ai.y = checkY - 2;
            
            // Мяч у игрока
            this.player.hasBall = true;
            const ballPos = this.player.getBallPosition();
            this.ball.attachTo('player', ballPos.x, ballPos.y);
        } else {
            // Владение у AI
            this.ai.x = checkX;
            this.ai.y = checkY + 2;
            this.player.x = checkX;
            this.player.y = checkY - 2;
            
            // Мяч у AI
            this.ai.hasBall = true;
            const ballPos = this.ai.getBallPosition();
            this.ball.attachTo('ai', ballPos.x, ballPos.y);
        }
    }

    handleCheckBall(dt) {
        // Игрок ВСЕГДА может двигаться, даже если владение у AI
        this.handlePlayerInput(dt);
        
        // Обновить AI для позиционирования
        if (this.rules.getPossession() === 'ai') {
            this.aiController.update(dt, {
                ball: this.ball,
                opponent: this.player,
                shotClock: this.rules.shotClock,
                audio: this.game.audio,
            });
        } else {
            // AI защищается в checkBall когда владение у игрока
            const defenseX = CONFIG.COURT.WIDTH / 2;
            const defenseY = CONFIG.COURT.BACKBOARD_DISTANCE + 3.0;
            const dist = distance(this.ai.x, this.ai.y, defenseX, defenseY);
            if (dist > 0.5) {
                const angle = Math.atan2(defenseY - this.ai.y, defenseX - this.ai.x);
                this.ai.applyMovement(Math.cos(angle), Math.sin(angle));
            }
        }
        
        // Обновить игроков
        this.player.update(dt);
        this.ai.update(dt);
        
        // Ограничить позиции
        clampToCourtBounds(this.player);
        clampToCourtBounds(this.ai);
        
        // Ждем, пока игрок с мячом не начнет движение
        if (this.rules.getPossession() === 'player' && this.player.hasBall) {
            // Если игрок двинулся - начать живую игру
            const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
            if (speed > 0.5) {
                this.rules.startLiveBall();
            }
        } else if (this.rules.getPossession() === 'ai' && this.ai.hasBall) {
            // AI автоматически начинает через короткую задержку
            if (this.checkBallTimer === undefined) {
                this.checkBallTimer = 1.0; // 1 секунда задержки
            }
            this.checkBallTimer -= dt;
            if (this.checkBallTimer <= 0) {
                this.rules.startLiveBall();
                this.checkBallTimer = undefined;
            }
        }
        
        // Обновить позицию мяча
        this.updateBallPosition();
        
        // Обновить анимацию мяча (для дриблинга)
        this.ball.update(dt, this.game.audio);
        
        // ВАЖНО: Подбор мяча должен работать и в checkBall!
        // Если мяч упал на землю, игрок должен иметь возможность его подобрать
        if (this.ball.state === 'free') {
            this.handleBallPickup();
        }
    }

    handleLiveBall(dt) {
        // Обработка ввода игрока
        this.handlePlayerInput(dt);
        
        // Обновить AI
        this.aiController.update(dt, {
            ball: this.ball,
            opponent: this.player,
            shotClock: this.rules.shotClock,
            audio: this.game.audio,
        });
        
        // Обновить игроков
        this.player.update(dt);
        this.ai.update(dt);
        
        // Коллизия игрок-игрок
        if (checkPlayerCollision(this.player, this.ai)) {
            resolvePlayerCollision(this.player, this.ai);
        }
        
        // Ограничить позиции
        clampToCourtBounds(this.player);
        clampToCourtBounds(this.ai);
        
        // Обновить мяч
        this.updateBallPosition();
        this.ball.update(dt, this.game.audio);
        
        // Проверка выхода за пределы - автовозврат через 3 секунды
        if (this.ball.isOutOfBounds) {
            if (this.outOfBoundsTimer === null) {
                // Запустить таймер на 3 секунды
                this.outOfBoundsTimer = 3.0;
                console.log('⚠️ Ball out of bounds! Auto-return in 3 seconds...');
            } else {
                // Обновить таймер
                this.outOfBoundsTimer -= dt;
                
                if (this.outOfBoundsTimer <= 0) {
                    console.log('⏰ 3 seconds passed - returning ball!');
                    
                    // По правилам - владение переходит к защите
                    // Определяем кто последний владел мячом
                    let lastPossession = this.ball.holderId;
                    if (!lastPossession) {
                        // Если никто не держал - смотрим на текущее владение
                        lastPossession = this.rules.getPossession();
                    }
                    
                    // Передаем владение противнику
                    const newPossession = lastPossession === 'player' ? 'ai' : 'player';
                    this.rules.changePossession(newPossession);
                    
                    // Сброс позиций
                    this.player.hasBall = false;
                    this.ai.hasBall = false;
                    this.setupInitialPositions();
                    
                    // Сброс таймера
                    this.outOfBoundsTimer = null;
                    
                    return;
                }
            }
        } else {
            // Мяч вернулся в поле - сбросить таймер
            if (this.outOfBoundsTimer !== null) {
                console.log('✅ Ball returned to court - timer cancelled');
                this.outOfBoundsTimer = null;
            }
        }
        
        // Проверка попадания
        if (this.ball.isScore()) {
            const shooter = this.ball.holderId || (this.player.hasBall ? 'player' : 'ai');
            const shooterEntity = shooter === 'player' ? this.player : this.ai;
            
            console.log(`SCORE! Shooter: ${shooter}, Ball.holderId: ${this.ball.holderId}, Player.hasBall: ${this.player.hasBall}, AI.hasBall: ${this.ai.hasBall}`);
            
            // Звук попадания (тот же звук мяча, но выше тон)
            this.game.audio.playSFX('ball', 0.8, 1.3);
            
            this.rules.scorePoints(shooter, shooterEntity.x, shooterEntity.y);
            
            // Сброс - ВАЖНО: сначала сбросить флаги у игроков
            this.player.hasBall = false;
            this.ai.hasBall = false;
            
            // Сбросить таймер автовозврата
            this.outOfBoundsTimer = null;
            
            // Затем расставить заново
            this.setupInitialPositions();
            
            // Игра должна быть в состоянии checkBall после гола
            return;
        }
        
        // Подбор мяча
        if (this.ball.state === 'free') {
            this.handleBallPickup();
        }
    }

    handlePlayerInput(dt) {
        const input = this.game.input;
        
        // Движение
        const dir = input.getMovementDirection();
        if (dir.x !== 0 || dir.y !== 0) {
            this.player.applyMovement(dir.x, dir.y);
            
            // Периодический звук шагов при движении (каждые 1.2 сек, тише)
            this.sneakerSoundTimer -= dt;
            if (this.sneakerSoundTimer <= 0) {
                this.game.audio.playSFX('sneaker', 0.08, 0.9 + Math.random() * 0.2); // Тише и реже
                this.sneakerSoundTimer = 1.2;
            }
        } else {
            // Сбросить таймер когда не двигаемся
            this.sneakerSoundTimer = 0;
        }
        
        // Спринт
        const wasSpinting = this.player.isSprinting;
        this.player.isSprinting = input.isSprintPressed() && this.player.stamina > CONFIG.PLAYER.STAMINA_MIN_FOR_SPRINT;
        
        // Лог при начале/окончании спринта
        if (!wasSpinting && this.player.isSprinting) {
            console.log('🏃 Sprint START! Stamina:', this.player.stamina.toFixed(1));
        } else if (wasSpinting && !this.player.isSprinting) {
            console.log('🛑 Sprint STOP! Stamina:', this.player.stamina.toFixed(1));
        }
        
        // Бросок (ЛКМ)
        if (this.player.hasBall) {
            if (input.pointer.isDown && !this.player.shotCharging) {
                // Начать зарядку
                const angleToRim = Math.atan2(
                    this.ball.rimY - this.player.y,
                    this.ball.rimX - this.player.x
                );
                this.player.startShot(angleToRim);
            }
            
            if (this.player.shotCharging) {
                if (input.pointer.isDown) {
                    // Зарядить
                    this.player.chargeShot(dt);
                } else {
                    // Отпущено - выполнить бросок
                    const shotData = this.player.executeShot();
                    if (shotData) {
                        this.rules.registerShotAttempt('player');
                        this.ball.release(shotData.vx, shotData.vy, shotData.vz);
                        
                        // Звук броска мяча
                        this.game.audio.playSFX('ball', 0.6, 1.0);
                    }
                }
            }
        }
        
        // ПКМ (финт или перехват)
        if (input.pointer.rightJustPressed) {
            console.log('Right click detected! Player has ball:', this.player.hasBall);
            
            if (this.player.hasBall) {
                // Финт/step-back
                const success = this.player.performStepBack();
                console.log('Step-back attempt:', success ? 'SUCCESS' : 'COOLDOWN');
                
                if (success) {
                    // Звук кроссовок при step-back
                    this.game.audio.playSFX('sneaker', 0.4, 1.2);
                }
            } else {
                // Попытка перехвата
                console.log('Steal attempt! Distance:', Math.sqrt(
                    Math.pow(this.player.x - this.ai.x, 2) + 
                    Math.pow(this.player.y - this.ai.y, 2)
                ).toFixed(2));
                
                if (this.player.attemptSteal(this.ai)) {
                    // Успешный перехват
                    this.ai.hasBall = false;
                    this.player.hasBall = true;
                    this.ball.state = 'held';
                    this.ball.holderId = 'player';
                    
                    console.log('🏀 Steal successful!');
                    
                    // Звук мяча при перехвате
                    this.game.audio.playSFX('ball', 0.5, 0.8);
                } else {
                    console.log('Steal failed (too far or on cooldown or bad luck)');
                }
            }
        }
    }

    updateBallPosition() {
        // Если мяч у игрока - обновить только X,Y позицию (Z управляется анимацией)
        if (this.player.hasBall && this.ball.state === 'held') {
            const pos = this.player.getBallPosition();
            this.ball.x = pos.x;
            this.ball.y = pos.y;
            // Z обновляется в Ball.update() для анимации дриблинга
        } else if (this.ai.hasBall && this.ball.state === 'held') {
            const pos = this.ai.getBallPosition();
            this.ball.x = pos.x;
            this.ball.y = pos.y;
            // Z обновляется в Ball.update() для анимации дриблинга
        } else if (this.player.hasBall && this.ball.state !== 'held') {
            // Если игрок взял мяч, но состояние не установлено
            const pos = this.player.getBallPosition();
            this.ball.attachTo('player', pos.x, pos.y);
        } else if (this.ai.hasBall && this.ball.state !== 'held') {
            // Если AI взял мяч, но состояние не установлено
            const pos = this.ai.getBallPosition();
            this.ball.attachTo('ai', pos.x, pos.y);
        }
    }

    handleBallPickup() {
        // Увеличенный радиус подбора для лучшего UX
        const pickupRadius = CONFIG.PLAYER.RADIUS * 3;
        
        // Проверка подбора игроком
        const distToPlayer = distance(this.ball.x, this.ball.y, this.player.x, this.player.y);
        if (distToPlayer < pickupRadius) {
            this.player.hasBall = true;
            this.ai.hasBall = false; // Убедиться что у AI нет мяча
            this.ball.state = 'held';
            this.ball.holderId = 'player';
            this.ball.isOutOfBounds = false; // Сбросить флаг out of bounds
            console.log('Player picked up ball');
            
            // Звук подбора мяча
            this.game.audio.playSFX('ball', 0.3, 0.9);
            
            // Если владение было не у игрока - переключить
            if (this.rules.getPossession() !== 'player') {
                console.log('Possession changed to player on pickup');
                this.rules.changePossession('player');
            }
            
            // Проверка, нужна ли очистка мяча
            if (!this.rules.needsClearBall(this.ball.x, this.ball.y)) {
                console.log('Clear ball needed!');
            }
        }
        
        // Проверка подбора AI
        const distToAI = distance(this.ball.x, this.ball.y, this.ai.x, this.ai.y);
        if (distToAI < pickupRadius) {
            this.ai.hasBall = true;
            this.player.hasBall = false; // Убедиться что у игрока нет мяча
            this.ball.state = 'held';
            this.ball.holderId = 'ai';
            this.ball.isOutOfBounds = false; // Сбросить флаг out of bounds
            console.log('AI picked up ball');
            
            // Если владение было не у AI - переключить
            if (this.rules.getPossession() !== 'ai') {
                console.log('Possession changed to AI on pickup');
                this.rules.changePossession('ai');
            }
        }
    }

    handlePause(e) {
        if (e.code === 'Escape') {
            this.game.sceneManager.switchTo('pause', { 
                returnScene: 'game',
                returnPayload: { settings: this.settings }
            });
        }
        
        // Экстренный сброс мяча (клавиша R) - БЕЗ смены владения!
        if (e.code === 'KeyR') {
            console.log('=== MANUAL RESET (R) ===');
            console.log('Player hasBall:', this.player.hasBall);
            console.log('AI hasBall:', this.ai.hasBall);
            console.log('Ball holderId:', this.ball.holderId);
            console.log('Ball state:', this.ball.state);
            console.log('Rules possession:', this.rules.getPossession());
            
            // Определяем кто последний владел мячом
            let lastPossession;
            if (this.player.hasBall) {
                lastPossession = 'player';
                console.log('→ Last possession: player (has ball now)');
            } else if (this.ai.hasBall) {
                lastPossession = 'ai';
                console.log('→ Last possession: ai (has ball now)');
            } else if (this.ball.holderId) {
                lastPossession = this.ball.holderId;
                console.log('→ Last possession:', lastPossession, '(via ball.holderId)');
            } else if (this.ball.state === 'held') {
                // Мяч в состоянии "held" но неизвестно у кого? Смотрим расстояние
                const distToPlayer = Math.sqrt(
                    Math.pow(this.ball.x - this.player.x, 2) + 
                    Math.pow(this.ball.y - this.player.y, 2)
                );
                const distToAI = Math.sqrt(
                    Math.pow(this.ball.x - this.ai.x, 2) + 
                    Math.pow(this.ball.y - this.ai.y, 2)
                );
                lastPossession = distToPlayer < distToAI ? 'player' : 'ai';
                console.log(`→ Last possession: ${lastPossession} (via distance)`);
            } else {
                // Если вообще неизвестно - используем rules
                lastPossession = this.rules.getPossession();
                console.log('→ Last possession:', lastPossession, '(via rules)');
            }
            
            // R МЕНЯЕТ владение на противоположное!
            const newPossession = lastPossession === 'player' ? 'ai' : 'player';
            console.log(`✅ R pressed: ${lastPossession} → ${newPossession} (switched)`);
            const currentPossession = newPossession;
            
            // Полный сброс состояния
            this.player.hasBall = false;
            this.ai.hasBall = false;
            
            // Сброс скоростей игроков (НЕ меняем позиции!)
            this.player.vx = 0;
            this.player.vy = 0;
            this.ai.vx = 0;
            this.ai.vy = 0;
            
            // Сброс состояния мяча
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.vz = 0;
            this.ball.isOutOfBounds = false;
            this.ball.hasScored = false;
            
            // Установить владение ПЕРЕД вызовом resetToCheckBall
            this.rules.possession = currentPossession;
            
            // Вернуть в состояние checkBall через метод Rules
            this.rules.resetToCheckBall();
            
            // Вернуть мяч текущему владельцу БЕЗ изменения позиций
            if (currentPossession === 'player') {
                this.player.hasBall = true;
                const ballPos = this.player.getBallPosition();
                this.ball.attachTo('player', ballPos.x, ballPos.y);
            } else {
                this.ai.hasBall = true;
                const ballPos = this.ai.getBallPosition();
                this.ball.attachTo('ai', ballPos.x, ballPos.y);
            }
            
            // Сбросить таймер checkBall если был
            this.checkBallTimer = undefined;
            
            // Сбросить таймер автовозврата
            this.outOfBoundsTimer = null;
            
            console.log('Ball reset complete. State:', this.rules.getGameState(), 'Possession:', this.rules.getPossession());
        }
    }
}

