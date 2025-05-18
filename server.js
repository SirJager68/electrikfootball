// ================================== server.js
console.log('****************************************')
console.log('********* ELECTRIK FOOTBALL ************')
console.log('********* SERVER.JS START   ************')
console.log('****************************************')
console.log('** started ', new Date().toLocaleString());
console.log('****************************************')
console.log('server.js loading....');

// ================= SETUP WEBSOCKET USING type commonjs from package-json
// ================= SERVER SETUP
// Setup Express and WebSocket
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { SpatialGrid, detectAndResolveCollisionRectangles, getRectangleVertices, tackle } = require('./public/js/physics');
const plays = require('./public/js/plays.js');

// Create Express app
const app = express();
app.use(express.static('public')); // Serve static files
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/game.html', (req, res) => res.sendFile(__dirname + '/game.html')); // Serve game.html

// Create HTTP server for Express
const server = http.createServer(app);

// Setup WebSocket server
const wss = process.env.NODE_ENV === 'production'
    ? new WebSocketServer({ server }) // Heroku: Share port with Express
    : new WebSocketServer({ port: 8080 }); // Local: WebSocket on 8080

const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT : 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
// ======================================= END SERVER SEUP

// ======================================= CREATE GAME ID
// ** create id based on date
function generateGameId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // e.g., "25" for 2025
    const month = String(now.getMonth() + 1).padStart(2, '0'); // e.g., "05" for May
    const day = String(now.getDate()).slice(-2).padStart(2, '0'); // e.g., "15" for 15
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let random = '';
    for (let i = 0; i < 3; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const id = `${year}${month}${random}`; // e.g., "250515"
    console.log('****************************************')
    console.log(`Generated game ID: ${id}`);
    console.log('****************************************')
    return id;
}

// ======================================= GET THE TEAMS PLAYBOOKS
// ** offense and def. maybe come from database
// ===================== GET HOME PLAYBOOK
let offensivePlaysHome = {};
let defensivePlaysHome = {};
try {
    const playsModuleHome = require('./public/js/playbookHome.js');
    if (playsModuleHome) {
        offensivePlaysHome = playsModuleHome.offensivePlays;
        defensivePlaysHome = playsModuleHome.defensivePlays;
        console.log('Successfully imported offensivePlays Home Team:', Object.keys(offensivePlaysHome));
    } else {
        console.error('plays.js does not export offensivePlays');
    }
} catch (error) {
    console.error('Failed to import plays.js:', error.message);
    console.error('Ensure plays.js exists at C:\\Users\\jager\\Documents\\CODE\\HAL9001\\electrikfootball\\plays.js');
}
// ======================== GET AWAY PLAYBOOK
let offensivePlaysAway = {};
let defensivePlaysAway = {};
try {
    const playsModuleAway = require('./public/js/playbookAway.js');
    if (playsModuleAway) {
        offensivePlaysAway = playsModuleAway.offensivePlays;
        defensivePlaysAway = playsModuleAway.defensivePlays;
        console.log('Successfully imported offensivePlays Away Team:', Object.keys(playsModuleAway));
    } else {
        console.error('plays.js does not export offensivePlays');
    }
} catch (error) {
    console.error('Failed to import plays.js:', error.message);
    console.error('Ensure plays.js exists at C:\\Users\\jager\\Documents\\CODE\\HAL9001\\electrikfootball\\plays.js');
}


// Field constants (mirroring main.js)
const FIELD_WIDTH = 140;
const FIELD_HEIGHT = 80; // 53.33 yards
const PLAYABLE_WIDTH = 120;
const midlineY = FIELD_HEIGHT / 2; // 70 yards
const PLAYABLE_X_OFFSET = 10; // Left boundary
const PLAYABLE_Y_OFFSET = 8.5; // Bottom boundary
const FIELD_X_OFFSET = 20; // Left boundary

// ===Define static LOS
let losYardLine = 60;
let firstDownYardLine = 70; // 10 yards from LOS
let message = null; // Message to broadcast
let rightEndZone = 120; // Right end zone
let leftEndZone = 20; // Left end zone
let isTouchDown = false; // Flag for touchdown detection
let touchdownDetected = false; // Flag for touchdown detection
let clockDuration = 20;
let timeExpired = false; // Flag for time expired

