// homeTeam.js
const offensivePlaysHome = {
    'Dal - Shotgun': {
        '01': { x: -1, y: -50, h: 0, dv: 50, hb: false, ie: false },
        '02': { x: -2, y: -40, h: 0, dv: 50, hb: false, ie: false },
        '03': { x: -3, y: -30, h: 0, dv: 50, hb: false, ie: false },
        '04': { x: -4, y: -20, h: 0, dv: 50, hb: false, ie: false },
        '05': { x: -5, y: -10, h: 0, dv: 50, hb: false, ie: false },
        '06': { x: -6, y: 0, h: 0, dv: 50, hb: true, ie: true },
        '07': { x: -7, y: 10, h: 0, dv: 50, hb: false, ie: true },
        '08': { x: -8, y: 20, h: 0, dv: 50, hb: false, ie: true },
        '09': { x: -9, y: 30, h: 0, dv: 50, hb: false, ie: true },
        '10': { x: -10, y: 40, h: 0, dv: 50, hb: false, ie: true },
        '11': { x: -11, y: 50, h: 0, dv: 50, hb: false, ie: true }
    }
    // Add more plays as needed
};

const defensivePlaysHome = {
    '4-3-Standard': {
        '01': { x: 1, y: 0, h: Math.PI, dv: 50, hb: false, ie: false },
        '02': { x: 2, y: -10, h: Math.PI, dv: 50, hb: false, ie: false },
        '03': { x: 3, y: -20, h: Math.PI, dv: 50, hb: false, ie: false },
        '04': { x: 4, y: -30, h: Math.PI, dv: 50, hb: false, ie: false },
        '05': { x: 5, y: -40, h: Math.PI, dv: 50, hb: false, ie: false },
        '06': { x: 6, y: 0, h: Math.PI, dv: 50, hb: false, ie: false },
        '07': { x: 7, y: 10, h: Math.PI, dv: 50, hb: false, ie: false },
        '08': { x: 8, y: 20, h: Math.PI, dv: 50, hb: false, ie: false },
        '09': { x: 9, y: 30, h: Math.PI, dv: 50, hb: false, ie: false },
        '10': { x: 10, y: 40, h: Math.PI, dv: 50, hb: false, ie: false },
        '11': { x: 11, y: 50, h: Math.PI, dv: 50, hb: false, ie: false }
    }
    // Add more plays as needed
};

const homeTeam = {
    name: 'Dallas Cowboys',
    roster: [
        'Dak Prescott',
        'Ezekiel Elliott',
        'CeeDee Lamb',
        'Amari Cooper',
        'Michael Gallup',
        'Tyron Smith',
        'Zack Martin',
        'Travis Frederick',
        'La’el Collins',
        'Tony Pollard',
        'Blake Jarwin'
    ],
    playbooks: {
        offensive: offensivePlaysHome,
        defensive: defensivePlaysHome
    }
};

module.exports = homeTeam;