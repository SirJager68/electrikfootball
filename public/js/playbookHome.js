// plays.js
console.log("Loading Redskins playbook plays.js...");
// Play definitions for electric football game, with relative coordinates (x: -3 is 3 yards behind LOS)
module.exports = {
    offensivePlays: {
        "I-Formation": {
            "01": { x: -3, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Center (C)
            "02": { x: -3, y: -10, h: 0, dv: 0, hb: false, ie: false }, // Right Guard (RG)
            "03": { x: -3, y: 10, h: 0, dv: 0, hb: false, ie: false }, // Left Guard (LG)
            "04": { x: -3, y: -20, h: 0, dv: 0, hb: false, ie: false }, // Right Tackle (RT)
            "05": { x: -3, y: 20, h: 0, dv: 0, hb: false, ie: false }, // Left Tackle (LT)
            "06": { x: -12, y: 0, h: 0, dv: 0, hb: false, ie: true }, // Quarterback (QB)
            "07": { x: -3, y: 30, h: 0, dv: 0, hb: false, ie: true }, // Tight End (TE)
            "08": { x: -16, y: -10, h: 0, dv: 0, hb: false, ie: true }, // Running Back (RB)
            "09": { x: -16, y: 10, h: 0, dv: 0, hb: false, ie: true }, // Fullback (FB)
            "10": { x: -3, y: -50, h: 0, dv: 0, hb: false, ie: true }, // Wide Receiver 1 (WR1)
            "11": { x: -3, y: 50, h: 0, dv: 0, hb: false, ie: true } // Wide Receiver 2 (WR2)
        },
        "Red - Shotgun": {
            "01": { x: -3, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Center (C)
            "02": { x: -3, y: -10, h: 0, dv: 0, hb: false, ie: false }, // Right Guard (RG)
            "03": { x: -3, y: 10, h: 0, dv: 0, hb: false, ie: false }, // Left Guard (LG)
            "04": { x: -3, y: -20, h: 0, dv: 0, hb: false, ie: false }, // Right Tackle (RT)
            "05": { x: -3, y: 20, h: 0, dv: 0, hb: false, ie: false }, // Left Tackle (LT)
            "06": { x: -12, y: 0, h: 0, dv: 0, hb: false, ie: true }, // Quarterback (QB)
            "07": { x: -3, y: 30, h: 0, dv: 0, hb: false, ie: true }, // Tight End (TE)
            "08": { x: -10, y: -9, h: 0, dv: 0, hb: false, ie: true }, // Running Back (RB)
            "09": { x: -16, y: 10, h: 0, dv: 0, hb: false, ie: true }, // Fullback (FB)
            "10": { x: -3, y: -80, h: 0, dv: 0, hb: false, ie: true }, // Wide Receiver 1 (WR1)
            "11": { x: -3, y: 80, h: 0, dv: 0, hb: false, ie: true } // Wide Receiver 2 (WR2)
        },
        "Kickoff Return": {
            "01": { x: -15, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Center (C)
            "02": { x: -15, y: -20, h: 0, dv: 0, hb: false, ie: false }, // Right Guard (RG)
            "03": { x: -15, y: 20, h: 0, dv: 0, hb: false, ie: false }, // Left Guard (LG)
            "04": { x: -15, y: -40, h: 0, dv: 0, hb: false, ie: false }, // Right Tackle (RT)
            "05": { x: -15, y: 40, h: 0, dv: 0, hb: false, ie: false }, // Left Tackle (LT)
            "06": { x: -70, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Quarterback (QB)
            "07": { x: -25, y: 30, h: 0, dv: 0, hb: false, ie: false }, // Tight End (TE)
            "08": { x: -25, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Running Back (RB)
            "09": { x: -25, y: 30, h: 0, dv: 0, hb: false, ie: false }, // Fullback (FB)
            "10": { x: -30, y: -50, h: 0, dv: 0, hb: false, ie: false }, // Wide Receiver 1 (WR1)
            "11": { x: -30, y: 50, h: 0, dv: 0, hb: false, ie: false } // Wide Receiver 2 (WR2)
        }
    },
    defensivePlays: {
        "4-3-Standard": {
            // Placeholder, replace with your actual formation
            "01": { x: 3, y: -30, h: 0, dv: 0, hb: false }, // Defensive End (DE, left)
            "02": { x: 3, y: -10, h: 0, dv: 0, hb: false }, // Defensive Tackle (DT, left)
            "03": { x: 3, y: 10, h: 0, dv: 0, hb: false }, // Defensive Tackle (DT, right)
            "04": { x: 3, y: 30, h: 0, dv: 0, hb: false }, // Defensive End (DE, right)
            "05": { x: 3, y: -20, h: 0, dv: 0, hb: false }, // Outside Linebacker (OLB, left)
            "06": { x: 3, y: 0, h: 0, dv: 0, hb: false }, // Middle Linebacker (MLB)
            "07": { x: 3, y: 20, h: 0, dv: 0, hb: false }, // Outside Linebacker (OLB, right)
            "08": { x: 7, y: -60, h: 0, dv: 0, hb: false }, // Cornerback (CB, left)
            "09": { x: 7, y: 60, h: 0, dv: 0, hb: false }, // Cornerback (CB, right)
            "10": { x: 10, y: -30, h: 0, dv: 0, hb: false }, // Strong Safety (SS)
            "11": { x: 10, y: 30, h: 0, dv: 0, hb: false } // Free Safety (FS)
        },
        "Kickoff": {
            // Placeholder, replace with your actual formation
            "01": { x: 3, y: -30, h: 0, dv: 0, hb: false, ie: false }, // Defensive End (DE, left)
            "02": { x: 3, y: -10, h: 0, dv: 0, hb: false, ie: false }, // Defensive Tackle (DT, left)
            "03": { x: 3, y: 10, h: 0, dv: 0, hb: false, ie: false }, // Defensive Tackle (DT, right)
            "04": { x: 3, y: 30, h: 0, dv: 0, hb: false, ie: false }, // Defensive End (DE, right)
            "05": { x: 3, y: -20, h: 0, dv: 0, hb: false, ie: false }, // Outside Linebacker (OLB, left)
            "06": { x: 10, y: 0, h: 0, dv: 0, hb: false, ie: false }, // Middle Linebacker (MLB)
            "07": { x: 3, y: 20, h: 0, dv: 0, hb: false, ie: false }, // Outside Linebacker (OLB, right)
            "08": { x: 3, y: -60, h: 0, dv: 0, hb: false, ie: false }, // Cornerback (CB, left)
            "09": { x: 3, y: 60, h: 0, dv: 0, hb: false, ie: false }, // Cornerback (CB, right)
            "10": { x: 3, y: -30, h: 0, dv: 0, hb: false, ie: false }, // Strong Safety (SS)
            "11": { x: 3, y: 30, h: 0, dv: 0, hb: false, ie: false } // Free Safety (FS)
        }
    }
};