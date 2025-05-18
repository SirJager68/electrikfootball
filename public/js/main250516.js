// =================== main.js
//
console.log('=====================');
console.log('==ELECTRIK FOOTBALL==');
console.log('====HAL 9001 =========');
console.log('=====================');
console.log('Loading main.js...');
console.log('=====================');

// =================== SETUP CANVAS AND WEBSOCKET
// **
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ws = new WebSocket('ws://localhost:8080');
const gameID = 'abcdef';
let players = [];
let gameRunning = false;
let clockSeconds = 600; // Default until server update
let playClock = 25; // Default until server update

// ==================== FIELD DIMESIONS
// ** should server give us this on startup?
const FIELD_WIDTH = 140;
const FIELD_HEIGHT = 80;
const PLAYABLE_WIDTH = 120;
const PLAYABLE_HEIGHT = 63;
const PLAYABLE_X_OFFSET = (FIELD_WIDTH - PLAYABLE_WIDTH) / 2; // 10
const PLAYABLE_Y_OFFSET = (FIELD_HEIGHT - PLAYABLE_HEIGHT) / 2; // 3.5
const pixelsPerYard = canvas.width / FIELD_WIDTH;


// ===== MOVING AND ZOOMING THE FIELD EVENT LISTENERS
let zoom = 1; // Initial zoom
const ZOOM_MIN = 0.9; // Min zoom (half size)
const ZOOM_MAX = 3; // Max zoom (triple size)
//const ZOOM_STEP = 0.1; // Zoom increment
const ZOOM_STEP = 0.01; // Zoom increment
let panX = 0; // Pan offset in pixels
let panY = 0;
let isDraggingField = false;
let isDraggingPlayer = false;
let isDragging = false;
let isAdjustingDial = false;
let isRotatePlayer = false;
let selectedPlayer = null;
let lastMouseX = 0;
let lastMouseY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let mx = 0; // Add global mouse coordinates
let my = 0;

let lastHoverCheck = 0;
const HOVER_CHECK_INTERVAL = 100;

// ========================================== PLAYER STUFF
// ** MOVE TO SERVER AND GET INITIAL LOAD
// ** for now they are here
// ** variables, images to handle client side

// ============== PLAYER VARIABLES
let hoveredPlayer = null;
let baseWidth = 4.1; // Base width of player in yards
let baseHeight = 2.5; // Base height of player in yards

let homeEndZoneColor = "#7A0019"; // Home team end zone color
let homeTeamName = "REDSKINS"; // Home team name
let awayEndZoneColor = "#041E42"; // Away team end zone color
let awayTeamName = "DALLAS"; // Away team name

const logoImage = new Image();
logoImage.src = 'images/stadium-center.png'; // Center image for the field
// ============== PLAYER IMAGES
const homeImage = new Image();
homeImage.src = 'images/ef-g-saints.png';
const awayImage = new Image();
awayImage.src = 'images/ef-g-saints.png';
// ========================================= END PLAYER STUFF

let gameState = {
    homeTeam: { name: homeTeamName, score: 0, color: homeEndZoneColor },
    awayTeam: { name: awayTeamName, score: 0, color: awayEndZoneColor },
    homeTeamColor: '#f00',
    awayTeamColor: '#0051ba',
    qtr: 1,
    gameClock: clockSeconds,
    playClock: playClock,
    possession: null,
    isRunning: gameRunning,
    los: null,
    fdl: null,
    firstDownLine: null,
    gameStart: false,
    gameState: 'unknown',
    currentPlay: null,
    homeScore: 0,
    awayScore: 0,
    currentPlay: null,
};

// const scorebug = new Scorebug('scorebugCanvas', {
//     width: 720,
//     height: 60,
//     pixelsPerYard: pixelsPerYard
// });
// scorebug.update(gameState);

let gameStarted = false;
const LOAD_TIMEOUT = 1000; // 2 seconds

// =================== TIMER TO LET GAME LOAD
setTimeout(() => {
    gameStarted = true;
    console.log('Timer complete, starting game');
    render();
}, LOAD_TIMEOUT);


// ================================= DEFINE FIELD CANVAS
const fieldCanvas = document.createElement('canvas');
const fieldCtx = fieldCanvas.getContext('2d');
fieldCanvas.width = canvas.width;
fieldCanvas.height = canvas.height;
let fieldDirty = true; // Redraw field on zoom/pan change

// ====== PERFORMANCE VARIABLES
// Performance tracking
let bytesSent = 0;
let bytesReceived = 0;
let lastMessageBytes = 0; // Per-tick bytes in KB
let frameCount = 0;
let lastFrameTime = performance.now();
let renderTimes = [];
let fps = 0;

// =============================== SOUND INFO WILL GO HERE
let vibrateSound = false; // Flag to indicate if sound is playing

