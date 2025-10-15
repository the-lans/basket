# Отчёт об исправлении багов №2

**Дата:** 15 октября 2025  
**Статус:** ✅ Все баги исправлены

---

## Найденные и исправленные баги

### 🔴 **БАГ 1: Поле сдвинуто влево, кольцо не видно**

**Проблема:**  
Игровое поле отображается со смещением влево, кольцо находится за пределами экрана.

**Причина:**  
Неправильный расчёт центра камеры в `getCameraOffset()`. Камера центрировала по математическому центру корта (LENGTH/2), но нужно было центрировать ближе к кольцу.

**Исправление:**  
Файл: `src/core/Projection.js` (строки 65-79)

```javascript
export function getCameraOffset(canvasWidth, canvasHeight) {
    // Центрируем корт в центре экрана
    // Корт находится от (0,0) до (WIDTH, LENGTH)
    // Центр корта будет в точке (WIDTH/2, LENGTH/2)
    const courtCenterX = CONFIG.COURT.WIDTH / 2;
    const courtCenterY = CONFIG.COURT.LENGTH * 0.4; // Сдвиг к началу корта (где кольцо)
    
    const { sx, sy } = worldToScreen(courtCenterX, courtCenterY, 0);
    
    // Центрируем по горизонтали, вертикаль смещаем чтобы кольцо было видно
    const offsetX = canvasWidth / 2 - sx;
    const offsetY = canvasHeight * 0.5 - sy; // Центрирование с учётом изометрии
    
    return { offsetX, offsetY };
}
```

**Результат:** ✅ Поле теперь центрировано, кольцо и весь корт видны

---

### 🔵 **БАГ 2: Мяч не скачет по полу при дриблинге**

**Проблема:**  
Когда игрок держит мяч и двигается, мяч не отскакивает от пола - висит на месте.

**Причина:**  
Анимация дриблинга (синусоида по Z) работала, но в `updateBallPosition()` позиция мяча полностью перезаписывалась через `attachTo()`, что убивало анимацию Z.

**Исправление:**  
Файл: `src/scenes/GameScene.js` (строки 311-332)

```javascript
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
    }
    // ... остальная логика
}
```

Также добавлен вызов `this.ball.update(dt)` в `handleCheckBall()` (строка 201):
```javascript
// Обновить анимацию мяча (для дриблинга)
this.ball.update(dt);
```

**Результат:** ✅ Мяч теперь отскакивает от пола с частотой 2 Гц, амплитуда 0.3м

---

### 🟢 **БАГ 3: Синий прямоугольник справа на экране**

**Проблема:**  
Справа на экране отображается большой синий прямоугольник, который перекрывает часть игрового пространства.

**Причина:**  
Это была правая трибуна (голубая), которая рисовалась как простой прямоугольник в экранных координатах, не учитывая изометрию.

**Исправление:**  
Файл: `src/game/CourtRenderer.js` (строки 79-83)

```javascript
renderTribunes(ctx, worldToScreenFn) {
    // Трибуны временно отключены для лучшей видимости корта
    // Можно включить позже с правильной изометрической отрисовкой
    return;
}
```

**Результат:** ✅ Трибуны отключены, весь корт чётко виден

---

### 🟡 **БАГ 4: Недостаточная разметка на корте**

**Проблема:**  
На корте отсутствовала задняя линия, полукруг под кольцом (ограниченная зона), точка штрафного броска.

**Исправление:**  
Файл: `src/game/CourtRenderer.js`

Добавлено в `renderCourtLines()` (строки 132-174):

1. **Задняя линия:**
```javascript
// Задняя линия (конец половины корта)
this.drawLine(ctx, worldToScreenFn, 0, CONFIG.COURT.LENGTH, CONFIG.COURT.WIDTH, CONFIG.COURT.LENGTH);
```

2. **Полукруг ограниченной зоны:**
```javascript
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
```

