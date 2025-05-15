// ====================================================GAME SOUND
// ** Handles all the game sound and fx
// ** 
// =======================================================
console.log('Loading sound.js...');
// == Preload audio files
const tdCrowd = new Audio('audio/ef-crowdCheer1.mp3');
const whistle1 = new Audio('audio/ef-whistle.mp3');
whistle1.volume = 1.0; // Set volume for whistle sound
// ====================================================GAME VIBRATING
// start vibrating when gameSwitch is ON using Tone.js Synth
// ====================================================
let audioCtx;
let noise;
let volume = 0.6;

function initializeAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext initialized, state:', audioCtx.state);
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => console.log('AudioContext resumed'));
        }
    }
}

// Global variables (if not already declared)
let buzzOsc;
//let volume = 0.5; // Example volume

function startVibratingSound() {
    // Start Tone.js if not already running (usually triggered by a user event)
    Tone.start();

    // Stop and clear any existing noise
    if (noise) {
        noise.stop();
        noise = null;
    }
    // Stop and clear any existing oscillator
    if (buzzOsc) {
        buzzOsc.stop();
        buzzOsc = null;
    }

    // Create a brown noise source and start it.
    noise = new Tone.Noise("brown").start();

    // Create a sawtooth oscillator for a buzzing sound.
    buzzOsc = new Tone.Oscillator({
        frequency: 300, // Adjust frequency as needed
        type: "sawtooth"
    }).start();

    // Create a filter with LFO modulation
    const filter = new Tone.Filter({
        type: "lowpass",
        frequency: 600,
        Q: 5
    });

    // Create a gain node using your volume variable.
    const gain = new Tone.Gain(volume);

    // Create an LFO to modulate the filter's cutoff frequency.
    const lfo = new Tone.LFO({
        frequency: 200,
        min: 180,
        max: 700
    }).start();
    lfo.connect(filter.frequency);

    // Create a distortion node to add character.
    const distortion = new Tone.Distortion(0.3);

    // Connect both noise and oscillator to the distortion.
    noise.connect(distortion);
    buzzOsc.connect(distortion);

    // Pass the combined signal through the filter and then to gain.
    distortion.connect(filter);
    filter.connect(gain);

    // Route the final output to the audio destination.
    gain.toDestination();

    console.log('Rumbly electric football metal vibration started');
}


function stopVibratingSound() {
    if (noise) {
        noise.stop();
        buzzOsc.stop();
        noise = null;
        buzzOsc = null;
        console.log('Rumbly electric football metal vibration stopped');
    }
}
// =========================================END GAME VIBRATING