// ======================== GAME STATE
// ** onitial game state setup
const initialGameState = {
    id: generateGameId(),
    clock: { s: clockDuration },
    qtr: 1,
    playclock: 45,
    down: 1,
    ball: null,
    losYardLine: 85,
    firstDownYardLine: 70,
    yardsToGo: 10,
    gameRunning: false,
    clockRunning: false,
    playClockRunning: false,
    playState: 'kickoff', // normal, kickoff, punt
    currentPlay: null,
    clients: new Set(),
    possession: 'home', // 'home' or 'away'
    offenseDirection: 'right', // initial offensedirection
    homeTeamName: 'REDSKINS',
    awayTeamName: 'DALLAS',
    homeSide: 0, // home team side going right
    awaySide: Math.PI, // away team side going left
    homeTD: rightEndZone,
    awayTD: leftEndZone,
    losDirection: 1, // 1 for right, -1 for left
    homeScore: 0,
    awayScore: 0,
    gameStart: false,
};
// ** id will be replaced with generated gameid from nanoId
// ** clock will be setup in a setup screen
const game = { ...initialGameState, clients: new Set() };
console.log(`Game initialized with ID: ${game.id}`);

// ======================================================= GET ROSTERS
// ** work from here to build
const homeTeam = require('./public/js/homeTeam.js');
const awayTeam = require('./public/js/awayTeam.js');
const { time } = require('console');
// =========================================== GET PLAYBOOKS
// Function to select plays based on possession
function selectPlays(possession) {
    let playHome, playAway;
    if (possession === 'home') {
        if (game.playState === 'kickoff') {
            playHome = offensivePlaysHome["Kickoff Return"] || hardcodedFormation;
            playAway = defensivePlaysAway["Kickoff"] || hardcodedFormation;
        } else {
            playHome = offensivePlaysHome["Red - Shotgun"] || hardcodedFormation;
            playAway = defensivePlaysAway["4-3-Standard"] || hardcodedFormation;
        }
        console.log(' playbook - home is on the offense');
    } else {
        if (game.playState === 'kickoff') {
            playHome = defensivePlaysHome["Kickoff"] || hardcodedFormation;
            playAway = offensivePlaysAway["Kickoff Return"] || hardcodedFormation;
        } else {
            playHome = defensivePlaysHome["4-3-Standard"] || hardcodedFormation;
            playAway = offensivePlaysAway["I-Formation"] || hardcodedFormation;
        }
        console.log('plays' + playHome)
    }

    // figure out direction and heading of teams based on possession
    if (game.possession === 'home' && game.homeSide === 0) {
        game.losDirection = 1; // Home team is on the left going right
        game.homeSide = 0; //swap heading
        game.awaySide = Math.PI;
        game.homeTD = rightEndZone;
        game.awayTD = leftEndZone;
    } else if (game.possession === 'away' && game.homeSide === 0) {
        game.losDirection = -1; // Away team is on right going left
        game.homeSide = 0;
        game.awaySide = Math.PI;
        game.homeTD = rightEndZone;
        game.awayTD = leftEndZone;
    } else if (game.possession === 'home' && game.homeSide === Math.PI) {
        game.losDirection = -1; // Home team is on the right
        game.homeSide = Math.PI;
        game.awaySide = 0;
        game.homeTD = leftEndZone;
        game.awayTD = rightEndZone;
    } else if (game.possession === 'away' && game.homeSide === Math.PI) {
        game.losDirection = 1; // Home Team right Away team is on the left
        game.homeSide = Math.PI;
        game.awaySide = 0;
        game.homeTD = leftEndZone;
        game.awayTD = rightEndZone;
        console.log('losDirection', game.losDirection);
    }
    console.log('>>> 🏈 Home Play', playHome);
    console.log('>>> 🏈 Away Play', playAway);
    return { playHome, playAway };
}

// =========================================================== CREATE PLAYERS

// === little function to simulate putting players on field
// ** players would not alwasy be exactly 0 or 180 
function randomHeadingOffset() {
    return (Math.random() * 0.1) - 0.05; // Random value in [-0.05, 0.05]
}

