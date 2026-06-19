// ===== GAME CONSTANTS =====
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const GRID_SIZE = 40;
const MAX_SHAPES = 80;
const MAX_BOTS = 5;
const BULLET_SPEED = 8;
const PLAYER_SPEED = 3;
const BOT_SPEED = 1.5;

// ===== CANVAS SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
minimapCanvas.width = 150;
minimapCanvas.height = 150;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ===== GAME STATE =====
let gameRunning = true;
let score = 0;
let level = 1;
let xp = 0;
let xpToNext = 50;

let camera = { x: 0, y: 0 };
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let keys = {};

let player = null;
let bullets = [];
let shapes = [];
let bots = [];
let particles = [];
let damageTexts = [];

// ===== CLASSES =====
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.color = color;
        this.angle = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = isPlayer ? PLAYER_SPEED : BOT_SPEED;
        this.isPlayer = isPlayer;
        this.fireRate = 15;
        this.fireCooldown = 0;
        this.bulletDamage = 10;
        this.bulletSpeed = BULLET_SPEED;
        this.level = 1;
        this.xp = 0;
        this.bodyDamage = 15;
        this.regenCooldown = 0;
    }

    draw() {
        const sx = this.x - camera.x + canvas.width / 2;
        const sy = this.y - camera.y + canvas.height / 2;

        // Draw barrel
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#999';
        ctx.strokeStyle = '#727272';
        ctx.lineWidth = 2;
        ctx.fillRect(0, -8, 40, 16);
        ctx.strokeRect(0, -8, 40, 16);

        ctx.restore();

        // Draw body
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = darkenColor(this.color, 30);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw HP bar
        if (this.hp < this.maxHp) {
            const barWidth = 50;
            const barHeight = 6;
            const barX = sx - barWidth / 2;
            const barY = sy + this.radius + 10;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }

    update() {
        // Regen
        this.regenCooldown--;
        if (this.regenCooldown <= 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 0.1);
        }

        // Keep within bounds
        this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));

        if (this.fireCooldown > 0) this.fireCooldown--;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.regenCooldown = 120;
        if (this.hp <= 0) {
            this.hp = 0;
            return true; // dead
        }
        return false;
    }

    shoot() {
        if (this.fireCooldown > 0) return;
        this.fireCooldown = this.fireRate;

        const bx = this.x + Math.cos(this.angle) * 40;
        const by = this.y + Math.sin(this.angle) * 40;

        bullets.push(new Bullet(
            bx, by,
            Math.cos(this.angle) * this.bulletSpeed,
            Math.sin(this.angle) * this.bulletSpeed,
            this.bulletDamage,
            this.isPlayer ? 'player' : 'bot',
            this.color
        ));
    }
}

class Bullet {
    constructor(x, y, vx, vy, damage, owner, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 8;
        this.damage = damage;
        this.owner = owner;
        this.color = color;
        this.life = 120;
    }

    draw() {
        const sx = this.x - camera.x + canvas.width / 2;
        const sy = this.y - camera.y + canvas.height / 2;

        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }
}

class Shape {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'square', 'triangle', 'pentagon'
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;

        switch (type) {
            case 'square':
                this.radius = 15;
                this.hp = 20;
                this.maxHp = 20;
                this.xpValue = 10;
                this.color = '#ffe869';
                this.sides = 4;
                break;
            case 'triangle':
                this.radius = 18;
                this.hp = 40;
                this.maxHp = 40;
                this.xpValue = 25;
                this.color = '#fc7677';
                this.sides = 3;
                break;
            case 'pentagon':
                this.radius = 25;
                this.hp = 80;
                this.maxHp = 80;
                this.xpValue = 60;
                this.color = '#768dfc';
                this.sides = 5;
                break;
        }

        this.bodyDamage = 5;
    }

    draw() {
        const sx = this.x - camera.x + canvas.width / 2;
        const sy = this.y - camera.y + canvas.height / 2;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        ctx.beginPath();
        for (let i = 0; i < this.sides; i++) {
            const a = (i / this.sides) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * this.radius;
            const py = Math.sin(a) * this.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = darkenColor(this.color, 30);
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();

        // HP bar
        if (this.hp < this.maxHp) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = sx - barWidth / 2;
            const barY = sy + this.radius + 8;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        }
    }

    update() {
        this.angle += this.rotSpeed;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) return true;
        return false;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.radius = Math.random() * 4 + 2;
        this.color = color;
        this.life = 30;
        this.maxLife = 30;
    }

    draw() {
        const sx = this.x - camera.x + canvas.width / 2;
        const sy = this.y - camera.y + canvas.height / 2;
        const alpha = this.life / this.maxLife;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life--;
    }
}

