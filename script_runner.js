const canvas = document.getElementById('runnerCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('buff-status');
const tickerEl = document.getElementById('ticker-text');

let CW, CH, GROUND_Y, player, gameActive = false, score = 0, gameSpeed = 7, frameCount = 0;
let obstacles = [], items = [], deadlineX = -300;

// DANH SÁCH CÂU THOẠI THUYẾT MINH
const comments = [
    "SẾP ĐANG GỌI: 'Bản vẽ đâu rồi em ơi???'",
    "THÔNG BÁO: Hiện trường đang lún cục bộ, chạy ngay!",
    "TIN NÓNG: QCVN mới vừa ban hành, phải sửa lại hết thiết kế!",
    "DEADLINE: Còn 5 phút nữa là đến giờ nộp hồ sơ thẩm duyệt!",
    "CẢNH BÁO: Chủ đầu tư đang đứng ở cổng công trường!",
    "TIN BUỒN: Thẩm tra vừa gửi lại 100 trang ý kiến chỉnh sửa...",
    "KỸ SƯ THAN: 'Ước gì hôm nay là Chủ Nhật... nhưng Chủ Nhật vẫn phải làm!'",
    "TRẠNG THÁI: Đang mơ về một giấc ngủ 8 tiếng không có tiếng chuông Zalo."
];

function init() {
    CW = canvas.width = canvas.parentElement.clientWidth;
    CH = canvas.height = canvas.parentElement.clientHeight;
    GROUND_Y = CH - 80;
}

// Hàm thay đổi câu thoại ngẫu nhiên
function updateTicker() {
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    tickerEl.innerText = randomComment;
}

class Player {
    constructor() {
        this.w = 40; this.h = 75; this.x = 80; this.y = GROUND_Y - this.h;
        this.vy = 0; this.gravity = 0.85; this.jumpPower = -17;
        this.isGrounded = true; this.isDucking = false; this.shield = false;
        this.anim = 0;
    }
    jump() {
        if (this.isGrounded && !this.isDucking) {
            this.vy = this.jumpPower; this.isGrounded = false;
            document.getElementById('snd-jump').play().catch(()=>{});
        }
    }
    duck(state) {
        if (this.isGrounded) {
            this.isDucking = state;
            this.h = state ? 40 : 75;
            this.y = GROUND_Y - this.h;
        }
    }
    update() {
        if (!this.isGrounded) {
            this.vy += this.gravity; this.y += this.vy;
            if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; this.isGrounded = true; }
        }
        this.anim += 0.2;
    }
    draw() {
        ctx.save();
        if (this.shield) {
            ctx.beginPath(); ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 4;
            ctx.arc(this.x + this.w/2, this.y + this.h/2, 50, 0, Math.PI*2); ctx.stroke();
        }
        let px = this.x, py = this.y;
        ctx.fillStyle = "#1e293b";
        let legOffset = Math.sin(this.anim) * 10;
        ctx.fillRect(px + 5, py + this.h - 15, 12, 15 + (this.isGrounded ? legOffset : 0));
        ctx.fillRect(px + 23, py + this.h - 15, 12, 15 - (this.isGrounded ? legOffset : 0));
        ctx.fillStyle = "#fbbf24"; ctx.fillRect(px, py + 15, this.w, this.h - 30);
        ctx.fillStyle = "#fef3c7"; ctx.fillRect(px + 5, py, 30, 20);
        ctx.fillStyle = "#fff"; ctx.fillRect(px - 2, py - 5, 44, 12);
        ctx.fillStyle = "#e2e8f0"; ctx.fillRect(px - 10, py + 20, 10, 35);
        ctx.restore();
    }
}

function startGame() {
    init();
    player = new Player();
    obstacles = []; items = []; score = 0; gameSpeed = 7; deadlineX = -300;
    gameActive = true; frameCount = 0;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    updateTicker(); // Cập nhật chữ chạy khi bắt đầu
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, CW, CH);
    frameCount++;

    // Cứ sau 1000 frame (khoảng 15-20s) thì đổi câu thuyết minh
    if (frameCount % 1000 === 0) updateTicker();

    ctx.fillStyle = "#78350f"; ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);
    ctx.fillStyle = "#4ade80"; ctx.fillRect(0, GROUND_Y, CW, 15);
    deadlineX = Math.min(deadlineX + 0.12, player.x - 70);
    ctx.fillStyle = "rgba(220, 38, 38, 0.6)"; ctx.fillRect(0, 0, deadlineX + 60, CH);

    if (frameCount % 90 === 0) {
        let isAir = Math.random() > 0.5;
        obstacles.push({
            name: isAir ? "HỒ SƠ" : "Ổ GÀ",
            x: CW, y: isAir ? GROUND_Y - 110 : GROUND_Y - 35,
            w: isAir ? 80 : 50, h: 30, color: isAir ? "#fff" : "#334155"
        });
    }

    if (frameCount % 400 === 0) {
        items.push({ type: Math.random() > 0.5 ? 'CAFE' : 'LAW', x: CW, y: GROUND_Y - 120, w: 35, h: 35 });
    }

    player.update(); player.draw();

    obstacles.forEach((obs, i) => {
        obs.x -= gameSpeed;
        ctx.fillStyle = obs.color; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = "#000"; ctx.font = "bold 10px Arial"; ctx.fillText(obs.name, obs.x + 10, obs.y + 20);
        if (checkHit(player, obs)) {
            if (player.shield) { player.shield = false; obstacles.splice(i, 1); statusEl.innerText = "MẤT GIÁP"; }
            else { endGame(obs.name); }
        }
    });

    items.forEach((itm, i) => {
        itm.x -= gameSpeed;
        ctx.fillStyle = itm.type === 'CAFE' ? '#713f12' : '#16a34a';
        ctx.fillRect(itm.x, itm.y, itm.w, itm.h);
        if (checkHit(player, itm)) {
            if (itm.type === 'CAFE') { statusEl.innerText = "TĂNG TỐC!"; gameSpeed += 3; setTimeout(()=>gameSpeed-=3, 2500); }
            else { player.shield = true; statusEl.innerText = "CÓ GIÁP"; }
            items.splice(i, 1);
        }
    });

    score++; scoreEl.innerText = Math.floor(score/10);
    gameSpeed += 0.001;
    requestAnimationFrame(gameLoop);
}

function checkHit(p, o) {
    return p.x < o.x + o.w && p.x + p.w > o.x && p.y < o.y + o.h && p.y + p.h > o.y;
}

function endGame(reason) {
    gameActive = false; document.getElementById('snd-hit').play().catch(()=>{});
    document.getElementById('final-score').innerText = Math.floor(score/10);
    document.getElementById('death-reason').innerText = "Lý do: Vướng " + reason;
    document.getElementById('game-over-screen').classList.remove('hidden');
    tickerEl.innerText = "KỸ SƯ ĐÃ GỤC NGÃ... Deadline đã chiến thắng.";
}

const jumpBtn = document.getElementById('btnJump');
const duckBtn = document.getElementById('btnDuck');
jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); player.jump(); });
duckBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); player.duck(true); });
window.addEventListener('pointerup', () => player.duck(false));

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') player.jump();
    if (e.key === 'ArrowDown') player.duck(true);
});
window.addEventListener('keyup', (e) => { if (e.key === 'ArrowDown') player.duck(false); });

window.onload = init;