// ====================================== SET PLAYERS ON THE FIELD
// ** get players setup from playbook and set them based on losYardLine
// Initialize players
function generatePlayers(losYardLine, playHome, playAway) {
    return [
        // ===============================================Home team (11 players)
        ...Array.from({ length: 11 }, (_, i) => {
            const id = String(i + 1).padStart(2, '0');
            const playPosH = playHome[id];
            if (!playPosH) {
                console.warn(`No play position found for playerID: abcdef-h-${id}, using default`);
            }
            // Determine if home team is offense or defense
            const isHomeOffense = game.possession === 'home';
            const xSign = game.losDirection; // Offense: negative x, Defense: positive x
            const headingBase = game.homeSide; // going right (0), going left (π)
            // Convert relative to absolute coordinates
            const x = playPosH ? Math.max(10, Math.min(130, game.losYardLine + xSign * playPosH.x)) : 55;
            const y = playPosH ? Math.max(8.5, Math.min(71.5, midlineY + playPosH.y * (PLAYABLE_WIDTH / 360))) : 20 + i * 4;
            return {
                pid: `${game.id}-h-${id}`,
                name: homeTeam.roster[i],
                x: x,
                y: y,
                heading: headingBase + randomHeadingOffset(),
                vx: 0,
                vy: 0,
                baseWidth: 4.1,
                baseHeight: 2.5,
                mass: 1 + Math.random() * 0.3,
                dialValue: Math.random() * 100,
                speed: 10 + Math.random() * 0.2,
                hb: id === '06' ? (game.possession === 'home') : (playPosH.hb || false),
            };
        }),

        // =====================================================Away team (11 players)
        ...Array.from({ length: 11 }, (_, i) => {
            const id = String(i + 1).padStart(2, '0');
            const playPosHA = playAway[id];
            if (!playPosHA) {
                console.warn(`No play position found for away playerID: abcdef-a-${id}, using default`);
            }
            // Determine if away team is offense or defense
            const isAwayOffense = game.possession === 'away';
            //const xSign = isAwayOffense ? -1 : 1; // Offense: negative x, Defense: positive x
            const xSign = game.losDirection; // Offense: negative x, Defense: positive x
            const headingBase = game.awaySide; // Offense: right (0), Defense: left (π)
            // Convert relative to absolute coordinates
            const x = playPosHA ? Math.max(10, Math.min(130, game.losYardLine + xSign * playPosHA.x)) : 65;
            const y = playPosHA ? Math.max(8.5, Math.min(71.5, midlineY + playPosHA.y * (PLAYABLE_WIDTH / 360))) : 20 + i * 4;
            return {
                pid: `${game.id}-a-${id}`,
                name: isAwayOffense ? awayTeam.rosterOffense[i] : awayTeam.rosterDefense[i],
                x: x,
                y: y,
                heading: headingBase + randomHeadingOffset(),
                vx: 0,
                vy: 0,
                baseWidth: 4.1,
                baseHeight: 2.5,
                mass: 1 + Math.random() * 0.2,
                dialValue: Math.random() * 100,
                speed: 10 + Math.random() * 0.2,
                hb: id === '06' ? (game.possession === 'away') : (playPosHA.hb || false),
            };
        })
    ];
}

const initialPlays = selectPlays(game.possession);
// Initialize players
//const initialPlayers = generatePlayers(losYardLine);
const initialPlayers = generatePlayers(losYardLine, initialPlays.playHome, initialPlays.playAway);
// Complete game initialization
game.players = initialPlayers.map(p => ({ ...p }));

// =========================================================== END ADD PLAYERS TO FIELD



