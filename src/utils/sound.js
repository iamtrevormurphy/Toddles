import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Web Audio Context Singleton
let audioContext = null;
let gainNode = null;

// Native Sound Objects
const soundObjects = {
  pop: null,
  celebration: null,
};

// Initialize audio
export async function initAudio() {
  if (Platform.OS === 'web') {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
      }

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (e) {
      console.log('Web Audio init error:', e);
    }
  } else {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (e) {
      console.log('Native Audio init error:', e);
    }
  }
}

// Play Pop Sound
export async function playPopSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        // Pop sound: quick frequency sweep down
        const now = audioContext.currentTime;
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);

        // Cleanup nodes after playing
        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 200);
      }
    } else {
      // Native implementation
      // Since we are generating sounds on the fly for web, for native we would ideally 
      // load a file. However, without assets, we'll try to use a default system sound 
      // or just leave it prepared for when assets are added. 
      // For now, let's try to load a sound if it existed, but since we don't have assets:

      // NOTE: In a real app with assets, we would load:
      // const { sound } = await Audio.Sound.createAsync(require('../../assets/pop.mp3'));
      // await sound.playAsync();

      // Since we don't have assets, we can't easily generate sound on native without a library
      // like react-native-sound-generator which requires native linking.
      // So for native, we might be limited unless we have a file.
      // But! We can verify if we can use URI for a generic sound or just keep the structure ready.

      // For this exercise, I will assume we might have an asset or I'll silence it safely 
      // rather than crashing. 
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Celebration Sound
export async function playCelebrationSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        // Play a simple ascending arpeggio
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
          const oscillator = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          oscillator.connect(noteGain);
          noteGain.connect(audioContext.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, now + i * 0.1);

          const startTime = now + i * 0.1;
          noteGain.gain.setValueAtTime(0.2, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

          oscillator.start(startTime);
          oscillator.stop(startTime + 0.2);

          setTimeout(() => {
            oscillator.disconnect();
            noteGain.disconnect();
          }, 1000);
        });
      }
    } else {
      // Native placeholder
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Snap Sound - satisfying click for piece placement
export async function playSnapSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        oscillator.start(now);
        oscillator.stop(now + 0.08);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 150);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Split Sound - for marble splitting
export async function playSplitSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        // Two quick descending tones
        [0, 0.08].forEach((delay, i) => {
          const oscillator = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          oscillator.connect(noteGain);
          noteGain.connect(audioContext.destination);

          oscillator.type = 'sine';
          const startFreq = i === 0 ? 600 : 500;
          oscillator.frequency.setValueAtTime(startFreq, now + delay);
          oscillator.frequency.exponentialRampToValueAtTime(300, now + delay + 0.1);

          noteGain.gain.setValueAtTime(0.25, now + delay);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);

          oscillator.start(now + delay);
          oscillator.stop(now + delay + 0.1);

          setTimeout(() => {
            oscillator.disconnect();
            noteGain.disconnect();
          }, 300);
        });
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Combine Sound - for marble combining
export async function playCombineSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        // Ascending merge sound
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.15);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 250);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Overflow Sound - soft "too full, slides back out" whoosh (never harsh)
export async function playOverflowSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, now);
        oscillator.frequency.exponentialRampToValueAtTime(280, now + 0.25);

        noteGain.gain.setValueAtTime(0.2, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator.start(now);
        oscillator.stop(now + 0.25);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 400);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Tile Pickup Sound - Path-Maker: a short upward lift when a tile
// leaves the palette or track
export async function playTilePickupSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(420, now);
        oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.06);

        noteGain.gain.setValueAtTime(0.25, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        oscillator.start(now);
        oscillator.stop(now + 0.06);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 150);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Tile Drop Sound - Path-Maker: a short downward settle when a tile
// lands in a track slot
export async function playTileDropSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(620, now);
        oscillator.frequency.exponentialRampToValueAtTime(340, now + 0.07);

        noteGain.gain.setValueAtTime(0.28, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        oscillator.start(now);
        oscillator.stop(now + 0.07);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 150);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Footstep Sound - Path-Maker: one note of a rising pentatonic scale,
