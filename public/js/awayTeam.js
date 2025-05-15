// awayTeam.js
const offensivePlaysAway = {
    'NYG - Spread': {
        '01': { x: -1, y: -50, h: 0, dv: 50, hb: false },
        '02': { x: -2, y: -40, h: 0, dv: 50, hb: false },
        '03': { x: -3, y: -30, h: 0, dv: 50, hb: false },
        '04': { x: -4, y: -20, h: 0, dv: 50, hb: false },
        '05': { x: -5, y: -10, h: 0, dv: 50, hb: false },
        '06': { x: -6, y: 0, h: 0, dv: 50, hb: true },
        '07': { x: -7, y: 10, h: 0, dv: 50, hb: false },
        '08': { x: -8, y: 20, h: 0, dv: 50, hb: false },
        '09': { x: -9, y: 30, h: 0, dv: 50, hb: false },
        '10': { x: -10, y: 40, h: 0, dv: 50, hb: false },
        '11': { x: -11, y: 50, h: 0, dv: 50, hb: false }
    }
};

const defensivePlaysAway = {
    '3-4-Base': {
        '01': { x: 1, y: 0, h: Math.PI, dv: 50, hb: false },
        '02': { x: 2, y: -10, h: Math.PI, dv: 50, hb: false },
        '03': { x: 3, y: -20, h: Math.PI, dv: 50, hb: false },
        '04': { x: 4, y: -30, h: Math.PI, dv: 50, hb: false },
        '05': { x: 5, y: -40, h: Math.PI, dv: 50, hb: false },
        '06': { x: 6, y: 0, h: Math.PI, dv: 50, hb: false },
        '07': { x: 7, y: 10, h: Math.PI, dv: 50, hb: false },
        '08': { x: 8, y: 20, h: Math.PI, dv: 50, hb: false },
        '09': { x: 9, y: 30, h: Math.PI, dv: 50, hb: false },
        '10': { x: 10, y: 40, h: Math.PI, dv: 50, hb: false },
        '11': { x: 11, y: 50, h: Math.PI, dv: 50, hb: false }
    }
};

const awayTeam = {
    name: 'New York Giants',
    rosterOffense: [
        'Daniel Jones',
        'Saquon Barkley',
        'Kenny Golladay',
        'Sterling Shepard',
        'Evan Engram',
        'Andrew Thomas',
        'Nick Gates',
        'Will Hernandez',
        'Nate Solder',
        'Darius Slayton',
        'Kadarius Toney'
    ],
    rosterDefense: [
        'Chucky Wilkins',
        'Russ Baum',
        'Ben Jumper',
        'Kurt Cobain',
        'Mr Rogers',
        'Joe Rogan',
        'Hulk Hogan',
        'Omar Picklepop',
        'Daniel Armstrong',
        'Jeff Lindsey',
        'Chris Ogden'
    ],
    playbooks: {
        offensive: offensivePlaysAway,
        defensive: defensivePlaysAway
    }
};

module.exports = awayTeam;