const grid = new SpatialGrid(20, 140, 80);
// =============================================== WEBSOCKET
wss.on('connection', (ws) => {
    game.clients.add(ws);
    console.log('>>>New client connected');
    game.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'playerConnection',
                message: { text: "Player Connected", type: "info" }
            }));
        }
    });
    const state = {
        i: game.id,
        s: Number((game.clock.s || initialGameState.clock.s).toFixed(2)),
        p: Number((game.playclock || initialGameState.playclock).toFixed(1)),
        r: game.gameRunning,
        los: game.losYardLine,
        fdl: game.firstDownYardLine,
        pl: game.players,
        qtr: game.qtr,
        down: game.down,
        ytg: Number(game.yardsToGo.toFixed(2)),
        poss: game.possession,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        playState: game.playState,
        homeTD: game.homeTD,
        awayTD: game.awayTD,
        gameStart: game.gameStart,
        message: message,
    };
    ws.send(JSON.stringify(state));
    console.log('Sent initial state to new client:', state);
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        // ========================================== GAME SWITCH ON/OFF BROADCAST
        if (data.type === 'toggleGame') {
            if (!game.gameStart) { game.gameStart = true; } // START THE GAME
            game.gameRunning = !game.gameRunning;
            game.currentPlay = 'running';
            broadcastState(game);
            if (game.gameRunning) {
                game.clockRunning = true;
                game.playclock = 25; // Reset play clock to 25 seconds
                game.playClockRunning = false;
            } else {
                game.clockRunning = false;
            }
        } else if (data.type === 'reset') {
            // ====== RESET THE PLAYERS
            const plays = selectPlays(game.possession);
            //game.players = generatePlayers(losYardLine).map(p => ({ ...p }));
            game.players = generatePlayers(losYardLine, plays.playHome, plays.playAway).map(p => ({ ...p }));
            //game.clock = { s: 600 }; // Reset to 10:00
            //game.playclock = 25;
            game.gameRunning = false;
            //game.losYardLine = data.los; // Reset LOS to 60 yards
            broadcastReset(game, { text: "Play Reset", type: "info" });
        } else if (data.type === 'restart') {
            restartGame(); 
            broadcastReset(game, { text: "Game Restarted", type: "info" });        
        } else if (data.type === 'updatePosition') {
            const playerId = data.pid || data.playerID;
            const player = game.players.find(p => p.pid === playerId);
            if (player && !game.running) {
                player.x = Math.max(3, Math.min(137, data.x));
                player.y = Math.max(3, Math.min(80, data.y));
                if (data.h !== undefined) {
                    // Normalize heading to [0, 2π)
                    player.heading = ((data.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                }
                broadcastPlayerUpdate(player);
                //console.log(`Updated position: ${playerId}, x=${data.x}, y=${data.y}`);
            }
        }
    });
    ws.on('close', () => game.clients.delete(ws));
});

// ================================================== END WEBSOCKET

// ================================================== TACKLE FUNCTION
// ** handle all the tackle function, reset los, first down, togo calculation etc
// ** beoadcast to players with broadcastTackle 
function tackleMade(tackledPlayerID, tacklerID,frontEdgeX) {
    console.log('>>> TACKLE OR OUT OF');
    const tackledPlayer = game.players.find(p => p.pid === tackledPlayerID);
    const tackler = tacklerID !== 'OFB' ? game.players.find(p => p.pid === tacklerID) : null;
    message = { text: `Tackle Made by ${tackler?.name || tacklerID} on ${tackledPlayer?.name || tackledPlayerID}` , type: "success" };
    // Update LOS
    game.losYardLine = Math.max(10, Math.min(130, frontEdgeX));
    console.log(`New LOS: losYardLine=${game.losYardLine.toFixed(2)} and firstDownYardLine=${firstDownYardLine.toFixed(2)}`);
    // Stop the play
    game.gameRunning = false;
    game.clockRunning = true;
    game.playClockRunning = true;
    game.currentPlay = 'end';
    // Zero out all velocities
    game.players.forEach(p => {
        p.vx = 0;
        p.vy = 0;
    });
    // ========================== CHECK FOR FIRST DOWN and KICKOFF AFTER TACKLE
    // ** if playState set to kickoff it will run through kickoff routine
    // ** otherwise it will look at down as well as turnover on dows.
    // ========================================================================
    if (game.playState === 'kickoff') {
        game.clockRunning = false; // Stop the clock
        game.playClockRunning = true; // Stop the play clock
        game.down = 1; // Reset down
        game.yardsToGo = 10; // Reset yards to go
        game.firstDownYardLine = game.losYardLine + (10 * game.losDirection); // Move first down marker
        message = { text: "Kickoff Return", type: "info" };
        game.playState = 'normal'; // Reset play state
    } else {
        if ((game.losYardLine > game.firstDownYardLine && game.losDirection === 1) ||
            (game.losYardLine < game.firstDownYardLine && game.losDirection === -1)) {
            game.down = 1; // Reset down
            game.yardsToGo = 10; // Reset yards to go
            game.firstDownYardLine = game.losYardLine + (10 * game.losDirection); // Move first down marker
            message = { text: "First Down ", type: "success" };
            console.log(`First down! New first down line: ${game.firstDownYardLine}`);
        } else {
            down = game.down += 1; // Increment down
            if (game.losDirection === 1) {
                game.yardsToGo = game.firstDownYardLine - game.losYardLine;
            } else {
                game.yardsToGo = game.losYardLine - game.firstDownYardLine
            }
            console.log(`Down: ${game.down}, Yards to go: ${game.yardsToGo}`);
            // ========================= 4TH - TURNOVER ON DOWNS
            if (game.down > 4) {
                game.down = 1; // Reset down
                game.yardsToGo = 10; // Reset yards to go
                game.firstDownYardLine = game.losYardLine + (10 * game.losDirection * -1); // Move first down marker
                game.possession = game.possession === 'home' ? 'away' : 'home'; // swap possession
                // Update ball carrier
                game.players.forEach(p => {
                    p.hb = false; // Clear existing ball carrier
                    if (game.possession === 'home' && p.pid === 'teamyz-h-06') {
                        p.hb = true; // Home QB
                    } else if (game.possession === 'away' && p.pid === 'abcdef-a-06') {
                        p.hb = true; // Away QB
                    }
                    console.log(`New ball carrier: ${p.pid}, hb=${p.hb}`);
                });
                // Reselect plays based on new possession
                game.playState = 'normal'; // Reset play state
                const plays = selectPlays(game.possession);
                //game.players = generatePlayers(losYardLine, plays.playHome, plays.playAway).map(p => ({ ...p }));
                message = { text: "Turnover on Downs", type: "warning" };
                console.log(`Turnover on downs! New possession: ${game.possession}`);
            }
        }
    }

    // Broadcast the updated (stopped) state so clients see the play end
    broadcastTackle(game, tackledPlayerID, tacklerID, losYardLine, firstDownYardLine, game.down, game.yardsToGo, message);
}
// ==================================================== END TACKLE FUNCTION