// ============================== CONVERSION OF YARDS TO PIXELS AND MORE
// ** IMPORTANT: This is the conversion of yards to pixels for the field size
// ** used throughout the game
function yardsToPixels(yards) {
    return yards * pixelsPerYard * zoom;
}
function pixelsToYards(pixels) {
    return pixels / (pixelsPerYard * zoom);
}
function formatClock(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `Clock: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================= MESSAGE SYSTEM
// MessageCanvas class to manage and render messages on a separate canvas
class MessageCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.messages = []; // Queue of { text, type, timeout }
        this.font = 'bold 30px Arial';
        this.padding = 10;
        this.duration = 2000; // 3 seconds
        this.styles = {
            success: { textColor: '#00FF00', bgColor: 'rgba(0, 100, 0, 0.75)' }, // Green for First Down
            warning: { textColor: '#FF0000', bgColor: 'rgba(100, 0, 0, 0.75)' }, // Red for Turnover
            info: { textColor: '#FFFFFF', bgColor: 'rgba(0, 0, 0, 0.75)' } // White for general
        };
        this.canvas.width = 720; // Match scorebug
        this.canvas.height = 100; // Enough for multiple messages
        this.canvas.style.display = 'none'; // Hidden initially
    }

    // Add a message to the queue
    addMessage(text, type = 'info') {
        this.messages.push({
            text: text,
            type: type,
            timeout: Date.now() + this.duration
        });
        this.canvas.style.display = 'block'; // Show canvas
        console.log(`Message added: ${text}, type: ${type}, queue:`, this.messages.map(m => m.text));
    }

    // Render messages at top center
    render() {
        if (!this.ctx) {
            console.error('MessageCanvas context not available');
            return;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear message canvas
        const now = Date.now();
        this.messages = this.messages.filter(msg => msg.timeout > now); // Remove expired
        if (this.messages.length === 0) return; // Skip if no messages
        //console.log('Rendering messages:', this.messages.map(m => m.text));
        this.ctx.save();
        this.ctx.font = this.font;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let y = 20; // Start at top of messageCanvas
        this.messages.forEach(msg => {
            const style = this.styles[msg.type] || this.styles.info;
            const metrics = this.ctx.measureText(msg.text);
            const textWidth = metrics.width;
            const textHeight = 30; // Approximate height for 30px font
            const boxWidth = textWidth + this.padding * 2;
            const boxHeight = textHeight + this.padding * 2;
            // Draw background
            this.ctx.fillStyle = style.bgColor;
            this.ctx.fillRect(this.canvas.width / 2 - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
            // Draw text
            this.ctx.fillStyle = style.textColor;
            this.ctx.fillText(msg.text, this.canvas.width / 2, y);
            y += boxHeight + 10; // Stack messages vertically
        });
        this.ctx.restore();
    }
}

const messageCanvas = new MessageCanvas('messageCanvas');
console.log('MessageCanvas initialized:', messageCanvas);

// ============================ END MESSAGE SYSTEM

//===========================================
// ============================ DEBUG OVERLAY
//==========================================
// DebugScreen class to manage overlay
class DebugScreen {
    constructor() {
        this.overlay = document.getElementById('debugOverlay');
        this.content = document.getElementById('debugContent');
        this.resetButton = document.getElementById('resetButton');
        this.toggleButton = document.getElementById('debugToggle');
        this.isVisible = false;

        // Toggle on 'D' key
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'd') {
                this.toggle();
            }
        });

        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggle());

        // Reset button
        this.resetButton.addEventListener('click', () => {
            ws.send(JSON.stringify({ type: 'reset' }));
            console.log('Reset game triggered');
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.overlay.style.display = this.isVisible ? 'block' : 'none';
        console.log(`Debug screen ${this.isVisible ? 'shown' : 'hidden'}`);
    }

    update(state, players) {
        if (!this.content) return;
        const debugText = `
Possession: ${state.possession || 'N/A'}
Home Side: ${(state.homeSide || 0).toFixed(2)} (${state.homeSide === 0 ? 'Right' : 'Left'})
Away Side: ${(state.awaySide || Math.PI).toFixed(2)} (${state.awaySide === 0 ? 'Right' : 'Left'})
Quarter: ${state.quarter || 1}
Game Clock: ${(state.gameClock || 600).toFixed(0)}s (${Math.floor(state.gameClock / 60)}:${(state.gameClock % 60).toFixed(0).padStart(2, '0')})
Play Clock: ${(state.playClock || 25).toFixed(0)}s
LOS: ${(state.los || 60)}
FDL: ${(state.firstDownLine || 70).toFixed(2)}
Home Score: ${state.homeScore || 0}
Away Score: ${state.awayScore || 0}
Down: ${state.down || 1}
Yards to Go: ${state.yardsToGo || 10}
Play State: ${state.playState || 'unknown'}
Game Running: ${state.gameRunning || false}
Current PLay : ${state.currentPlay || 'unknown'}    
Clock Running: ${state.clockRunning || false}
Play Clock Running: ${state.playClockRunning || false}
Game Started: ${state.gameStart || 'unknown'}
Home TD: ${state.homeTD || 'unknown'}
Away TD: ${state.awayTD || 'unknown'}
Ball Carrier: ${players.find(p => p.hb)?.pid || 'None'} (x=${players.find(p => p.hb)?.x?.toFixed(2) || 'N/A'}, y=${players.find(p => p.hb)?.y?.toFixed(2) || 'N/A'})
        `;
        this.content.textContent = debugText;
    }
}

// Initialize DebugScreen (after canvas setup)
//const gameCanvas = document.getElementById('gameCanvas');
//const ctx = gameCanvas.getContext('2d');
// const scorebugCanvas = document.getElementById('scorebugCanvas');
// const scorebug = new Scorebug('scorebugCanvas', {
//     width: 720,
//     height: 60,
//     pixelsPerYard: 1440 / 140
// });
//const messageCanvas = new MessageCanvas('messageCanvas');
const debugScreen = new DebugScreen();
console.log('DebugScreen initialized:', debugScreen);

// ============================ END DEBUG OVERLAY

// ================================SERVER STUFF
// =============================== WEBSOCKET - get message from server
ws.onmessage = (msg) => {
    lastMessageBytes = msg.data.length / 1024;
    bytesReceived += msg.data.length;
    try {
        const data = JSON.parse(msg.data);
        if (data.type === 'playerUpdate') {
            const player = players.find(p => p.pid === data.pid);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.h = data.h;
                player.d = data.d;
                player.dc = data.dc;
                player.hb = data.hb;
                //player.hb = data.hb;
                //console.log(`Received player update: ${data.pid}, x=${data.x}, y=${data.y}`);
            }
        } else if (data.type === 'clockUpdate') {
            clockSeconds = data.s !== undefined ? data.s : clockSeconds;
            playClock = data.p !== undefined ? data.p : playClock;
            gameRunning = data.r !== undefined ? data.r : gameRunning;
            // console.log(`Received clock update: s=${data.s}, p=${data.p}, r=${data.r}`);
            gameState.gameClock = clockSeconds;
            gameState.playClock = playClock;
            gameState.isRunning = gameRunning;
            scorebug.update(gameState);

            // ============================================= TACKLE EVENT
        } else if (data.type === 'tackle') {
            players = data.pl.filter(p => p && p.pid);
            console.log('Tackle event:', `${data.tacklerID} tackled ${data.tackledPlayerID}`);
            if (data.los !== undefined) {
                gameState.los = data.los;
                console.log(`Updated LOS: losYardLine=${data.los}`);
            }
            if (data.fdl !== undefined) {
                gameState.firstDownLine = data.fdl;
                console.log(`Updated first down: first down=${gameState.firstDownLine.toFixed(2)}`);
            }
            if (data.s !== undefined) {         // === UPDATE GAME CLOCK
                clockSeconds = data.s;
                gameState.gameClock = clockSeconds;
            }
            if (data.p !== undefined) {         // === UPDATE PLAY CLOCK
                playClock = data.p;
                gameState.playClock = playClock;
            }
            if (data.down !== undefined) {      // === UPDATE DOWN
                down = data.down;
                gameState.down = down;
                console.log(`Updated down: down=${gameState.down}`);
            }
            if (data.ytg !== undefined) { // === UPDATE YARDS TO GO
                yardsToGo = Math.round(data.ytg);
                gameState.yardsToGo = yardsToGo;
                console.log(`Updated yards to go: yardsToGo=${gameState.yardsToGo}`);
            }
            if (data.message) {
                messageCanvas.addMessage(data.message.text, data.message.type);
                console.log(`Processed message: ${data.message.text}, type: ${data.message.type}`);
            }
            if (data.currentPlay) {
                gameState.currentPlay = data.currentPlay;
                console.log(`Updated current play: currentPlay=${gameState.currentPlay}`);
            }
            if (data.r !== undefined) {         // === UPDATE GAME RUNNING
                gameRunning = data.r;
                console.log('Play stopped due to tackle');
                const ballCarrier = players.find(p => p.hb);
                if (ballCarrier) {
                    console.log(`Tackled at x=${ballCarrier.x.toFixed(2)}, y=${ballCarrier.y.toFixed(2)}`);
                    // Optional: Visualize tackle (e.g., flash player)
                }
            }
            scorebug.update(gameState);
            debugScreen.update(gameState, players); // Update debug screen
            if (gameStarted) render();

            // ================================================================= RESET EVENT
            // ** BROASCAST EVERYTHING
            //**
            // =============================================================================
        } else if (data.type === 'reset') {
            players = data.pl.filter(p => p && p.pid);
            console.log('Reset event');
            if (data.los !== undefined) {
                gameState.los = data.los;
                console.log(`Updated LOS: losYardLine=${gameState.los}`);
            }
            if (data.fdl !== undefined) {
                gameState.firstDownLine = data.fdl;
                console.log(`Updated first down: first down=${gameState.firstDownLine}`);
            }
            if (data.s !== undefined) {
                clockSeconds = data.s;
                gameState.gameClock = clockSeconds;
            }
            if (data.qtr !== undefined) {
                qtr = data.qtr;
                gameState.qtr = qtr;
                console.log(`Updated quarter: quarter=${gameState.qtr}`);
            }
            if (data.p !== undefined) {
                playClock = data.p;
                gameState.playClock = playClock;
            }
            if (data.r !== undefined) {
                gameRunning = data.r;
            }
            if (data.down !== undefined) {      // === UPDATE DOWN
                down = data.down;
                gameState.down = down;
                console.log(`Updated down: down=${gameState.down}`);
            }
            if (data.ytg !== undefined) { // === UPDATE YARDS TO GO
                yardsToGo = Math.round(data.ytg);
                gameState.yardsToGo = yardsToGo;
                console.log(`Updated yards to go: yardsToGo=${gameState.yardsToGo}`);
            }
            if (data.poss !== undefined) {
                gameState.possession = data.poss;
                console.log(`Updated possession: possession=${gameState.possession}`);
            }
            if (data.homeScore !== undefined) {
                gameState.homeTeam.score = data.homeScore;
                console.log(`Updated home score: homeScore=${gameState.homeTeam.score}`);
            }
            if (data.awayScore !== undefined) {
                gameState.awayTeam.score = data.awayScore;
                console.log(`Updated away score: awayScore=${gameState.awayTeam.score}`);
            }
            if (data.playState !== undefined) {
                gameState.playState = data.playState;
                if (gameState.playState === 'touchdown') {
                    tdCrowd.play(); // play crowd noise
                    gameState.currentPlay = 'end';
                }
                console.log(`Updated play state: playState=${gameState.playState}`);
            }
            if (data.currentPlay) {
                gameState.currentPlay = data.currentPlay;
                console.log(`Updated current play: currentPlay=${gameState.currentPlay}`);
            }
            if (data.homeTD !== undefined) {
                gameState.homeTD = data.homeTD;
                console.log(`homeTD=${gameState.homeTD}`);
            }
            if (data.awayTD !== undefined) {
                gameState.awayTD = data.awayTD;
                console.log(`awayTD=${gameState.awayTD}`);
            }
            if (data.gameStart !== 'unknown') {
                gameState.gameStart = data.gameStart;
                console.log(`>Game started: ${gameState.gameStart}`);
            }
            if (data.message) {
                messageCanvas.addMessage(data.message.text, data.message.type);
                console.log(`Processed message: ${data.message.text}, type: ${data.message.type}`);
            }
            scorebug.update(gameState);
            debugScreen.update(gameState, players); // Update debug screen
            //if (gameStarted) {
            fieldDirty = true; // Force redraw on reset
            render();
            //}
        } else {
            // console.log('Received full state:', data);
            // const {
            //     i: serverId,
            //     s: serverClock,
            //     p: serverPlayClock,
            //     r: serverRunning,
            //     pl: serverPlayers,
            //     qtr: serverQtr,
            //     down: serverDown,
            //     ytg: serverYardsToGo,
            //     poss: serverPossession,
            //     los: serverLos,
            //     fdl: serverFdl,
            //     homeScore: serverHomeScore,
            //     awayScore: serverAwayScore,
            //     playState: serverPlayState,
            //     homeTD: serverHomeTD,
            //     awayTD: serverAwayTD,
            //     gameStart: serverGameStart
            // } = data;
            // gameState.id = serverId !== undefined ? serverId : gameState.id;
            // gameState.gameRunning = serverRunning !== undefined ? serverRunning : gameState.gameRunning;
            // gameState.players = serverPlayers !== undefined ? serverPlayers : gameState.players;
            // gameState.gameClock = serverClock !== undefined ? serverClock : gameState.gameClock;
            // gameState.playClock = serverPlayClock !== undefined ? serverPlayClock : gameState.playClock;
            // gameState.qtr = serverQtr !== undefined ? serverQtr : gameState.qtr;
            // gameState.down = serverDown !== undefined ? serverDown : gameState.down;
            // gameState.yardsToGo = serverYardsToGo !== undefined ? Math.round(serverYardsToGo) : gameState.yardsToGo;
            // gameState.possession = serverPossession !== undefined ? serverPossession : gameState.possession;
            // gameState.los = serverLos !== undefined ? serverLos : gameState.los;
            // gameState.firstDownLine = serverFdl !== undefined ? serverFdl : gameState.firstDownLine;
            // gameState.homeTeam.score = serverHomeScore !== undefined ? serverHomeScore : gameState.homeTeam.score;
            // gameState.awayTeam.score = serverAwayScore !== undefined ? serverAwayScore : gameState.awayTeam.score;
            // gameState.playState = serverPlayState !== undefined ? serverPlayState : gameState.playState;
            // gameState.homeTD = serverHomeTD !== undefined ? serverHomeTD : gameState.homeTD;
            // gameState.awayTD = serverAwayTD !== undefined ? serverAwayTD : gameState.awayTD;
            // gameState.gameStart = serverGameStart !== undefined ? serverGameStart : gameState.gameStart;
            // // Update UI
            // scorebug.update(gameState);
            // debugScreen.update(gameState, gameState.players);
            // fieldDirty = true;
            // render();


            //== INITIAL
            const { s, p, r: serverRunning, pl: serverPlayers } = data;
            gameRunning = serverRunning !== undefined ? serverRunning : gameRunning;
            players = serverPlayers || players;
            clockSeconds = s !== undefined ? s : clockSeconds;
            playClock = p !== undefined ? p : playClock;
            //console.log('Received full state:');
            //console.log('>>> else Received full state:', JSON.stringify(data));
            //console.log(players.map(p => `${p.pid}: x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, h=${p.h.toFixed(2)}`));
            //== END INITIAL

            // ============================================ TOGGLE VIBRATE SOUND ON/OFF
            if (gameRunning && !vibrateSound) { // ========TOGGLE SOUND ON/OFF
                startVibratingSound();
                vibrateSound = true;
                gameState.currentPlay = 'running';
            } else if (!gameRunning && vibrateSound) {
                stopVibratingSound();
                vibrateSound = false;
            }
            // ============================================ END TOGGLE VIBRATE SOUND ON/OFF

        }
        if (gameStarted) render();

    } catch (error) {
        console.error('Error processing WebSocket message:', error, msg.data);
    }
};

// =================================== END WEBSOCKET - get message to server



// Wrap send to track bytes - send message to server
const originalSend = ws.send.bind(ws);
ws.send = (data) => {
    bytesSent += new TextEncoder().encode(JSON.stringify(data)).length;
    originalSend(data);
};

// ==================================== END SERVER STUFF
// *** END SERVER things
// ====================================================



// ================================================== EVENT LISTENERS AND KEYS
// ** keys for game switch, reste and more
//
// ===================================== GAME SWITCH
// ** this is where the action starts
// ** send toggle to server.js to get things going
// =================================================
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.playState !== 'gameover') {
        e.preventDefault();
        console.log('>>>Space key pressed');
        gameState.currentPlay = 'running';
        ws.send(JSON.stringify({ type: 'toggleGame', gameID }));
    } else if (e.code === 'KeyR' && gameState.currentPlay !== 'running') {
        ws.send(JSON.stringify({ type: 'reset', gameID }));
    } else if (e.code === 'KeyQ') {
        ws.send(JSON.stringify({ type: 'restart', gameID }));
    }
});
// ====================================== END GAME SWITCH

// ====================================== MOUSE HOVER PLAYER CHECK

function getMouseYardCoords(mx, my) {
    const canvasX = mx - canvas.width / 2;
    const canvasY = my - canvas.height / 2;
    const yardX = pixelsToYards(canvasX / zoom - panX / zoom + yardsToPixels(FIELD_WIDTH / 2));
    const yardY = FIELD_HEIGHT - pixelsToYards(canvasY / zoom - panY / zoom + yardsToPixels(FIELD_HEIGHT / 2));
    return { x: yardX, y: yardY };
}


function isMouseHoverPlayer(mx, my, p) {
    const { x: zoomedX, y: zoomedY } = getMouseYardCoords(mx, my);
    const px = yardsToPixels(p.x);
    const py = yardsToPixels(FIELD_HEIGHT - p.y) - yardsToPixels(baseHeight);
    const cosTheta = Math.cos(-p.h);
    const sinTheta = Math.sin(-p.h);
    const dx = yardsToPixels(zoomedX) - px;
    const dy = yardsToPixels(FIELD_HEIGHT - zoomedY) - yardsToPixels(baseHeight) - py;
    const localX = dx * cosTheta + dy * sinTheta;
    const localY = -dx * sinTheta + dy * cosTheta;
    const halfW = yardsToPixels(baseWidth) / 2;
    const halfH = yardsToPixels(baseHeight) / 2;
    const isHover = localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH;
    // if (isHover) {
    //     console.log(`Hover on ${p.i}: mx=${mx.toFixed(2)}, my=${my.toFixed(2)}, zoomedX=${zoomedX.toFixed(2)}, zoomedY=${zoomedY.toFixed(2)}, px=${px.toFixed(2)}, py=${py.toFixed(2)}, localX=${localX.toFixed(2)}, localY=${localY.toFixed(2)}`);
    // }
    return isHover;
}


// ===================================== Add ZOOM with mouse wheel
canvas.addEventListener('wheel', (e) => {
    if (isDraggingPlayer && selectedPlayer) {
        selectedPlayer.h += e.deltaY * 0.001;
        e.preventDefault(); // Prevent page scrolling while rotating
        ws.send(JSON.stringify({ // send to server to broadcast to all clients
            type: 'updatePosition',
            gameID,
            playerID: selectedPlayer.pid,
            x: selectedPlayer.x,
            y: selectedPlayer.y,
            h: selectedPlayer.h
        }));
    } else {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP; // Scroll down: zoom out, up: zoom in
        zoom = Math.min(Math.max(zoom + delta, ZOOM_MIN), ZOOM_MAX); // Clamp zoom
        fieldDirty = true;
    }
    render(); // Redraw with new zoom
});

// =============================================Add drag panning of FIELD
// ============================================= MOUSE DOWN
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    // Use hoveredPlayer.i if valid, otherwise check all players
    selectedPlayer = hoveredPlayer && isMouseHoverPlayer(mx, my, hoveredPlayer) ?
        players.find(p => p.pid === hoveredPlayer.pid) :
        players.find(p => isMouseHoverPlayer(mx, my, p));
    //console.log(`Selected player: ${selectedPlayer ? selectedPlayer.pid : 'none'}`);
    if (selectedPlayer && !gameRunning) {
        if (e.button === 2) {    // == right click

            lastMouseX = mx;
        } else {
            isDraggingPlayer = true;
            isRotatePlayer = true;
        }
    } else {
        isDraggingField = true;
        lastMouseX = mx;
        lastMouseY = my;
    }

    if ( e.button ===1) {
        zoom = 1;
        panX = 0;  
        panY = 0;
        fieldDirty = true;
        render();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    const now = performance.now();
    if (!gameRunning && now - lastHoverCheck >= HOVER_CHECK_INTERVAL) {
        hoveredPlayer = players.find(p => isMouseHoverPlayer(mx, my, p)) || null;
        //console.log(`Hovered player: ${hoveredPlayer ? hoveredPlayer.pid : 'none'}`);
        lastHoverCheck = now;
    }
    if (isAdjustingDial && selectedPlayer) {
        const dx = mx - lastMouseX;
        const dialChange = dx * 0.5;
        selectedPlayer.d = Math.max(0, Math.min(100, selectedPlayer.d + dialChange));
        ws.send(JSON.stringify({
            type: 'updateDial',
            gameID,
            playerID: selectedPlayer.i,
            dialValue: selectedPlayer.d
        }));
        lastMouseX = mx;
    } else if (isDraggingPlayer && selectedPlayer && gameState.currentPlay !== 'running') {
        const { x: yardX, y: yardY } = getMouseYardCoords(mx, my);
        //console.log(`Dragging player: ${selectedPlayer.pid} to (${yardX.toFixed(2)}, ${yardY.toFixed(2)})`);
        selectedPlayer.x = Math.max(3, Math.min(135, yardX));
        selectedPlayer.y = Math.max(3, Math.min(77, yardY));
        ws.send(JSON.stringify({ // send to server to broadcast to all clients
            type: 'updatePosition',
            gameID,
            playerID: selectedPlayer.pid,
            x: selectedPlayer.x,
            y: selectedPlayer.y,
            //h: selectedPlayer.h
        }));
    } else if (isDraggingField) {
        const dx = mx - lastMouseX;
        const dy = my - lastMouseY;
        panX += dx;
        panY += dy;
        lastMouseX = mx;
        lastMouseY = my;
        fieldDirty = true;
    }
    if (gameStarted) render();
});

canvas.addEventListener('mouseup', () => {
    isDraggingField = false;
    isDraggingPlayer = false;
    isAdjustingDial = false;
    selectedPlayer = null;
});

canvas.addEventListener('mouseleave', () => {
    isDraggingField = false;
    isDraggingPlayer = false;
    isAdjustingDial = false;
    selectedPlayer = null;
    hoveredPlayer = null;
    if (gameStarted) render();
});

// ********************
// ===================================================== END EVENT LISTENERS

// =============================================== DIAL FOR ADJUSTING PLAYER
// **** could go to seperate file??

function drawLargeDialOverlay(player) {
    ctx.save();
    ctx.translate(yardsToPixels(player.x), yardsToPixels(FIELD_HEIGHT - player.y));
    ctx.rotate(-player.h);

    let normalDialRadius = Math.min(yardsToPixels(baseWidth), yardsToPixels(baseHeight)) * 0.45;
    let largeDialRadius = normalDialRadius * 3;

    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, largeDialRadius, 0, Math.PI * 2);
    ctx.fillStyle = player.dc || 'yellow';
    ctx.fill();
    ctx.closePath();

    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.arc(0, 0, largeDialRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    let dialIndicatorAngle = ((player.d - 50) / 50) * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(largeDialRadius * Math.cos(dialIndicatorAngle), largeDialRadius * Math.sin(dialIndicatorAngle));
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    ctx.restore();
    ctx.globalAlpha = 1;
}
// =============================== END DIAL FOR ADJUSTING PLAYER

// ===================================================== START DRAWING EVERYTHING

// =======================================DRAW A FOOTBALL FIELD
function drawField() {
    //console.log('Drawing field... drawField()');
    fieldCtx.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
    fieldCtx.save();
    fieldCtx.translate(fieldCanvas.width / 2, fieldCanvas.height / 2);
    fieldCtx.scale(zoom, zoom);
    fieldCtx.translate(-yardsToPixels(FIELD_WIDTH / 2) + panX / zoom, -yardsToPixels(FIELD_HEIGHT / 2) + panY / zoom);

    // Draw entire canvas (border)
    fieldCtx.fillStyle = '#222';
    fieldCtx.fillRect(0, 0, yardsToPixels(FIELD_WIDTH), yardsToPixels(FIELD_HEIGHT));

    // Draw left end zone (x: 10-20, y: 8.5-71.5)
    fieldCtx.fillStyle = homeEndZoneColor;
    fieldCtx.fillRect(
        yardsToPixels(PLAYABLE_X_OFFSET),
        yardsToPixels(PLAYABLE_Y_OFFSET),
        yardsToPixels(10),
        yardsToPixels(PLAYABLE_HEIGHT)
    );

    // Draw main field (x: 20-120, y: 8.5-71.5)
    fieldCtx.fillStyle = '#228B22';
    fieldCtx.fillRect(
        yardsToPixels(PLAYABLE_X_OFFSET + 10),
        yardsToPixels(PLAYABLE_Y_OFFSET),
        yardsToPixels(100),
        yardsToPixels(PLAYABLE_HEIGHT)
    );

    // Draw right end zone (x: 120-130, y: 8.5-71.5)
    fieldCtx.fillStyle = awayEndZoneColor;
    fieldCtx.fillRect(
        yardsToPixels(PLAYABLE_X_OFFSET + 110),
        yardsToPixels(PLAYABLE_Y_OFFSET),
        yardsToPixels(10),
        yardsToPixels(PLAYABLE_HEIGHT)
    );

    // ================================ DRAW NAMES IN END ZONE
    // Draw team names in end zones
    fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    fieldCtx.font = `${yardsToPixels(8)}px ITC Machine`; // 8-yard text height
    fieldCtx.textAlign = 'center';
    fieldCtx.textBaseline = 'middle';
    // Home team (left end zone, x=15, y=40, rotated 90° counterclockwise)
    fieldCtx.save();
    fieldCtx.translate(yardsToPixels(PLAYABLE_X_OFFSET + 5), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT / 2));
    fieldCtx.rotate(-Math.PI / 2); // 90° counterclockwise
    fieldCtx.fillText(homeTeamName, 0, 0);
    fieldCtx.restore();
    // Away team (right end zone, x=125, y=40, rotated 270° counterclockwise)
    fieldCtx.save();
    fieldCtx.translate(yardsToPixels(PLAYABLE_X_OFFSET + PLAYABLE_WIDTH - 5), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT / 2));
    fieldCtx.rotate(Math.PI / 2); // 270° counterclockwise (90° clockwise)
    fieldCtx.fillText(awayTeamName, 0, 0);
    fieldCtx.restore();

    // Draw logo at center (x=70, y=40)
    if (logoImage.complete && logoImage.naturalWidth > 0) {
        fieldCtx.globalAlpha = 0.7;
        const logoWidth = yardsToPixels(20); // 20 yards wide
        const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth); // Maintain aspect ratio
        fieldCtx.drawImage(
            logoImage,
            yardsToPixels(PLAYABLE_X_OFFSET + PLAYABLE_WIDTH / 2 - 10), // Center at x=70
            yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT / 2 - logoHeight / (2 * pixelsPerYard) / zoom), // Center at y=40
            logoWidth,
            logoHeight
        );
        fieldCtx.globalAlpha = 1.0;
    }


    // ========================================================================= FIX
    //  FIX THIS  VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
    // ** FIX GET THE CORRECT FIELD DIMENSIONS
    // ** NEED to check exact field dimension and get everything right.
    // ** maybe a box around it to define

    // Draw box around playable field (0.5-yard width, inner edge on border)
    fieldCtx.strokeStyle = 'white';
    fieldCtx.lineWidth = yardsToPixels(1);
    fieldCtx.beginPath();
    fieldCtx.strokeRect(
        yardsToPixels(PLAYABLE_X_OFFSET - 0.5), // Inner edge at x=10
        yardsToPixels(PLAYABLE_Y_OFFSET - 0), // Inner edge at y=8.5
        yardsToPixels(PLAYABLE_WIDTH + 0.5), // Width to x=130.25
        yardsToPixels(PLAYABLE_HEIGHT + 0.5) // Height to y=71.75
    );
    fieldCtx.stroke();


    // draw field goals
    // ======================== left field goal
    fieldCtx.beginPath();
    fieldCtx.moveTo(yardsToPixels(PLAYABLE_X_OFFSET + 0), yardsToPixels(35));
    // fieldCtx.lineWidth = yardsToPixels(2); ==============work on shadow
    // fieldCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    // fieldCtx.lineTo(yardsToPixels(PLAYABLE_X_OFFSET + 0), yardsToPixels(45));
    fieldCtx.lineWidth = yardsToPixels(.3);
    fieldCtx.strokeStyle = 'yellow';
    fieldCtx.lineTo(yardsToPixels(PLAYABLE_X_OFFSET + 0), yardsToPixels(45));
    fieldCtx.stroke();
    // ======================== right field goal
    fieldCtx.beginPath();
    fieldCtx.moveTo(yardsToPixels(PLAYABLE_X_OFFSET + 120), yardsToPixels(35));
    // fieldCtx.lineWidth = yardsToPixels(2); ==============work on shadow
    // fieldCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    // fieldCtx.lineTo(yardsToPixels(PLAYABLE_X_OFFSET + 0), yardsToPixels(45));
    fieldCtx.lineWidth = yardsToPixels(.3);
    fieldCtx.strokeStyle = 'yellow';
    fieldCtx.lineTo(yardsToPixels(PLAYABLE_X_OFFSET + 120), yardsToPixels(45));
    fieldCtx.stroke();

    // Draw 5-yard lines (x: 10 to 130, every 5 yards)
    fieldCtx.strokeStyle = 'white';
    fieldCtx.lineWidth = yardsToPixels(0.1);
    fieldCtx.globalAlpha = 0.8;
    fieldCtx.beginPath();
    for (let x = PLAYABLE_X_OFFSET + 10; x <= PLAYABLE_X_OFFSET + PLAYABLE_WIDTH - 10; x += 5) {
        fieldCtx.moveTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET));
        fieldCtx.lineTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT));
    }
    fieldCtx.stroke();

    // Draw 1-yard hash ticks (every yard, top/bottom end lines)
    fieldCtx.lineWidth = yardsToPixels(0.1);
    fieldCtx.beginPath();
    for (let x = PLAYABLE_X_OFFSET + 10; x <= PLAYABLE_X_OFFSET + PLAYABLE_WIDTH - 10; x += 1) {
        // Top (y=8.5)
        fieldCtx.moveTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET));
        fieldCtx.lineTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + 1));
        fieldCtx.moveTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + 25));
        fieldCtx.lineTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + 26));
        // Bottom (y=71.5)
        fieldCtx.moveTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT - 25));
        fieldCtx.lineTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT - 26));
        fieldCtx.moveTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT - 1));
        fieldCtx.lineTo(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT));
    }
    fieldCtx.stroke();


    // Draw yardage numbers (10, 20, 30, 40, 50, 40, 30, 20, 10)
    fieldCtx.fillStyle = 'white';
    fieldCtx.font = `${yardsToPixels(3)}px Varsity Regular`;
    fieldCtx.textAlign = 'center';
    const numbers = [10, 20, 30, 40, 50, 40, 30, 20, 10];
    const xPositions = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
    for (let i = 0; i < numbers.length; i++) {
        const x = PLAYABLE_X_OFFSET + xPositions[i];
        // Top (y=28.5, 20 yards from top edge at y=8.5, rotated 180°)
        fieldCtx.save();
        fieldCtx.translate(yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + 10));
        fieldCtx.rotate(Math.PI); // Rotate 180° for top numbers
        fieldCtx.fillText(numbers[i], 0, 0);
        fieldCtx.restore();
        // Bottom (y=51.5, 20 yards from bottom edge at y=71.5, upright)
        fieldCtx.fillText(numbers[i], yardsToPixels(x), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT - 10));
    }
    fieldCtx.globalAlpha = 1.0;


    // ====== DRAW LOS AND OTHER MARKERS
    // ===DRAW LINE OF SCRIMMAGE LOS
    //console.log('gameState.los', gameState.los);
    if (gameState.los !== null) {
        fieldCtx.strokeStyle = "black";
        fieldCtx.globalAlpha = 0.7;
        fieldCtx.lineWidth = 3;
        fieldCtx.beginPath();
        fieldCtx.moveTo(yardsToPixels(gameState.los), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT));
        fieldCtx.lineTo(yardsToPixels(gameState.los), PLAYABLE_HEIGHT);
        fieldCtx.stroke();
    }
    // Draw first-down line if set
    if (gameState.firstDownLine !== null) {
        fieldCtx.strokeStyle = "yellow";
        fieldCtx.globalAlpha = 0.5;
        fieldCtx.lineWidth = 3;
        fieldCtx.beginPath();
        fieldCtx.moveTo(yardsToPixels(gameState.firstDownLine), yardsToPixels(PLAYABLE_Y_OFFSET + PLAYABLE_HEIGHT));
        fieldCtx.lineTo(yardsToPixels(gameState.firstDownLine), PLAYABLE_HEIGHT);
        fieldCtx.stroke();
    }

    fieldCtx.restore();
}

// ======================================= END DRAW A FOOTBALL FIELD

// =============== PLayer bases
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
}

function renderRunning() {
    const startTime = performance.now();
    if (fieldDirty) {
        drawField();
        fieldDirty = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fieldCanvas, 0, 0);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-yardsToPixels(FIELD_WIDTH / 2) + panX / zoom, -yardsToPixels(FIELD_HEIGHT / 2) + panY / zoom);
    players.forEach(p => {
        //=========== draw base
        ctx.save();
        ctx.translate(yardsToPixels(p.x), yardsToPixels(FIELD_HEIGHT - p.y));
        ctx.rotate(-p.h);
        ctx.fillStyle = p.pid.includes('-h-') ? 'blue' : 'red';
        ctx.lineWidth = yardsToPixels(0.1);
        ctx.strokeRect(-yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        const image = p.pid.includes('-h-') ? homeImage : awayImage;
        if (image.complete) {
            ctx.drawImage(image, -yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        }
        // ctx.fillStyle = 'white'; // direction dot for debugging
        // ctx.beginPath();
        // ctx.arc(yardsToPixels(3 / 2), 0, yardsToPixels(0.2), 0, 2 * Math.PI);
        // ctx.fill();
        // ctx.fillStyle = 'green';
        // ctx.beginPath();
        // ctx.arc(0, 0, yardsToPixels(0.2), 0, 2 * Math.PI);
        // ctx.fill();
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = yardsToPixels(0.1);
        ctx.beginPath();
        const steeringAngle = ((p.dv - 50) / 50) * 0.2;
        ctx.arc(0, 0, yardsToPixels(0.5), -steeringAngle - Math.PI / 4, -steeringAngle + Math.PI / 4);
        ctx.stroke();
        ctx.restore();
    });

    const endTime = performance.now();
    renderTimes.push(endTime - startTime);
    if (renderTimes.length > 60) renderTimes.shift();
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
        fps = frameCount * 1000 / (now - lastFrameTime);
        frameCount = 0;
        lastFrameTime = now;
    }

    // ctx.fillStyle = 'white';
    // ctx.font = `${yardsToPixels(baseHeight)}px Arial`;
    // ctx.fillText(formatClock(clockSeconds), yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 13));
    // ctx.fillText(formatClock(playClock), yardsToPixels(25), yardsToPixels(FIELD_HEIGHT - 13));
    // ctx.fillText(`FPS: ${fps.toFixed(1)} Render: ${avgRenderTime.toFixed(2)}ms Data: ${(bytesSent / 1024).toFixed(2)}KB sent, ${(bytesReceived / 1024).toFixed(2)}KB received, ${lastMessageBytes.toFixed(2)}KB/tick`, yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 9));
    // ctx.fillText(`Game: ${gameRunning ? 'Running' : 'Paused'} Zoom: ${zoom.toFixed(1)}`, yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 5));
    ctx.restore();
}

function renderStopped() {
    //console.log('Rendering stopped... renderStopped()');
    const startTime = performance.now();
    if (fieldDirty) {
        drawField();
        fieldDirty = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fieldCanvas, 0, 0);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-yardsToPixels(FIELD_WIDTH / 2) + panX / zoom, -yardsToPixels(FIELD_HEIGHT / 2) + panY / zoom);

    players.forEach(p => {
        ctx.save();
        ctx.translate(yardsToPixels(p.x), yardsToPixels(FIELD_HEIGHT - p.y));
        ctx.rotate(-p.h);
        //ctx.fillStyle = p.pid.includes('-h-') ? 'red' : 'blue';
        ctx.fillStyle = p === selectedPlayer && isDraggingPlayer ? 'yellow' : (p.pid.includes('-h-') ? gameState.homeTeamColor : gameState.awayTeamColor);
        //ctx.fillStyle = p.pid === isDraggingPlayer ? "yellow" : this.baseColor;
        ctx.fillRect(-yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        // drawRoundedRect(
        //     ctx,
        //     -yardsToPixels(p.baseWidth) / 2,
        //     -yardsToPixels(p.baseHeight) / 2,
        //     yardsToPixels(p.baseWidth),
        //     yardsToPixels(p.baseHeight),
        //     yardsToPixels(0.5) // Radius in yards, converted to pixels
        // );
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = yardsToPixels(0.2);
        // strokeRoundedRect(
        //     ctx,
        //     -yardsToPixels(p.baseWidth) / 2,
        //     -yardsToPixels(p.baseHeight) / 2,
        //     yardsToPixels(p.baseWidth),
        //     yardsToPixels(p.baseHeight),
        //     yardsToPixels(0.5)
        // );
        ctx.strokeRect(-yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        if (p === hoveredPlayer) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = yardsToPixels(0.2);
            ctx.strokeRect(-yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        }
        const image = p.pid.includes('-h-') ? homeImage : awayImage;
        if (image.complete) {
            ctx.drawImage(image, -yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        }
        if (p.hb) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(yardsToPixels(0), yardsToPixels(0), yardsToPixels(0.5), 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; // highlight with 50% opacity
            ctx.lineWidth = 3;
            ctx.strokeRect(-yardsToPixels(baseWidth) / 2, -yardsToPixels(baseHeight) / 2, yardsToPixels(baseWidth), yardsToPixels(baseHeight));
        }
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = yardsToPixels(0.1);
        ctx.beginPath();
        const steeringAngle = ((p.dv - 50) / 50) * 0.2;
        ctx.arc(0, 0, yardsToPixels(0.5), -steeringAngle - Math.PI / 4, -steeringAngle + Math.PI / 4);
        ctx.stroke();
        ctx.restore();

        // Add x, y coordinates above base
        // ctx.fillStyle = 'white';
        // ctx.font = `${yardsToPixels(1)}px Arial`;
        // ctx.textAlign = 'center';
        // ctx.fillText(`(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`, yardsToPixels(p.x), yardsToPixels(FIELD_HEIGHT - p.y) - yardsToPixels(baseWidth));
        // ctx.textAlign = 'left';
    });

    const endTime = performance.now();
    renderTimes.push(endTime - startTime);
    if (renderTimes.length > 60) renderTimes.shift();
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
        fps = frameCount * 1000 / (now - lastFrameTime);
        frameCount = 0;
        lastFrameTime = now;
    }

    // Convert mouse coordinates to yards
    //const canvasX = mx - canvas.width / 2;
    //const canvasY = my - canvas.height / 2;
    const yardX = pixelsToYards(mx);
    const yardY = pixelsToYards(my);

    // ctx.fillStyle = 'white';
    // ctx.font = `${yardsToPixels(baseHeight)}px Arial`;
    // ctx.fillText(formatClock(gameState.gameClock), yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 13));
    // ctx.fillText(`FPS: ${fps.toFixed(1)} Render: ${avgRenderTime.toFixed(2)}ms Data: ${(bytesSent / 1024).toFixed(2)}KB sent, ${(bytesReceived / 1024).toFixed(2)}KB received, ${lastMessageBytes.toFixed(2)}KB/tick`, yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 9));
    // ctx.fillText(`Game: ${gameRunning ? 'Running' : 'Paused'} Zoom: ${zoom.toFixed(2)} Mouse: (${mx.toFixed(0)}, ${my.toFixed(0)}) Yards: (${yardX.toFixed(2)}, ${yardY.toFixed(2)})`, yardsToPixels(5), yardsToPixels(FIELD_HEIGHT - 5));
    ctx.restore();
}

// =============================== RENDER FOR GAME RUNNING OR GAME STOPPED
function render() {
    if (gameRunning) {
        renderStopped();
    } else {
        renderStopped();
        messageCanvas.render();
    }
}

// Merge with your zoom, drag/rotate logic