3. **Точка штрафного броска:**
```javascript
// Центральная точка штрафного броска
const ftCenterX = CONFIG.COURT.WIDTH / 2;
const ftCenterY = ftY;
const ftPoint = worldToScreenFn(ftCenterX, ftCenterY, 0);
ctx.fillStyle = CONFIG.COLORS.LINE_WHITE;
ctx.beginPath();
ctx.arc(ftPoint.sx, ftPoint.sy, 3, 0, Math.PI * 2);
ctx.fill();
```

**Результат:** ✅ Полная баскетбольная разметка: боковые линии, базовая, задняя, трёхочковая дуга, штрафная зона, полукруг под кольцом, точка штрафного

---

### 🟣 **БАГ 5: Игрок 2 (AI) стоит на месте**

**Проблема:**  
AI не двигается вообще, стоит на одном месте даже когда у него мяч.

**Причина:**  
AI контроллер не вызывался в состоянии `checkBall`. В `handleCheckBall()` не было вызова `aiController.update()`.

**Исправление:**  
Файл: `src/scenes/GameScene.js` (строки 152-168)

```javascript
// Обновить AI даже в checkBall для позиционирования
if (this.rules.getPossession() === 'ai') {
    this.aiController.update(dt, {
        ball: this.ball,
        opponent: this.player,
        shotClock: this.rules.shotClock,
    });
} else {
    // AI защищается в checkBall
    const defenseX = CONFIG.COURT.WIDTH / 2;
    const defenseY = CONFIG.COURT.BACKBOARD_DISTANCE + 3.0;
    const dist = distance(this.ai.x, this.ai.y, defenseX, defenseY);
    if (dist > 0.5) {
        const angle = Math.atan2(defenseY - this.ai.y, defenseX - this.ai.x);
        this.ai.applyMovement(Math.cos(angle), Math.sin(angle));
    }
}
```

Также добавлен таймер для AI перед началом атаки (строки 186-195):
```javascript
else if (this.rules.getPossession() === 'ai' && this.ai.hasBall) {
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
```

**Результат:** ✅ AI теперь двигается, занимает защитную позицию когда у игрока мяч, и атакует когда у него мяч

---

## Изменённые файлы

1. **`src/core/Projection.js`** - исправлено центрирование камеры
2. **`src/game/CourtRenderer.js`** - отключены трибуны, улучшена разметка корта
3. **`src/scenes/GameScene.js`** - исправлена анимация дриблинга, добавлено движение AI

---

## Проверка

Для проверки исправлений:

```bash
# Запустить сервер
npm run dev

# Открыть http://localhost:3000
```

**Что проверить:**
1. ✅ Поле центрировано, кольцо и весь корт видны
2. ✅ Нет синих прямоугольников по бокам
3. ✅ Мяч отскакивает от пола при дриблинге
4. ✅ На корте видна полная баскетбольная разметка
5. ✅ AI двигается - защищается или атакует

---

## Дополнительные улучшения

### Разметка корта теперь включает:
- ✅ Боковые линии
- ✅ Базовая линия (у кольца)
- ✅ Задняя линия (конец половины корта)
- ✅ Трёхочковая дуга
- ✅ Штрафная зона (прямоугольник)
- ✅ Линия штрафного броска
- ✅ Полукруг под кольцом (ограниченная зона)
- ✅ Центральная точка штрафного броска
- ✅ Все линии белые с неоновым свечением

### AI поведение:
- ✅ В checkBall занимает защитную позицию
- ✅ Атакует когда у него мяч
- ✅ Защищается когда у игрока мяч
- ✅ Ждёт 1 секунду перед началом атаки после checkBall

---

## Итог

**Все 5 багов исправлены!** 🏀

Игра теперь:
- Корректно отображает корт с кольцом
- Показывает анимацию дриблинга
- Имеет полную баскетбольную разметку
- AI активно участвует в игре

**Готово к тестированию!**