// =================================================== GAME LOOP
// ** 60 FPS
// ** lets play football
const TICK_RATE = 60;
const CLOCK_UPDATE_INTERVAL = 100; // 100ms = 0.1s

setInterval(() => { // ============== gamerunning loop
    if (game.gameRunning) {
        updatePhysics(game);
        broadcastState(game);
    }
}, 1000 / TICK_RATE);
// =================================================== END GAME LOOP

// =================================================== THE BIG CLOCK
setInterval(() => { // ============== handling the clock
    if (game.clockRunning) {
        broadcastClockUpdate(game);
        if (game.clock.s <= 0 && !game.gameRunning) {
            game.clockRunning.s = 0;
            clockLogic();
        }
    }
    if (game.playClockRunning) {
        game.playclock = Math.max(0, game.playclock - 1 / (CLOCK_UPDATE_INTERVAL / 10));
    }
}, CLOCK_UPDATE_INTERVAL);

// =================================================== CLOCK LOGIC
// ** handle the clock logic, qtr, half time, game over
function clockLogic() {
    console.log('>>> clockLogic EVENT');
    //clockLogic = true;
    game.clockRunning = false;
    game.playClockRunning = false;
    game.qtr = Math.min(5, game.qtr + 1); // Increment qtr, cap at 4
    game.clock.s = clockDuration; // 10 minutes
    game.playclock = 25;
    if (game.qtr === 2) {
        let message = { text: `QTR 2`, type: 'info' };
        game.homeSide = game.homeSide === 0 ? Math.PI : 0; // swap heading
        game.awaySide = game.awaySide === 0 ? Math.PI : 0; // swap heading
        if (game.playState === 'touchdown') {
            if (game.losYardLine === 85) {
                game.losYardLine = 55; // Reset LOS to 40 yards
            } else if (game.losYardLine = 55) {
                game.losYardLine = 85; // Reset LOS to 100 yards       
            }
            return;
        } else {
        game.losYardLine = Math.max(10, Math.min(130, 140 - game.losYardLine));
        // game.homeSide = game.homeSide === 0 ? Math.PI : 0; // swap heading
        // game.awaySide = game.awaySide === 0 ? Math.PI : 0; // swap heading
        game.firstDownYardLine = game.losYardLine - (game.yardsToGo);
        }
    } else if (game.qtr === 3) {
        let message = { text: `HALFTIME - QTR 3`, type: 'info' };
        game.down = 1;
        game.yardsToGo = 10; // Reset yards to go
        game.losYardLine = 55; // Reset LOS to 80 yards
        game.firstDownYardLine = game.losYardLine + (10 * game.losDirection); // Move first down marker
        game.homeSide = 0; // swap heading
        game.awaySide = Math.PI; // swap heading
        game.possession = 'away'; // swap possession
        game.playState = 'kickoff'; // Set play state to kickoff
    } else if (game.qtr === 4) {
        let message = { text: `QTR 4`, type: 'info' };
        game.losYardLine = Math.max(10, Math.min(130, 140 - game.losYardLine));
        game.homeSide = game.homeSide === 0 ? Math.PI : 0; // swap heading
        game.awaySide = game.awaySide === 0 ? Math.PI : 0; // swap heading
        game.firstDownYardLine = game.losYardLine + (game.yardsToGo);
    } else if (game.qtr > 4) {
        game.qtr = "0";
        gameover();
    }
    // game.clock.s = clockDuration; // 10 minutes
    // game.playclock = 25;
    let message = { text: `qtr ${game.qtr} Begins`, type: 'info' };
    const plays = selectPlays(game.possession);
    game.players = generatePlayers(losYardLine, plays.playHome, plays.playAway, game.homeSide, game.awaySide, game.losDirection, game.losYardLine).map(p => ({ ...p }));
    broadcastReset(game, message, firstDownYardLine, game.down, game.yardsToGo, losYardLine, game.possession);
}