// call once per executed step (index = the step's position in the run) so
// a full program reads as a cheerful ascending phrase, not five identical
// clicks
const FOOTSTEP_SCALE = [392, 440, 494, 587, 659]; // G4 A4 B4 D5 E5, major pentatonic
export async function playFootstepSound(index = 0) {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        const freq = FOOTSTEP_SCALE[((index % FOOTSTEP_SCALE.length) + FOOTSTEP_SCALE.length) % FOOTSTEP_SCALE.length];
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0.22, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        oscillator.start(now);
        oscillator.stop(now + 0.12);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 200);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Hmm Sound - Path-Maker: a gentle, curious two-note lift for the bug
// outcome. Never a "wrong answer" buzzer — a question, not a penalty.
export async function playHmmSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        [
          { delay: 0, freq: 340, duration: 0.12 },
          { delay: 0.13, freq: 400, duration: 0.16 },
        ].forEach(({ delay, freq, duration }) => {
          const oscillator = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          oscillator.connect(noteGain);
          noteGain.connect(audioContext.destination);

          const startTime = now + delay;
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0.18, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

          oscillator.start(startTime);
          oscillator.stop(startTime + duration);

          setTimeout(() => {
            oscillator.disconnect();
            noteGain.disconnect();
          }, 400);
        });
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Moonwalk Sound - Path-Maker: a soft rising whoosh while Lento
// slides one step backward after the child pulls the last tile out.
// Rising (not falling) so an undo never sounds like losing something.
export async function playMoonwalkSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(340, now);
        oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.24);

        noteGain.gain.setValueAtTime(0.18, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

        oscillator.start(now);
        oscillator.stop(now + 0.24);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 400);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Teeter Sound - Path-Maker: two alternating wobble tones while Lento
// windmills at the brink of a gap. Comic suspense, never alarm.
export async function playTeeterSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        [
          { delay: 0, freq: 360 },
          { delay: 0.14, freq: 300 },
          { delay: 0.28, freq: 360 },
          { delay: 0.42, freq: 300 },
        ].forEach(({ delay, freq }) => {
          const oscillator = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          oscillator.connect(noteGain);
          noteGain.connect(audioContext.destination);

          const startTime = now + delay;
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0.14, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);

          oscillator.start(startTime);
          oscillator.stop(startTime + 0.12);

          setTimeout(() => {
            oscillator.disconnect();
            noteGain.disconnect();
          }, 800);
        });
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Bonk Sound - Path-Maker: one soft low thud for walking into a
// raised block. Pillow-soft, cartoon-comic, no buzzer edge.
export async function playBonkSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(160, now);
        oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.14);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

        oscillator.start(now);
        oscillator.stop(now + 0.14);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 250);
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Chomp Sound - Path-Maker: two quick crunchy blips when Lento
// munches a snack on the path.
export async function playChompSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        [
          { delay: 0, freq: 230 },
          { delay: 0.09, freq: 180 },
        ].forEach(({ delay, freq }) => {
          const oscillator = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          oscillator.connect(noteGain);
          noteGain.connect(audioContext.destination);

          const startTime = now + delay;
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(freq, startTime);
          oscillator.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + 0.06);

          noteGain.gain.setValueAtTime(0.24, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);

          oscillator.start(startTime);
          oscillator.stop(startTime + 0.06);

          setTimeout(() => {
            oscillator.disconnect();
            noteGain.disconnect();
          }, 300);
        });
      }
    }
  } catch (e) {
    // Fail silently
  }
}

// Play Error Sound - gentle wrong answer feedback
export async function playErrorSound() {
  try {
    if (Platform.OS === 'web') {
      if (!audioContext) await initAudio();

      if (audioContext && audioContext.state === 'running') {
        const now = audioContext.currentTime;

        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.setValueAtTime(180, now + 0.1);

        noteGain.gain.setValueAtTime(0.2, now);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        setTimeout(() => {
          oscillator.disconnect();
          noteGain.disconnect();
        }, 300);
      }
    }
  } catch (e) {
    // Fail silently
  }
}
