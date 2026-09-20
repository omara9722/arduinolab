import type { BoardPinsState, PlacedComponent } from './types';
import { componentsOnPin, syncComponentFromPin } from './board';
import { BOARD_ANALOG_PINS } from './components';

/**
 * Translates a practical subset of Arduino C++ into runnable JavaScript.
 * This is NOT a real C++ parser — it's a set of targeted regex rewrites that
 * cover the constructs actually used in intro/university Arduino sketches:
 * setup()/loop(), C-style declarations, delay()/pulseIn() needing to become
 * awaitable, and #include stripping. Good enough for teaching; not a
 * substitute for a real AVR emulator (see README roadmap).
 */
export function transpile(src: string): string {
  let code = src;
  code = code.replace(/#include\s*<[^>]+>/g, '');
  code = code.replace(/\bvoid\s+setup\s*\(\s*\)/, 'async function setup()');
  code = code.replace(/\bvoid\s+loop\s*\(\s*\)/, 'async function loop()');
  code = code.replace(
    /\b(int|float|double|long|unsigned long|unsigned int|byte|char|bool|boolean|String|short)\s+(?=[A-Za-z_])/g,
    'let '
  );
  code = code.replace(/\bconst\s+let\b/g, 'const');
  code = code.replace(/\bdelay\s*\(/g, 'await __delay(');
  code = code.replace(/\bpulseIn\s*\(/g, 'await __pulseIn(');
  return code;
}

export interface RunContext {
  components: PlacedComponent[];
  board: BoardPinsState;
  speedFactor: () => number;
  onSerial: (line: string) => void;
  onBuzzer: (on: boolean, freq?: number) => void;
  onChange: () => void; // call after any state mutation so the UI can re-render
  stopped: () => boolean;
}

/** Builds the sandboxed global scope a transpiled sketch executes inside. */
export function buildSandbox(ctx: RunContext) {
  const { components, board, speedFactor, onSerial, onBuzzer, onChange, stopped } = ctx;

  function checkAbort() {
    if (stopped()) throw new Error('__STOPPED__');
  }

  async function __delay(ms: number) {
    checkAbort();
    const scaled = Math.max(1, ms / speedFactor());
    await new Promise(res => setTimeout(res, Math.min(scaled, 4000)));
    checkAbort();
  }

  function pinMode(pin: number, mode: number) {
    const id = 'D' + pin;
    board[id] = board[id] || { value: 0, pwm: 0 };
    board[id].mode = mode === 1 ? 'OUTPUT' : mode === 2 ? 'INPUT_PULLUP' : 'INPUT';
  }

  function digitalWrite(pin: number, val: number) {
    const id = 'D' + pin;
    board[id] = board[id] || { value: 0, pwm: 0 };
    board[id].value = val ? 1 : 0;
    board[id].pwm = board[id].value ? 255 : 0;
    for (const { c, pinKey } of componentsOnPin(components, id)) syncComponentFromPin(c, pinKey, board);
    onChange();
  }

  function digitalRead(pin: number): number {
    const id = 'D' + pin;
    const hits = componentsOnPin(components, id);
    const btn = hits.find(h => h.c.type === 'button');
    if (btn) return btn.c.state.pressed ? 0 : 1; // pull-up convention
    return board[id]?.value ? 1 : 0;
  }

  function analogWrite(pin: number, val: number) {
    const id = 'D' + pin;
    val = Math.max(0, Math.min(255, val | 0));
    board[id] = board[id] || { value: 0, pwm: 0 };
    board[id].pwm = val;
    board[id].value = val > 0 ? 1 : 0;
    for (const { c, pinKey } of componentsOnPin(components, id)) syncComponentFromPin(c, pinKey, board);
    onChange();
  }

  function analogRead(pin: number | string): number {
    const id = typeof pin === 'string' ? pin : BOARD_ANALOG_PINS[pin] || 'A' + pin;
    const hits = componentsOnPin(components, id);
    const sensor = hits.find(h => h.c.type === 'potentiometer' || h.c.type === 'ldr');
    if (sensor) return sensor.c.state.val;
    return board[id]?.value || 0;
  }

  async function __pulseIn(pin: number): Promise<number> {
    checkAbort();
    const id = 'D' + pin;
    const hit = componentsOnPin(components, id).find(h => h.c.type === 'ultrasonic');
    if (hit) {
      await __delay(2);
      return Math.round(hit.c.state.dist * 58);
    }
    return 0;
  }

  function tone(pin: number, freq: number, dur?: number) {
    const id = 'D' + pin;
    const hit = componentsOnPin(components, id).find(h => h.c.type === 'buzzer');
    if (hit) {
      hit.c.state.on = true;
      onBuzzer(true, freq);
      onChange();
      if (dur) setTimeout(() => { hit.c.state.on = false; onBuzzer(false); onChange(); }, dur / speedFactor());
    }
  }
  function noTone(pin: number) {
    const id = 'D' + pin;
    const hit = componentsOnPin(components, id).find(h => h.c.type === 'buzzer');
    if (hit) { hit.c.state.on = false; onChange(); }
    onBuzzer(false);
  }

  const simStart = performance.now();
  function millis() { return Math.round((performance.now() - simStart) * speedFactor()); }
  function micros() { return millis() * 1000; }

  const Serial = { begin() {}, print(x: any) { onSerial(String(x)); }, println(x: any) { onSerial(String(x ?? '')); } };

  class Servo {
    pin: string | null = null;
    attach(pin: number) { this.pin = 'D' + pin; }
    write(angle: number) {
      if (!this.pin) return;
      board[this.pin] = board[this.pin] || {};
      board[this.pin].servoAngle = angle;
      for (const { c, pinKey } of componentsOnPin(components, this.pin)) syncComponentFromPin(c, pinKey, board);
      onChange();
    }
    writeMicroseconds(us: number) { this.write(Math.round(((us - 1000) / 1000) * 180)); }
    read() { return (this.pin && board[this.pin]?.servoAngle) || 90; }
  }

  class LiquidCrystal {
    lcd = components.find(c => c.type === 'lcd1602');
    row = 0; col = 0;
    begin() {}
    clear() { if (this.lcd) { this.lcd.state.lines = ['', '']; onChange(); } }
    setCursor(col: number, row: number) { this.col = col; this.row = row; }
    print(txt: any) {
      if (!this.lcd) return;
      const s = String(txt);
      let line = this.lcd.state.lines[this.row] || '';
      line = line.padEnd(this.col, ' ').slice(0, this.col) + s + line.slice(this.col + s.length);
      this.lcd.state.lines[this.row] = line.slice(0, 16);
      onChange();
    }
  }

  class DHT {
    pin: string;
    constructor(pin: number) { this.pin = 'D' + pin; }
    begin() {}
    readTemperature() { return componentsOnPin(components, this.pin).find(h => h.c.type === 'dht11')?.c.state.temp ?? NaN; }
    readHumidity() { return componentsOnPin(components, this.pin).find(h => h.c.type === 'dht11')?.c.state.hum ?? NaN; }
  }

  return {
    pinMode, digitalWrite, digitalRead, analogWrite, analogRead, __delay, __pulseIn, tone, noTone,
    millis, micros, Serial, Servo, LiquidCrystal, DHT, DHT11: 'DHT11',
    HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2,
    A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5',
    map: (x: number, a: number, b: number, c: number, d: number) => ((x - a) * (d - c)) / (b - a) + c,
    constrain: (x: number, a: number, b: number) => Math.max(a, Math.min(b, x)),
    min: Math.min, max: Math.max, abs: Math.abs,
    random: (a: number, b?: number) => (b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a))),
    console: { log: (...a: any[]) => onSerial(a.join(' ')) },
  };
}

/** Compiles + runs a sketch. Call `signal.stopped = true` from outside to stop it. */
export async function runSketch(src: string, ctx: RunContext) {
  const transpiled = transpile(src);
  const sandbox = buildSandbox(ctx);
  const argNames = Object.keys(sandbox);
  const argVals = Object.values(sandbox);
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    ...argNames,
    transpiled + '\nreturn {setup:(typeof setup!=="undefined"?setup:null), loop:(typeof loop!=="undefined"?loop:null)};'
  );
  const { setup, loop } = factory(...argVals);
  if (!setup || !loop) throw new Error('Sketch must define void setup() and void loop().');
  ctx.onSerial('▶ Sketch started');
  await setup();
  while (!ctx.stopped()) {
    await loop();
  }
}
