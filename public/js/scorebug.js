console.log('Loading scorebug.js...');
// ESPN-style Scorebug Module for Electric Football
class Scorebug {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = config.width || 720; // ~50% of game canvas width (1440)
        this.height = config.height || 60;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.pixelsPerYard = config.pixelsPerYard || 10.29; // From main.js: 1440 / 140

        // Default game state
        this.state = {
            homeTeam: { name: 'DALLS', score: 0, color: '#041E42' },
            awayTeam: { name: 'REDSKINS', score: 0, color: '#7A0019' },
            quarter: 1,
            gameClock: '10:00', // From clockSeconds
            playClock: 25, // From playClock
            possession: null, // 'home', 'away', or null
            isRunning: false
        };

        // Styling
        this.font = 'Arial'; // Match main.js
        this.bgColor = 'rgba(0, 0, 0, 0.75)';
        this.textColor = '#FFFFFF';
        this.accentColor = '#FFD700'; // Yellow for quarter/clock
        this.borderColor = '#FFFFFF';
        this.borderWidth = 2;
    }

    // Format seconds to MM:SS
    formatClock(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update game state
    update(data) {
        if (!data || typeof data !== 'object') {
            console.warn('Invalid scorebug data');
            return;
        }
        this.state = {
            homeTeam: {
                name: (data.homeTeam?.name?.toUpperCase() || this.state.homeTeam.name).slice(0, 8), // Max 8 chars
                score: Math.max(0, Number(data.homeTeam?.score) || this.state.homeTeam.score),
                color: data.homeTeam?.color || this.state.homeTeam.color
            },
            awayTeam: {
                name: (data.awayTeam?.name?.toUpperCase() || this.state.awayTeam.name).slice(0, 8),
                score: Math.max(0, Number(data.awayTeam?.score) || this.state.awayTeam.score),
                color: data.awayTeam?.color || this.state.awayTeam.color
            },
            quarter: Math.max(1, Number(data.qtr) || this.state.quarter),
            gameClock: data.gameClock !== undefined ? this.formatClock(data.gameClock) : this.state.gameClock,
            playClock: Math.max(0, Number(data.playClock) || this.state.playClock),
            possession: data.possession || this.state.possession,
            isRunning: data.isRunning ?? this.state.isRunning,
            down: Math.max(1, Number(data.down) || this.state.down),
            yardsToGo: Math.max(1, Number(data.yardsToGo) || this.state.yardsToGo),
            homeTeamScore: Math.max(0, Number(data.homeTeam?.score) || this.state.homeTeam.score),
            awayTeamScore: Math.max(0, Number(data.awayTeam?.score) || this.state.awayTeam.score)
        };
        this.render();
    }

    // Render the scorebug
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Background
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // Border
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.strokeRect(0, 0, this.width, this.height);

        // Layout
        const teamWidth = this.width * 0.25;
        const centerWidth = this.width * 0.3;
        const sideMsgWidth = this.width * 0.2; // For future use
        const fontSizeLarge = this.height * 0.55; // Score
        const fontSizeSmall = this.height * 0.35; // Name, quarter, clocks

        // Home team
        ctx.fillStyle = this.state.homeTeam.color;
        ctx.fillRect(0, 0, teamWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.state.homeTeam.name, 10, this.height * 0.3);
        ctx.font = `bold ${fontSizeLarge}px ${this.font}`;
        ctx.fillText(this.state.homeTeam.score, 10, this.height * 0.7);

        // Away team
        ctx.fillStyle = this.state.awayTeam.color;
        ctx.fillRect(this.width - teamWidth, 0, teamWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'right';
        ctx.fillText(this.state.awayTeam.name, this.width - 10, this.height * 0.3);
        ctx.font = `bold ${fontSizeLarge}px ${this.font}`;
        ctx.fillText(this.state.awayTeam.score, this.width - 10, this.height * 0.7);

        // Center section (quarter, game clock, play clock)
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(teamWidth, 0, centerWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.accentColor;
        ctx.textAlign = 'center';
        ctx.fillText(`Q${this.state.quarter} ${this.state.gameClock}`, teamWidth + centerWidth / 2, this.height * 0.3);
        ctx.fillStyle = this.textColor;
        ctx.fillText(`Play: ${this.state.playClock}s`, teamWidth + centerWidth / 2, this.height * 0.7);

        // Down and distance (for future use)
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(this.width - sideMsgWidth-teamWidth, 0, sideMsgWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'right';
        ctx.fillText(`Down: ${this.state.down || 1}`, this.width - teamWidth - 3, this.height * 0.3);
        ctx.fillText(`Yards: ${this.state.yardsToGo || 10}`, this.width - teamWidth - 3, this.height * 0.7);

        // Possession indicator
        if (this.state.possession) {
            const arrowSize = this.height * 0.2;
            ctx.fillStyle = this.accentColor;
            ctx.beginPath();
            if (this.state.possession === 'home') {
                ctx.moveTo(teamWidth - arrowSize, this.height / 2);
                ctx.lineTo(teamWidth, this.height / 2 - arrowSize);
                ctx.lineTo(teamWidth, this.height / 2 + arrowSize);
            } else {
                ctx.moveTo(this.width - teamWidth + arrowSize, this.height / 2);
                ctx.lineTo(this.width - teamWidth, this.height / 2 - arrowSize);
                ctx.lineTo(this.width - teamWidth, this.height / 2 + arrowSize);
            }
            ctx.fill();
        }
    }
}

// Example usage (add to main.js)
const scorebug = new Scorebug('scorebugCanvas', {
    width: 720,
    height: 60,
    pixelsPerYard: 1440 / 140 // Match main.js
});
scorebug.update({
    homeTeam: { name: 'REDSKINS', score: 0, color: '#7A0019' },
    awayTeam: { name: 'DALLAS', score: 0, color: '#041E42' },
    quarter: 1,
    gameClock: 600, // Initial clockSeconds
    playClock: 25, // Initial playClock
    possession: null,
    isRunning: false
});
