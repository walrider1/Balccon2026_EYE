const fs = require('node:fs');
const path = require('node:path');

const sampleRate = 44100;
const outDir = path.resolve(__dirname, '..', 'audio', 'sfx');

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function envelope(t, duration, attack = .01, release = .05) {
  const fadeIn = Math.min(1, t / attack);
  const fadeOut = Math.min(1, (duration - t) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function noise(seed) {
  let value = Math.sin(seed * 127.1) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

function periodicNoise(t, duration, partials = 10, seed = 1) {
  let value = 0;
  let weight = 0;
  for (let harmonic = 1; harmonic <= partials; harmonic += 1) {
    const amplitude = 1 / harmonic;
    const phase = (seed * 17.17 + harmonic * 43.31) % (Math.PI * 2);
    value += Math.sin((Math.PI * 2 * harmonic * t) / duration + phase) * amplitude;
    weight += amplitude;
  }
  return value / weight;
}

function loopLfo(t, duration, cycles = 1, phase = 0) {
  return Math.sin((Math.PI * 2 * cycles * t) / duration + phase);
}

function tone(time, hz, type = 'sine') {
  const phase = time * hz * Math.PI * 2;
  if (type === 'square') return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === 'triangle') return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  if (type === 'saw') return 2 * (time * hz - Math.floor(.5 + time * hz));
  return Math.sin(phase);
}

function writeWav(name, duration, render) {
  const samples = Math.max(1, Math.floor(duration * sampleRate));
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    const sample = clamp(render(t, index, duration)) * 32767;
    data.writeInt16LE(sample, index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  fs.writeFileSync(path.join(outDir, name), Buffer.concat([header, data]));
}

function beep(freqs, duration, volume = .18, type = 'sine') {
  return (t) => {
    const step = Math.min(freqs.length - 1, Math.floor((t / duration) * freqs.length));
    return tone(t, freqs[step], type) * envelope(t, duration, .004, .04) * volume;
  };
}

function rising(freqA, freqB, volume = .16, type = 'sine') {
  return (t, _index, duration) => {
    const progress = t / duration;
    const hz = freqA + (freqB - freqA) * progress;
    return tone(t, hz, type) * envelope(t, duration, .02, .12) * volume;
  };
}

function descending(freqA, freqB, volume = .16) {
  return (t, _index, duration) => {
    const progress = t / duration;
    const hz = freqA + (freqB - freqA) * progress;
    return (tone(t, hz) + tone(t, hz / 2, 'triangle') * .4) * envelope(t, duration, .015, .16) * volume;
  };
}

fs.mkdirSync(outDir, { recursive: true });

/*
  Ambient loops use integer-cycle tones plus periodic noise/LFOs. That keeps the
  first and last samples aligned, so browser loop wrap points do not click.
*/
writeWav('ambient_ship_loop.wav', 16, (t, _index, duration) => {
  const bed = tone(t, 40) * .16 + tone(t, 60) * .07 + tone(t, 120) * .02;
  const air = periodicNoise(t, duration, 18, 2) * .013;
  const pressure = (.5 + loopLfo(t, duration, 2, .7) * .5) * .018;
  const slowPulse = loopLfo(t, duration, 1) * .014;
  return (bed + air + pressure + slowPulse) * .45;
});

writeWav('ambient_nav_loop.wav', 14, (t, _index, duration) => {
  const deep = (tone(t, 56) * .1 + tone(t, 112) * .025) * (.86 + loopLfo(t, duration, 1, .8) * .14);
  const shimmer = tone(t, 196, 'triangle') * (.45 + loopLfo(t, duration, 4, .35) * .28) * .025;
  const relayAir = periodicNoise(t, duration, 14, 9) * .009;
  return (deep + shimmer + relayAir) * .5;
});

writeWav('ambient_sedation_loop.wav', 12, (t, _index, duration) => {
  const breath = (.5 - Math.cos((Math.PI * 2 * 3 * t) / duration) * .5) ** 1.7;
  const hum = tone(t, 36) * .11 + tone(t, 72) * .032;
  const air = periodicNoise(t, duration, 16, 14) * .011;
  return hum * .45 + breath * .032 + air;
});

writeWav('terminal_tick.wav', .045, (t, index, duration) => {
  return (noise(index) * .5 + tone(t, 2200, 'square') * .18) * envelope(t, duration, .001, .025) * .25;
});

writeWav('command_error.wav', .22, descending(210, 95, .18));
writeWav('archive_open.wav', .32, (t, index, duration) => {
  const click = noise(index) * envelope(t, .055, .001, .04) * .22;
  const relay = tone(t, 180, 'triangle') * envelope(Math.max(0, t - .07), duration - .07, .004, .14) * .16;
  return click + relay;
});
writeWav('sedation_alarm.wav', 1.6, (t, _index, duration) => {
  const gate = Math.sin(t * Math.PI * 5) > 0 ? 1 : .18;
  return (tone(t, 420, 'square') * .18 + tone(t, 210) * .1) * gate * envelope(t, duration, .02, .2);
});
writeWav('fatigue_breathe.wav', 1.8, (t, index, duration) => {
  const breath = Math.sin((t / duration) * Math.PI) ** 2;
  return (noise(index * .7) * .08 + tone(t, 58) * .05) * breath;
});
writeWav('cortex_pulse.wav', .12, beep([540, 720], .12, .14, 'square'));
writeWav('cortex_hit.wav', .18, (t, index, duration) => {
  const relay = tone(t, 310, 'triangle') * envelope(t, duration, .003, .06) * .12;
  return relay + noise(index * 11) * envelope(t, duration, .001, .05) * .06;
});
writeWav('cortex_miss.wav', .25, descending(280, 130, .16));
writeWav('root_unlock.wav', 1.1, (t, index, duration) => {
  const clunk = noise(index) * envelope(t, .09, .001, .08) * .28;
  const motor = tone(t, 86 + t * 44, 'triangle') * envelope(t, duration, .03, .25) * .18;
  const chime = tone(t, 240, 'triangle') * envelope(Math.max(0, t - .62), duration - .62, .02, .3) * .08;
  return clunk + motor + chime;
});
writeWav('planner_node.wav', .18, (t, index, duration) => {
  const relay = tone(t, 190, 'triangle') * envelope(t, duration, .002, .09) * .16;
  const contact = noise(index * 5) * envelope(t, duration, .001, .04) * .08;
  return relay + contact;
});
writeWav('planner_vector_tick.wav', .055, beep([900], .055, .055, 'square'));
writeWav('burn_execute.wav', 2.3, (t, index, duration) => {
  const thrust = noise(index * 2) * (.05 + t / duration * .12);
  const rumble = tone(t, 52 + Math.sin(t * 8) * 3) * (.1 + t / duration * .12);
  return (thrust + rumble) * envelope(t, duration, .08, .4);
});
writeWav('earth_capture.wav', 1.5, (t, index, duration) => {
  const lock = tone(t, 180 + t * 90, 'triangle') * envelope(t, duration, .03, .35) * .13;
  const carrier = tone(t, 72, 'sine') * envelope(t, duration, .02, .4) * .08;
  const shimmer = noise(index * 13) * envelope(t, duration, .04, .2) * .018;
  return lock + carrier + shimmer;
});
writeWav('central_sting.wav', 1.4, (t, index, duration) => {
  const bend = descending(260, 70, .14)(t, index, duration);
  const glitch = noise(index * 19) * (Math.sin(t * Math.PI * 18) > .35 ? .08 : 0);
  return (bend + glitch) * envelope(t, duration, .01, .25);
});
writeWav('ending_success.wav', 2.2, (t, _index, duration) => {
  const chord = tone(t, 220) * .08 + tone(t, 330) * .055 + tone(t, 440) * .045 + tone(t, 660) * .025;
  return chord * envelope(t, duration, .08, .6);
});
writeWav('ending_failure.wav', 2.2, descending(190, 42, .2));

console.log(`Generated ${fs.readdirSync(outDir).length} SFX files in ${outDir}`);
