// public/js/physics.js
console.log('physics.js loading...');

class SpatialGrid {
    constructor(cellSize, canvasWidth, canvasHeight) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(canvasWidth / cellSize);
        this.rows = Math.ceil(canvasHeight / cellSize);
        this.grid = Array(this.cols).fill().map(() => Array(this.rows).fill().map(() => []));
    }
    clear() {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                this.grid[x][y].length = 0;
            }
        }
    }
    addPlayer(player) {
        const minX = Math.floor((player.x - player.baseWidth / 2) / this.cellSize);
        const maxX = Math.floor((player.x + player.baseWidth / 2) / this.cellSize);
        const minY = Math.floor((player.y - player.baseHeight / 2) / this.cellSize);
        const maxY = Math.floor((player.y + player.baseHeight / 2) / this.cellSize);
        for (let x = Math.max(0, minX); x <= Math.min(this.cols - 1, maxX); x++) {
            for (let y = Math.max(0, minY); y <= Math.min(this.rows - 1, maxY); y++) {
                this.grid[x][y].push(player);
            }
        }
    }
    getNearbyPlayers(player) {
        const minX = Math.floor((player.x - player.baseWidth / 2) / this.cellSize);
        const maxX = Math.floor((player.x + player.baseWidth / 2) / this.cellSize);
        const minY = Math.floor((player.y - player.baseHeight / 2) / this.cellSize);
        const maxY = Math.floor((player.y + player.baseHeight / 2) / this.cellSize);
        let nearby = new Set();
        for (let x = Math.max(0, minX); x <= Math.min(this.cols - 1, maxX); x++) {
            for (let y = Math.max(0, minY); y <= Math.min(this.rows - 1, maxY); y++) {
                this.grid[x][y].forEach(p => nearby.add(p));
            }
        }
        nearby.delete(player);
        return Array.from(nearby);
    }
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}

function getRectangleVertices(player) {
    const w = player.baseWidth;
    const h = player.baseHeight;
    const cx = player.x;
    const cy = player.y;
    const angle = player.heading;
    const localCorners = [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 }
    ];
    let vertices = [];
    for (let corner of localCorners) {
        const rx = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
        const ry = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);
        vertices.push({ x: rx + cx, y: ry + cy });
    }
    return vertices;
}

function projectPolygon(axis, vertices) {
    let min = Infinity, max = -Infinity;
    for (let v of vertices) {
        let dot = v.x * axis.x + v.y * axis.y;
        if (dot < min) min = dot;
        if (dot > max) max = dot;
    }
    return { min, max };
}

function polygonCollision(poly1, poly2) {
    let overlap = Infinity;
    let smallestAxis = null;
    function testAxes(vertices) {
        for (let i = 0; i < vertices.length; i++) {
            let p1 = vertices[i];
            let p2 = vertices[(i + 1) % vertices.length];
            let edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            let axis = { x: -edge.y, y: edge.x };
            let len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            axis.x /= len;
            axis.y /= len;
            let proj1 = projectPolygon(axis, poly1);
            let proj2 = projectPolygon(axis, poly2);
            let o = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if (o < 0) return { colliding: false };
            if (o < overlap) {
                overlap = o;
                smallestAxis = axis;
            }
        }
        return { colliding: true };
    }
    let res1 = testAxes(poly1);
    if (!res1.colliding) return null;
    let res2 = testAxes(poly2);
    if (!res2.colliding) return null;
    return { overlap, axis: smallestAxis };
}

function adjustHeadingOnCollision(player, other, overlap) {
    const dx = other.x - player.x;
    const dy = other.y - player.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return;
    const contactNorm = { x: dx / mag, y: dy / mag };
    const forward = { x: Math.cos(player.heading), y: Math.sin(player.heading) };
    const dot = forward.x * contactNorm.x + forward.y * contactNorm.y;
    const cross = forward.x * contactNorm.y - forward.y * contactNorm.x;
    const isRearHit = dot < -0.8;
    const turnFactor = isRearHit ? 0.05 : 0.03;
    const turnAmount = turnFactor * overlap * (dot < 0 ? (1 - dot) : 0.5 * (1 - dot));
    player.heading += turnAmount * (cross > 0 ? 1 : -1);
}

function detectAndResolveCollisionRectangles(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > (p1.baseWidth + p2.baseWidth)) return;

    let poly1 = getRectangleVertices(p1);
    let poly2 = getRectangleVertices(p2);
    let collisionInfo = polygonCollision(poly1, poly2);
    // ================================================ COLLISION DETECTION
    if (collisionInfo) {                    
        // ============================================ Check for TACKLE
        //if (!collisionInfo) return null;
        // Check for tackle
        const p1isBall = p1.pid.includes('-h-');
        const p2isBall = p2.pid.includes('-h-');
        // === Tackle detection
        // ** if player1 has ball and collision with a player on opposite !== p2isBall team then tackle
        if (p1.hb && p1isBall !== p2isBall) {
            console.log('>> physics.js: home tackle detected (p1)! at', p1.x, p1.y);
            return {
                tackleDetected: {
                    tackledPlayerID: p1.pid,
                    tacklerID: p2.pid,
                    x: p1.x,
                    y: p1.y
                }
            };
        } else if (p2.hb && p1isBall !== p2isBall) {
            console.log('>> physics.js: tackle detected (p2)! at', p2.x, p2.y);
            return {
                tackleDetected: {
                    tackledPlayerID: p2.pid,
                    tacklerID: p1.pid,
                    x: p2.x,
                    y: p2.y
                }
            };
        }



        let mtv = {
            x: collisionInfo.axis.x * collisionInfo.overlap,
            y: collisionInfo.axis.y * collisionInfo.overlap
        };
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let dot = dx * mtv.x + dy * mtv.y;
        if (dot < 0) {
            mtv.x = -mtv.x;
            mtv.y = -mtv.y;
        }
        const damping = 0.85;
        p1.x -= mtv.x * 0.6 * damping;
        p1.y -= mtv.y * 0.6 * damping;
        p2.x += mtv.x * 0.6 * damping;
        p2.y += mtv.y * 0.6 * damping;
        const restitution = 0.5;
        let relativeVx = p2.vx - p1.vx;
        let relativeVy = p2.vy - p1.vy;
        let normalDotVelocity = relativeVx * collisionInfo.axis.x + relativeVy * collisionInfo.axis.y;
        if (normalDotVelocity < 0) {
            let impulse = -(1 + restitution) * normalDotVelocity / (p1.mass + p2.mass);
            p1.vx -= impulse * p1.mass * collisionInfo.axis.x;
            p1.vy -= impulse * p1.mass * collisionInfo.axis.y;
            p2.vx += impulse * p2.mass * collisionInfo.axis.x;
            p2.vy += impulse * p2.mass * collisionInfo.axis.y;
        }
        adjustHeadingOnCollision(p1, p2, collisionInfo.overlap);
        adjustHeadingOnCollision(p2, p1, collisionInfo.overlap);
    }
    return { tackleDetected: null };
}




module.exports = {
    SpatialGrid,
    degToRad,
    getRectangleVertices,
    projectPolygon,
    polygonCollision,
    adjustHeadingOnCollision,
    detectAndResolveCollisionRectangles,
};