class DamageText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 40;
        this.maxLife = 40;
    }

    draw() {
        const sx = this.x - camera.x + canvas.width / 2;
        const sy = this.y - camera.y + canvas.height / 2;
        const alpha = this.life / this.maxLife;

        ctx.globalAlpha = alpha;
        ctx.font = 'bold 14px Ubuntu, sans-serif';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, sx, sy);
        ctx.globalAlpha = 1;
    }

    update() {
        this.y -= 0.8;
        this.life--;
    }
}

// ===== BOT AI =====
class Bot extends Tank {
    constructor(x, y) {
        const colors = ['#f44336', '#9c27b0', '#ff9800', '#e91e63', '#795548'];
        super(x, y, colors[Math.floor(Math.random() * colors.length)], false);
        this.targetAngle = Math.random() * Math.PI * 2;
        this.changeDirectionTimer = 0;
        this.state = 'wander'; // wander, chase, flee
        this.target = null;
    }

    ai() {
        const distToPlayer = distance(this.x, this.y, player.x, player.y);

        // Decide state
        if (this.hp < this.maxHp * 0.3) {
            this.state = 'flee';
        } else if (distToPlayer < 400) {
            this.state = 'chase';
        } else {
            this.state = 'wander';
        }

        switch (this.state) {
            case 'chase':
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.x += Math.cos(this.angle) * this.speed * 0.7;
                this.y += Math.sin(this.angle) * this.speed * 0.7;
                if (distToPlayer < 350) this.shoot();
                break;

            case 'flee':
                const fleeAngle = Math.atan2(this.y - player.y, this.x - player.x);
                this.x += Math.cos(fleeAngle) * this.speed;
                this.y += Math.sin(fleeAngle) * this.speed;
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                break;

            case 'wander':
                this.changeDirectionTimer--;
                if (this.changeDirectionTimer <= 0) {
                    this.targetAngle = Math.random() * Math.PI * 2;
                    this.changeDirectionTimer = 120 + Math.random() * 120;
                }
                this.x += Math.cos(this.targetAngle) * this.speed * 0.5;
                this.y += Math.sin(this.targetAngle) * this.speed * 0.5;
                this.angle = this.targetAngle;

                // Shoot at nearby shapes
                for (const shape of shapes) {
                    const d = distance(this.x, this.y, shape.x, shape.y);
                    if (d < 200) {
                        this.angle = Math.atan2(shape.y - this.y, shape.x - this.x);
                        this.shoot();
                        break;
                    }
                }
                break;
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function darkenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return `rgb(${r},${g},${b})`;
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function circleCollision(a, b) {
    return distance(a.x, a.y, b.x, b.y) < a.radius + b.radius;
}

// ===== GAME INIT =====
function initGame() {
    player = new Tank(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, '#00b2e1', true);
    bullets = [];
    shapes = [];
    bots = [];
    particles = [];
    damageTexts = [];
    score = 0;
    level = 1;
    xp = 0;
    xpToNext = 50;
    gameRunning = true;

    // Spawn initial shapes
    for (let i = 0; i < MAX_SHAPES; i++) {
        spawnShape();
    }

    // Spawn bots
    for (let i = 0; i < MAX_BOTS; i++) {
        spawnBot();
    }

    document.getElementById('game-over').style.display = 'none';
}

function spawnShape() {
    const x = Math.random() * (WORLD_WIDTH - 100) + 50;
    const y = Math.random() * (WORLD_HEIGHT - 100) + 50;
    const types = ['square', 'square', 'square', 'triangle', 'triangle', 'pentagon'];
    const type = types[Math.floor(Math.random() * types.length)];
    shapes.push(new Shape(x, y, type));
}

function spawnBot() {
    const x = Math.random() * (WORLD_WIDTH - 200) + 100;
    const y = Math.random() * (WORLD_HEIGHT - 200) + 100;
    bots.push(new Bot(x, y));
}

function addXP(amount) {
    xp += amount;
    score += amount;

    while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * 1.4);
        // Level up bonuses
        player.maxHp += 10;
        player.hp = player.maxHp;
        player.bulletDamage += 2;
        if (player.fireRate > 5) player.fireRate -= 1;
    }
}

// ===== INPUT HANDLING =====
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ===== GAME LOOP =====
function update() {
    if (!gameRunning) return;

    // Player movement
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        player.x += dx * player.speed;
        player.y += dy * player.speed;
    }

    // Player aim
    const worldMouseX = mouse.x + camera.x - canvas.width / 2;
    const worldMouseY = mouse.y + camera.y - canvas.height / 2;
    player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

    // Auto fire
    player.shoot();
    player.update();

    // Camera follow player
    camera.x += (player.x - camera.x) * 0.1;
    camera.y += (player.y - camera.y) * 0.1;

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();

        if (b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }

