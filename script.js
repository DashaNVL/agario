const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.querySelector('.button');
let animationFrameId = requestAnimationFrame(gameLoop);

// Настройка размеров canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


class GameObject {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    distanceTo(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Player extends GameObject {
    constructor() {
        super(canvas.width / 2, canvas.height / 2, 20, '#3498db');
        this.speed = 3;
        this.score = 0;
        this.name = "You"; // Добавляем имя игрока
    }

    update(targetX, targetY) {
        // Вычисляем направление к курсору
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }

        // Обновляем позицию игрока
        this.x += this.vx;
        this.y += this.vy;

        // Ограничиваем позицию игрока в пределах canvas
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    draw() {
        // Рисуем круг (как в родительском классе)
        super.draw();

        // Настройки для текста
        ctx.font = "20px Arial"; // Шрифт и размер
        ctx.fillStyle = "black"; // Цвет текста
        ctx.textAlign = "center"; // Выравнивание текста по центру
        ctx.textBaseline = "middle"; // Выравнивание по вертикали по центру

        // Рисуем текст (имя и счёт)
        ctx.fillText(`${this.name}`, this.x, this.y);
    }
}

class Bot extends GameObject {
    constructor() {
        super(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            15 + Math.random() * 10,
            `hsl(${Math.random() * 360}, 50%, 50%)`
        );
        this.speed = 2.5;
        this.target = null;
        this.thinkingTimer = 0;
    }

    update(player, foods, enemies) {
        this.thinkingTimer--;

        if (this.thinkingTimer <= 0 || !this.target || this.target.radius <= 0) {
            this.chooseStrategy(player, foods, enemies);
            this.thinkingTimer = 60 + Math.random() * 60;
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    chooseStrategy(player, foods, enemies) {
        const dangerousEnemies = enemies.filter(e =>
            e.radius > this.radius * 0.8 && this.distanceTo(e) < 400
        );

        if (dangerousEnemies.length > 0) {
            const closest = dangerousEnemies.reduce((a, b) =>
                this.distanceTo(a) < this.distanceTo(b) ? a : b
            );
            this.target = {
                x: this.x + (this.x - closest.x),
                y: this.y + (this.y - closest.y)
            };
        }
        else if (this.radius > player.radius * 0.8) {
            this.target = player;
        }
        else {
            const closestFood = foods.reduce((a, b) =>
                this.distanceTo(a) < this.distanceTo(b) ? a : b
            );
            this.target = closestFood || { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
        }
    }
}

class Food extends GameObject {
    constructor() {
        super(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            5,
            '#2ecc71'
        );
    }
}

class Enemy extends GameObject {
    constructor() {
        super(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            15 + Math.random() * 20,
            `hsl(${Math.random() * 360}, 50%, 50%)`
        );
        this.speed = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI * 2;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (this.x < 0 || this.x > canvas.width) this.angle = Math.PI - this.angle;
        if (this.y < 0 || this.y > canvas.height) this.angle = -this.angle;
    }
}

// Инициализация игры
const player = new Player();
let bots = Array(5).fill().map(() => new Bot());
let foods = Array(100).fill().map(() => new Food());
let enemies = Array(15).fill().map(() => new Enemy());

// Позиция курсора
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// Обновление позиции курсора
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

function checkCollisions() {
    // Проверка столкновений игрока с едой
    foods = foods.filter(food => {
        if (player.distanceTo(food) < player.radius) {
            player.radius += 0.3;
            player.score += 10;
            scoreElement.textContent = `Score: ${player.score}`;
            return false;
        }
        return true;
    });

    // Проверка столкновений ботов с едой
    bots.forEach(bot => {
        foods = foods.filter(food => {
            if (bot.distanceTo(food) < bot.radius) {
                bot.radius += 0.2;
                return false;
            }
            return true;
        });
    });

    // Проверка столкновений игрока с врагами
    enemies.forEach((enemy, index) => {
        if (player.distanceTo(enemy) < player.radius + enemy.radius) {
            if (player.radius > enemy.radius * 1.2) {
                // Игрок съедает врага
                player.radius += enemy.radius * 0.3;
                player.score += enemy.radius * 10; // Увеличиваем счет
                scoreElement.textContent = `Score: ${player.score}`;
                enemies.splice(index, 1); // Удаляем врага
            } else {
                gameOver();
            }
        }
    });

    // Проверка столкновений игрока с ботами
    bots.forEach((bot, index) => {
        if (player.distanceTo(bot) < player.radius + bot.radius) {
            if (player.radius > bot.radius * 1.2) {
                // Игрок съедает бота
                player.radius += bot.radius * 0.3;
                player.score += bot.radius * 10; // Увеличиваем счет
                scoreElement.textContent = `Score: ${player.score}`;
                bots.splice(index, 1); // Удаляем бота
            } else if (bot.radius > player.radius * 1.2) {
                // Бот съедает игрока
                gameOver();
            }
        }
    });

    // Проверка столкновений ботов с врагами
    bots.forEach((bot, index) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bot.distanceTo(enemy) < bot.radius + enemy.radius) {
                if (bot.radius > enemy.radius * 1.2) {
                    // Бот съедает врага
                    bot.radius += enemy.radius * 0.2;
                    enemies.splice(enemyIndex, 1);
                } else if (enemy.radius > bot.radius * 1.2) {
                    // Враг съедает бота
                    bots.splice(index, 1);
                }
            }
        });
    });
}

function gameLoop() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Обновляем игрока, передавая позицию курсора
    player.update(mouseX, mouseY);
    player.draw();

    bots.forEach(bot => {
        bot.update(player, foods, enemies);
        bot.draw();
    });

    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    foods.forEach(food => food.draw());

    checkCollisions();

    if (player.score >= 50000) {
        gameOver()
    }

    if (foods.length < 100) foods.push(new Food());
    if (bots.length < 5) bots.push(new Bot());
    if (enemies.length < 15) enemies.push(new Enemy());

    animationFrameId = requestAnimationFrame(gameLoop);


}

function gameOver() {
    cancelAnimationFrame(animationFrameId); // Используем текущий идентификатор
    startBtn.style.visibility = "visible";
    startBtn.innerText = `ПЕРЕЗАГРУЗКА... \n\nНабрано очков: ${player.score}`
    
    console.log("Game over, animation stopped with ID:", animationFrameId);
    document.location.reload();
}