function gameover() {
    game.gameRunning = false;
    game.playState = 'gameover';
    let message = { text: `GAME OVER`, type: 'info' };
    broadcastReset(game, message);
}

// Reset game state to initial values
function restartGame() {
    // Preserve clients to maintain WebSocket connections
    console.log('>>>>>>Game Restart Key - Q');
    game.playState = 'kickoff';
    const { clients } = game;
    Object.assign(game, {
        ...initialGameState,
        id: generateGameId(), // New ID for reset
        clients: clients,
        clock: { ...initialGameState.clock } // Keep existing connections
    });
    game.clock.s = clockDuration; // Reset clock
    game.homeScore = 0;
    game.awayScore = 0;
    //game.losYardLine = 60;
    //game.firstDownYardLine = losYardLine + 10;
    //game.playState = 'kickoff';
    const plays = selectPlays(game.possession);
    game.players = generatePlayers(losYardLine, plays.playHome, plays.playAway).map(p => ({ ...p }));
    console.log('>>>>>>Game reset to initial state');
    broadcastReset(game, { text: "New Game Started!", type: "info" });
    broadcastClockUpdate(game);
}
// =================================================== END THE CLOCK

// =================================================== PHYSICS
// ** player movement broadcast to clients
// ** collision detection ... that you can comment out to bypass

// =========================Calculate front edge of ball carrier's base
function getFrontEdgeX(player, playState) {
    const vertices = getRectangleVertices(player);
    let direction = Math.cos(player.heading); // > 0 for right, < 0 for left
    // Flip direction for kickoff or punt
    if (playState === 'kickoff' || playState === 'punt') {
        direction = direction;
    }
    if (direction > 0) {
        const maxX = Math.max(...vertices.map(v => v.x));
        console.log(`Front edge (right): x=${maxX.toFixed(2)}, heading=${player.heading.toFixed(2)}, playState=${playState}`);
        return maxX;
    } else {
        const minX = Math.min(...vertices.map(v => v.x));
        console.log(`Front edge (left): x=${minX.toFixed(2)}, heading=${player.heading.toFixed(2)}, playState=${playState}`);
        return minX;
    }
}