        // Bullet vs shapes
        for (let j = shapes.length - 1; j >= 0; j--) {
            if (circleCollision(b, shapes[j])) {
                const shape = shapes[j];
                const dead = shape.takeDamage(b.damage);
                damageTexts.push(new DamageText(shape.x, shape.y - shape.radius, `-${b.damage}`, '#ff0'));
                spawnParticles(b.x, b.y, shape.color, 3);

                if (dead) {
                    spawnParticles(shape.x, shape.y, shape.color, 8);
                    if (b.owner === 'player') {
                        addXP(shape.xpValue);
                    }
                    shapes.splice(j, 1);
                    // Respawn
                    setTimeout(spawnShape, 3000);
                }

                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Bullet vs player
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b || b.owner === 'player') continue;

        if (circleCollision(b, player)) {
            const dead = player.takeDamage(b.damage);
            damageTexts.push(new DamageText(player.x, player.y - player.radius, `-${b.damage}`, '#f00'));
            spawnParticles(b.x, b.y, b.color, 3);
            bullets.splice(i, 1);

            if (dead) {
                gameOver();
                return;
            }
        }
    }

    // Bullet vs bots
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b || b.owner === 'bot') continue;

        for (let j = bots.length - 1; j >= 0; j--) {
            if (circleCollision(b, bots[j])) {
                const bot = bots[j];
                const dead = bot.takeDamage(b.damage);
                damageTexts.push(new DamageText(bot.x, bot.y - bot.radius, `-${b.damage}`, '#ff0'));
                spawnParticles(b.x, b.y, bot.color, 3);

                if (dead) {
                    spawnParticles(bot.x, bot.y, bot.color, 10);
                    addXP(100);
                    bots.splice(j, 1);
                    setTimeout(spawnBot, 5000);
                }

                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Body collision: player vs shapes
    for (const shape of shapes) {
        if (circleCollision(player, shape)) {
            const dead = player.takeDamage(shape.bodyDamage * 0.1);
            if (dead) {
                gameOver();
                return;
            }
            // Push apart
            const ang = Math.atan2(player.y - shape.y, player.x - shape.x);
            player.x += Math.cos(ang) * 2;
            player.y += Math.sin(ang) * 2;
        }
    }

    // Update bots
    for (const bot of bots) {
        bot.ai();
        bot.update();
    }

    // Update shapes
    for (const shape of shapes) {
        shape.update();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Update damage texts
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        damageTexts[i].update();
        if (damageTexts[i].life <= 0) damageTexts.splice(i, 1);
    }

    // Update UI
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('level-text').textContent = `Level ${level}`;
    document.getElementById('level-bar').style.width = `${(xp / xpToNext) * 100}%`;
}

function draw() {
    // Clear
    ctx.fillStyle = '#cdcdcd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    const offsetX = -camera.x % GRID_SIZE + canvas.width / 2 % GRID_SIZE;
    const offsetY = -camera.y % GRID_SIZE + canvas.height / 2 % GRID_SIZE;

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;

    for (let x = offsetX - GRID_SIZE; x < canvas.width + GRID_SIZE; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = offsetY - GRID_SIZE; y < canvas.height + GRID_SIZE; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw world boundary
    const bx = -camera.x + canvas.width / 2;
    const by = -camera.y + canvas.height / 2;
    ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw shapes
    for (const shape of shapes) {
        shape.draw();
    }

    // Draw bullets
    for (const bullet of bullets) {
        bullet.draw();
    }

    // Draw bots
    for (const bot of bots) {
        bot.draw();
    }

    // Draw player
    player.draw();

    // Draw particles
    for (const p of particles) {
        p.draw();
    }

    // Draw damage texts
    for (const dt of damageTexts) {
        dt.draw();
    }

    // Draw minimap
    drawMinimap();
}

function drawMinimap() {
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    minimapCtx.fillStyle = 'rgba(200,200,200,0.8)';
    minimapCtx.fillRect(0, 0, mw, mh);

    // Border
    minimapCtx.strokeStyle = '#666';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, mw, mh);

    // Player dot
    const px = (player.x / WORLD_WIDTH) * mw;
    const py = (player.y / WORLD_HEIGHT) * mh;
    minimapCtx.fillStyle = '#00b2e1';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    minimapCtx.fill();

    // Bot dots
    for (const bot of bots) {
        const bx = (bot.x / WORLD_WIDTH) * mw;
        const by = (bot.y / WORLD_HEIGHT) * mh;
        minimapCtx.fillStyle = bot.color;
        minimapCtx.beginPath();
        minimapCtx.arc(bx, by, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score').textContent = `Score: ${score} | Level: ${level}`;
}

function restartGame() {
    initGame();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ===== START =====
initGame();
gameLoop();
