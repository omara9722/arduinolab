import { COMPONENT_LIBRARY } from '../engine/components';
import { freshBoardState } from '../engine/board';
import { runSketch, type RunContext } from '../engine/interpreter';
import type { PlacedComponent, BoardPinsState } from '../engine/types';

// This is a deliberately bare-bones UI — just enough to prove the engine
// works end to end. The artifact demo has a much richer drag-and-drop
// breadboard; port that in (or build a nicer one) as the next step, using
// this file as the wiring reference for how the UI talks to the engine.

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div style="font-family:sans-serif;max-width:900px;margin:20px auto;display:flex;flex-direction:column;gap:10px;">
    <h2>ArduinoLab (engine bootstrap)</h2>
    <p style="color:#666;font-size:13px;">
      Components in the library: ${Object.values(COMPONENT_LIBRARY).map(c => c.icon + ' ' + c.name).join(', ')}
    </p>
    <div style="display:flex;gap:6px;">
      <button id="run">▶ Run</button>
      <button id="stop" disabled>■ Stop</button>
      <label>Speed <input id="speed" type="range" min="1" max="8" value="3"></label>
    </div>
    <textarea id="code" style="width:100%;height:220px;font-family:monospace;font-size:13px;"></textarea>
    <pre id="serial" style="background:#111;color:#8fe88f;padding:10px;height:160px;overflow:auto;"></pre>
    <div style="border-top:1px solid #ddd;padding-top:10px;">
      <strong>AI assistant</strong>
      <div style="display:flex;gap:6px;margin:6px 0;">
        <input id="chatInput" style="flex:1;" placeholder="Ask about your code or circuit…">
        <button id="chatSend">Ask</button>
      </div>
      <div id="chatOut" style="white-space:pre-wrap;background:#f5f5f5;padding:8px;min-height:40px;font-size:13px;"></div>
    </div>
  </div>
`;

const codeEl = document.querySelector<HTMLTextAreaElement>('#code')!;
const serialEl = document.querySelector<HTMLPreElement>('#serial')!;
const runBtn = document.querySelector<HTMLButtonElement>('#run')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stop')!;
const speedEl = document.querySelector<HTMLInputElement>('#speed')!;

codeEl.value = `void setup(){\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop(){\n  digitalWrite(13, HIGH);\n  Serial.println("LED on");\n  delay(500);\n  digitalWrite(13, LOW);\n  Serial.println("LED off");\n  delay(500);\n}`;

// A single LED wired to D13, for the bootstrap demo.
const components: PlacedComponent[] = [
  { uid: 1, type: 'led', x: 0, y: 0, pins: { A: 'D13', K: 'GND' }, state: COMPONENT_LIBRARY.led.defaultState() },
];
let board: BoardPinsState = freshBoardState();

let stoppedFlag = { v: false };

async function run() {
  board = freshBoardState();
  serialEl.textContent = '';
  stoppedFlag = { v: false };
  runBtn.disabled = true;
  stopBtn.disabled = false;
  const ctx: RunContext = {
    components, board,
    speedFactor: () => Number(speedEl.value),
    onSerial: (line) => { serialEl.textContent += line + '\n'; serialEl.scrollTop = 999999; },
    onBuzzer: () => {},
    onChange: () => { /* re-render component visuals here */ },
    stopped: () => stoppedFlag.v,
  };
  try {
    await runSketch(codeEl.value, ctx);
  } catch (e: any) {
    if (e.message !== '__STOPPED__') serialEl.textContent += '⛔ ' + e.message + '\n';
  } finally {
    runBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

runBtn.onclick = run;
stopBtn.onclick = () => { stoppedFlag.v = true; runBtn.disabled = false; stopBtn.disabled = true; };

// Talks to /api/assistant (a Vercel serverless function — see api/assistant.js).
// Works when deployed to Vercel, or locally via `vercel dev` (plain `vite`
// dev server has no /api routes).
const chatInput = document.querySelector<HTMLInputElement>('#chatInput')!;
const chatSend = document.querySelector<HTMLButtonElement>('#chatSend')!;
const chatOut = document.querySelector<HTMLDivElement>('#chatOut')!;

async function askAssistant() {
  const message = chatInput.value.trim();
  if (!message) return;
  chatOut.textContent = 'Thinking…';
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'general',
        circuit: components.map(c => `${c.type} #${c.uid}: ${JSON.stringify(c.pins)}`).join('\n'),
        code: codeEl.value,
        serialOutput: serialEl.textContent,
        spec: '',
        message,
      }),
    });
    const data = await res.json();
    chatOut.textContent = data.text || data.error || 'No response.';
  } catch (e: any) {
    chatOut.textContent = 'Error reaching /api/assistant: ' + e.message;
  }
}
chatSend.onclick = askAssistant;
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') askAssistant(); });
