console.log('Loading scorebug.js...');
// ESPN-style Scorebug Module for Electric Football
class Scorebug {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = config.width || 820; // Increased from 720 to fit down-and-distance
        this.height = config.height || 60;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.pixelsPerYard = config.pixelsPerYard || 10.29; // From main.js: 1440 / 140

        // Default game state
        this.state = {
            homeTeam: { name: 'REDSKINS', score: 0, color: '#7A0019' },
            awayTeam: { name: 'DALLAS', score: 0, color: '#041E42' },
            quarter: 1,
            gameClock: '10:00', // From clockSeconds
            playClock: 25, // From playClock
            possession: null, // 'home', 'away', or null
            down: 1, // Current down
            yardsToGo: 10, // Yards needed for first down
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

    // Format down (e.g., 1 to "1st", 2 to "2nd")
    formatDown(down) {
        switch (down) {
            case 1: return '1st';
            case 2: return '2nd';
            case 3: return '3rd';
            case 4: return '4th';
            default: return `${down}th`;
        }
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
            quarter: Math.max(1, Number(data.quarter) || this.state.quarter),
            gameClock: data.gameClock !== undefined ? this.formatClock(data.gameClock) : this.state.gameClock,
            playClock: Math.max(0, Number(data.playClock) || this.state.playClock),
            possession: data.possession || this.state.possession,
            down: Math.max(1, Math.min(4, Number(data.down) || this.state.down)),
            yardsToGo: Math.max(0, Number(data.yardsToGo) || this.state.yardsToGo),
            isRunning: data.isRunning ?? this.state.isRunning
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
        const teamWidth = this.width * 0.35; // 287px
        const centerWidth = this.width * 0.3; // 246px
        const downWidth = this.width * 0.12; // ~98px
        const fontSizeLarge = this.height * 0.55; // Score (~33px)
        const fontSizeSmall = this.height * 0.35; // Name, quarter, clocks, down (~21px)

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
        ctx.fillRect(this.width - teamWidth - downWidth, 0, teamWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'right';
        ctx.fillText(this.state.awayTeam.name, this.width - downWidth - 10, this.height * 0.3);
        ctx.font = `bold ${fontSizeLarge}px ${this.font}`;
        ctx.fillText(this.state.awayTeam.score, this.width - downWidth - 10, this.height * 0.7);

        // Center section (quarter, game clock, play clock)
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(teamWidth, 0, centerWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.accentColor;
        ctx.textAlign = 'center';
        ctx.fillText(`Q${this.state.quarter} ${this.state.gameClock}`, teamWidth + centerWidth / 2, this.height * 0.3);
        ctx.fillStyle = this.textColor;
        ctx.fillText(`Play: ${this.state.playClock}s`, teamWidth + centerWidth / 2, this.height * 0.7);

        // Down and distance (right section)
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(this.width - downWidth, 0, downWidth, this.height);
        ctx.font = `bold ${fontSizeSmall}px ${this.font}`;
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${this.formatDown(this.state.down)} & ${this.state.yardsToGo}`, this.width - downWidth / 2, this.height / 2);

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
                ctx.moveTo(this.width - teamWidth - downWidth + arrowSize, this.height / 2);
                ctx.lineTo(this.width - teamWidth - downWidth, this.height / 2 - arrowSize);
                ctx.lineTo(this.width - teamWidth - downWidth, this.height / 2 + arrowSize);
            }
            ctx.fill();
        }
    }
}