// ============================ UPDATE PHYSICS - MOVE PLAYERS and COLLISION DETECTION
function updatePhysics(game) {
    grid.clear();
    game.players.forEach(p => {
        const baseSpeed = 0.5 * p.speed;
        p.heading += (Math.random() - 0.5) * 0.05;      // random heading change to simulate bibration
        p.vx += baseSpeed * Math.cos(p.heading) * 0.15;  // moves players forward .15 seems realistic 100yards in 10 seconds
        p.vy += baseSpeed * Math.sin(p.heading) * 0.15;  // moves players forward
        const friction = 0.95;                          // friction to slow down players and stops acceleration
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx * (1 / TICK_RATE);
        p.y += p.vy * (1 / TICK_RATE);

        if (p.x < 3) p.x = 3;
        if (p.x > 137) p.x = 137;
        if (p.y < 3) p.y = 3;
        if (p.y > 77) p.y = 77;

        const maxTurnRate = 0.02;
        const dialSteering = ((p.dialValue - 50) / 50) * maxTurnRate;
        p.heading += dialSteering * (1 / TICK_RATE);

        // =============================================== CHECK FOR TOUCHDOWN
        // Check touchdown for ball carrier
        if (p.hb && !isTouchDown) {
            const team = p.pid.startsWith(game.id + "-h") ? 'home' : 'away';
            // const dir = direction(team);
            if ((game.homeTD === rightEndZone && game.possession === 'home' && p.x >= 120) ||
                (game.homeTD === leftEndZone && game.possession === 'home' && p.x <= 20) ||
                (game.awayTD === rightEndZone && game.possession === 'away' && p.x >= 120) ||
                (game.awayTD === leftEndZone && game.possession === 'away' && p.x <= 20)) {
                isTouchDown = true;
                let message;
                if (team === 'home') {
                    game.homeScore += 6;
                    message = { text: "Touchdown " + game.homeTeamName, type: "success" };
                } else {
                    game.awayScore += 6;
                    message = { text: "Touchdown " + game.awayTeamName, type: "success" };
                }
                // // Reset for next play (e.g., kickoff)
                game.down = 1;
                game.yardsToGo = 10;
                if (game.losDirection === 1) {
                    game.losYardLine = 55; // Kickoff from 35-yard line
                    game.firstDownYardLine = game.losYardLine - (10 * game.losDirection); // Move first down marker 
                } else {
                    game.losYardLine = 85; // Kickoff from 35-yard line
                    game.firstDownYardLine = game.losYardLine - (10 * game.losDirection); // Move first down marker
                }
                game.possession = team === 'home' ? 'away' : 'home'; // Opponent receives
                game.playState = 'touchdown';
                game.gameRunning = false;
                game.clockRunning = false;
                game.playClockRunning = false;
                isTouchDown = false; // Reset touchdown flag
                if (game.clock.s <= 0) {
                    console.log('>>>>>>>>>>>>>>QTR over! Time expired.');
                    //clockLogic();
                    timeExpired = true;
                    game.clock.s = 0;
                }
                // Broadcast touchdown
                broadcastReset(game, message);
                game.playState = 'kickoff'; // Reset play state
                game.currentPlay = 'end';
                if (timeExpired) {
                    clockLogic();
                    timeExpired = false;
                }
                const plays = selectPlays(game.possession);
                game.players = generatePlayers(game.losYardLine, plays.playHome, plays.playAway).map(p => ({ ...p }));
                console.log(`Touchdown! ${team} scores, new score: Home ${game.homeScore} - Away ${game.awayScore}, New LOS: ${losYardLine}, fdl: ${game.firstDownYardLine.toFixed(2)}`);
                return; // Exit loop after touchdown

            }
        }
        // =============================================== END CHECK FOR TOUCHDOWN

        // =============================================== OUT OF BOUNDS for p.hb
        // Check out-of-bounds for ball carrier
        if (p.hb && (p.x < 10 || p.x > 130 || p.y < 8.5 || p.y > 77)) {
            console.log(`Player ${p.pid} is out of bounds!`);
            const frontEdgeX = getFrontEdgeX(p, game.playState); // Pass player object
            tackleMade(
                p.pid, // tackledPlayerID
                'OFB', // tacklerID (Out of Bounds)
                frontEdgeX
            );
            return; // Break loop after out-of-bounds
        }

        // =============================================== END OUT OF BOUNDS

        grid.addPlayer(p);
    });


    // =================================================== Collision detection with tackling
    for (const p of game.players) {
        const nearby = grid.getNearbyPlayers(p);
        for (const other of nearby) {
            // Prevent duplicate checks
            if (p.pid < other.pid) {
                const result = detectAndResolveCollisionRectangles(p, other);
                if (result && result.tackleDetected) {
                    console.log(`Tackle detected: ${result.tackleDetected.tacklerID} tackled ${result.tackleDetected.tackledPlayerID}`);
                    // Find ball carrier
                    const ballCarrier = game.players.find(player => player.pid === result.tackleDetected.tackledPlayerID);
                    if (ballCarrier) {
                        // Calculate front edge of ball carrier's base
                        const frontEdgeX = getFrontEdgeX(ballCarrier, game.playState);

                        // ===============================================================TACKLE MADE SAFETY
                        // ** NOT FINISHED NEED TO WORK OUT
                        // =================================================================================
                        if (frontEdgeX < 20) {
                            message = { text: "SAFETY " + game.homeTeamName, type: "success" };
                            console.log('Safety!');
                            game.awayScore += 2;
                        }
                        // =================================================================END SAFETY
                        // Stop the game running and update LOS
                        tackleMade(
                            result.tackleDetected.tackledPlayerID,
                            result.tackleDetected.tacklerID,
                            frontEdgeX
                        );
                    }
                    return; // Break loop after tackle
                }
            }
        }
    }

    // console.log('server - updatePhysics');
    // console.log(game.players.map(p => `${p.playerID}: heading=${p.heading.toFixed(2)}, mass=${p.mass.toFixed(2)}, x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, vx=${p.vx.toFixed(2)}, vy=${p.vy.toFixed(2)}`));
}

