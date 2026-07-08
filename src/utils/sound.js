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
