//... passMode.js
console.log("Loading passMode.js...");



function drawBall() {
    if (!gameState.ball) return;
    gameState.ball.trail = gameState.ball.trail || [];
    gameState.ball.rotation = gameState.ball.rotation || 0;

    let scale = 1;
    if (gameState.ball.isMoving) {
        gameState.ball.rotation += gameState.ball.vx * 0.02;
        gameState.ball.trail.push({ x: gameState.ball.x, y: gameState.ball.y });
        if (gameState.ball.trail.length > 20) gameState.ball.trail.shift();
        const speed = Math.hypot(gameState.ball.vx, gameState.ball.vy);
        const maxSpeed = 1.8; // Adjusted for yard units
        const pct = Math.min(speed / maxSpeed, 1);
        scale = 1 + pct * 0.9;
        console.log('Ball speed:', speed, 'pct:', pct, 'scale:', scale);
    }

    ctx.save();
    for (let i = 0; i < gameState.ball.trail.length; i++) {
        const p = gameState.ball.trail[i];
        const alpha = ((i + 1) / gameState.ball.trail.length) * 0.4;
        ctx.fillStyle = `rgba(165,42,42,${alpha})`;
        ctx.beginPath();
        ctx.arc(yardsToPixels(p.x), yardsToPixels(FIELD_HEIGHT - p.y), 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(yardsToPixels(gameState.ball.x), yardsToPixels(FIELD_HEIGHT - gameState.ball.y));
    ctx.rotate(gameState.ball.rotation);
    ctx.scale(scale, scale);
    ctx.fillStyle = "brown";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
}

function drawBand(ctx, start, endRaw, opts = {}) {
    console.log('Drawing band...');
    const { maxDist = 100, tickSpacing = 10, tickLen = 6, color = 'white', lineWidth = 2, tickWidth = 1 } = opts;
    const dx = endRaw.x - start.x;
    const dy = endRaw.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return;

    const ux = dx / dist;
    const uy = dy / dist;
    const drawDist = Math.min(dist, maxDist);
    const ex = start.x + ux * drawDist;
    const ey = start.y + uy * drawDist;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = tickWidth;
    const numTicks = Math.floor(drawDist / tickSpacing);
    const px = -uy;
    const py = ux;

    for (let i = 1; i <= numTicks; i++) {
        const t = i * tickSpacing;
        const tx = start.x + ux * t;
        const ty = start.y + uy * t;
        ctx.beginPath();
        ctx.moveTo(tx + px * tickLen, ty + py * tickLen);
        ctx.lineTo(tx - px * tickLen, ty - py * tickLen);
        ctx.stroke();
    }
}

function drawPassBall(ctx) {
    if (!passMode || !gameState.ballCarrier) return;
    const { x, y } = gameState.ballCarrier;
    ctx.save();
    ctx.translate(yardsToPixels(x), yardsToPixels(FIELD_HEIGHT - y));
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2); // Fixed pixels like drawBall
    ctx.fill();
    ctx.restore();
}

function playerHBColor() {
    phbColor = 'blue';
}