// ================================================== BROADCAST TO CLIENTS
// ** keep small and simple to keep track of game
function broadcastState(game) {
    const payload = {
        i: game.id,
        s: Number(game.clock.s.toFixed(2)),
        p: Number(game.playclock.toFixed(0)),
        r: game.gameRunning,
        pl: game.players.map(p => ({
            pid: p.pid,
            x: Number(p.x.toFixed(2)), // Round to 2 decimals
            y: Number(p.y.toFixed(2)),
            h: Number(p.heading.toFixed(2)),
            hb: p.hb,
            //dv: Number(p.dialValue.toFixed(2))
        }))
    };
    game.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
            //console.log('Sent to client:', payload);
        }
    });
}

// ======================================== Broadcast player update 
function broadcastPlayerUpdate(player) {
    const payload = {
        type: 'playerUpdate',
        pid: player.pid,
        x: Number(player.x.toFixed(2)),
        y: Number(player.y.toFixed(2)),
        h: Number(player.heading.toFixed(2)),
        hb: player.hb,
        // d: Number(player.dialValue.toFixed(2)),
        // s: Number((game.clock.s || 600).toFixed(2)),
        // p: Number(game.play.toFixed(2)),
        // r: game.running
    };
    //console.log('Broadcasting player update:', JSON.stringify(payload));
    game.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
}

// ===================== BROADCAST TACKLE

function broadcastTackle(game, tackledPlayerID, tacklerID, losYardLine, firstDownYardLine, down, yardsToGo, message) {
    const payload = {
        type: 'tackle',
        tackledPlayerID,
        tacklerID,
        los: (losYardLine.toFixed(2)),
        ytg: (game.yardsToGo.toFixed(2)),
        fdl: Number(game.firstDownYardLine),
        down: down,
        possession: game.possession,
        message: message,
        currentPlay: game.currentPlay,
        r: game.gameRunning,
        s: Number((game.clock.s || 600).toFixed(2)),
        p: Number(game.playclock.toFixed(2)),
        pl: game.players.map(p => ({
            pid: p.pid,
            x: Number(p.x.toFixed(2)),
            y: Number(p.y.toFixed(2)),
            h: Number(p.heading.toFixed(2)),
            hb: p.hb
        }))
    };
    console.log('Broadcasting tackle:', JSON.stringify(payload));
    game.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
}

// =============================Broadcast reset event
function broadcastReset(game, message, firstDownYardLine, down, yardsToGo, qtr,) {
    const payload = {
        type: 'reset',
        los: Number(game.losYardLine),
        fdl: Number(game.firstDownYardLine),
        ytg: (game.yardsToGo.toFixed(2)),
        qtr: game.qtr,
        r: game.gameRunning,
        down: game.down,
        poss: game.possession,
        message: message,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        playState: game.playState,
        homeTD: game.homeTD,
        awayTD: game.awayTD,
        gameStart: game.gameStart,
        currentPlay: game.currentPlay,
        s: Number((game.clock.s).toFixed(2)),
        p: Number(game.playclock.toFixed(0)),
        pl: game.players.map(p => ({
            pid: p.pid,
            x: Number(p.x.toFixed(2)),
            y: Number(p.y.toFixed(2)),
            h: Number(p.heading.toFixed(2)),
            hb: p.hb
        }))

    };
    console.log('Broadcasting RESET:', JSON.stringify(payload));
    game.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
}

function broadcastClockUpdate(game) {
    //game.clockRunning = true;
    try {
        if (game.clockRunning) {
            game.clock.s = Math.max(0, game.clock.s - 1 / (CLOCK_UPDATE_INTERVAL / 10));
            //game.play = Math.max(0, game.play - 1 / (CLOCK_UPDATE_INTERVAL / 10));
        }
        const payload = {
            type: 'clockUpdate',
            s: Number((game.clock.s || 0).toFixed(1)),
            p: Number((game.playclock || 25).toFixed(0)),
            r: game.running
        };
        //console.log('Broadcasting clock update:', JSON.stringify(payload));
        game.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
    } catch (error) {
        console.error('Error broadcasting clock update:', error);
    }
}

module.exports = {
    tackleMade,
    initialPlayers,
    //gameRunning,
    //clockSeconds,
    //playClock,
    broadcastState
};