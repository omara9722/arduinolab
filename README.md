# ArduinoLab

A from-scratch Arduino circuit + code simulator for university students, with an
embedded AI teaching assistant. This is the **Claude Code starter** version — the
sibling of a working single-file demo (the "artifact" version), restructured as a
real codebase so it can grow into the "biggest project" scope: many components,
real wiring, and a proper backend.

## Why this split exists

The artifact version (single HTML file, published as a Claude Artifact) proves the
whole concept works end-to-end: circuit builder + Arduino-subset interpreter +
AI assistant, all in the browser. It's great for demos and for quick iteration,
but it can't scale past a few thousand lines in one file, and it can't hold a
server-side Anthropic API key (browser code is public).

This repo splits the same ideas into:

```
src/engine/       framework-agnostic simulation core (TypeScript, no DOM deps)
  types.ts          shared types (Pin, ComponentDef, BoardPinState, ...)
  components.ts      component library — add new parts here
  board.ts           Arduino Uno pin model + electrical read/write helpers
  interpreter.ts      Arduino-C-subset -> JS transpiler + sandboxed runner

src/web/           thin browser UI that imports the engine (Vite + TypeScript)
  main.ts            bootstraps a minimal working UI: code editor, run/stop,
                      serial monitor, board, and an assistant chat box —
                      enough to verify the engine end-to-end. NOT a full
                      drag-and-drop breadboard yet.

api/                Vercel serverless functions
  assistant.js        POST /api/assistant -> calls the Anthropic API server-side,
                       so the API key never reaches the browser. Reads
                       ANTHROPIC_API_KEY from the Vercel project's env vars.
```

The engine code is deliberately framework-agnostic (no React/Vue import) so you
can build whatever UI you want on top of it — React, Svelte, plain DOM — without
rewriting the simulation logic.

## Deploying to Vercel

This repo is Vercel-ready as-is:
1. Push it to a GitHub repo.
2. Import the repo in Vercel ("Add New… → Project"). Vercel auto-detects Vite
   for the frontend and picks up `api/assistant.js` as a serverless function
   automatically — no `vercel.json` needed.
3. In the Vercel project's **Settings → Environment Variables**, add
   `ANTHROPIC_API_KEY` with your key. Redeploy after adding it.
4. Your app is live at `https://<project>.vercel.app`, and the assistant chat
   box calls `/api/assistant` on the same domain (no CORS needed).

## Local development

```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY (used by `vercel dev`)
```

- `npm run dev` starts the Vite dev server on :5173 — good for iterating on
  the board/components/interpreter, but `/api/assistant` won't resolve (no
  API routes in plain Vite).
- To test the full stack locally (frontend + the serverless function
  together), install the Vercel CLI (`npm i -g vercel`) and run `vercel dev`
  instead — it serves both on one port and reads `.env` automatically.

Either way, you'll get a working simulator: paste/edit an Arduino sketch, hit
Run, watch the Serial Monitor. The component library already includes 10 parts
(LED, RGB LED, pushbutton, potentiometer, photoresistor, buzzer, servo, 16x2
LCD, HC-SR04 ultrasonic, DHT11) with the same pin-level behavior as the
artifact demo — `src/web/main.ts` just doesn't have a polished drag-and-drop
canvas yet. That's the biggest next step (see below).

## What's genuinely hard here (and already solved)

1. **The interpreter** (`src/engine/interpreter.ts`) — transpiles a practical
   subset of Arduino C++ (setup/loop, digitalWrite/Read, analogWrite/Read, delay,
   millis, tone/noTone, pulseIn, Serial, and Servo/LiquidCrystal/DHT "library"
   classes) into real, runnable JavaScript, executed in a sandboxed `Function`
   with a virtual clock so `delay()` doesn't freeze the UI. This is *not* a full
   AVR machine-code emulator — true byte-for-byte AVR emulation (e.g. via
   avr8js + a compiled .hex from a real avr-gcc toolchain) is a much bigger
   undertaking that needs a compile backend. This interpreter is the pragmatic,
   teaching-focused middle ground most classroom simulators actually use.
2. **The component model** (`src/engine/components.ts`, `board.ts`) — every part
   is defined once (pins, default state, visual state derivation) and consumed
   by both the interpreter (electrical read/write) and the UI (rendering).
   Adding an 11th component means adding one entry here.

## Roadmap (in rough priority order)

- [ ] **Real breadboard wiring UI** — drag components onto a canvas, click pins
      to wire them (the artifact version already does a simplified dropdown-based
      version of this — port and upgrade it to freehand wires in React).
- [ ] **More components** — motors (DC + H-bridge), 7-segment display, relay,
      IR receiver, rotary encoder, OLED (I2C), keypad.
- [ ] **True electrical simulation** — resistor networks, voltage dividers,
      short-circuit detection — instead of the current "pin state" model.
- [ ] **Real AVR execution (stretch goal)** — integrate `avr8js` and a
      WebAssembly-compiled `avr-gcc` (or a small compile backend) so actual
      compiled `.hex` binaries run, for students who need byte-accurate behavior.
- [ ] **Assignments & auto-grading** — spec upload, rubric-based grading via the
      `/api/assistant` endpoint (already scaffolded to accept a `mode: "grade"`
      request), gradebook export for instructors.
- [ ] **Multiplayer / classroom mode** — instructor dashboard watching student
      boards live, shared circuit templates.
- [ ] **Persistence** — swap `localStorage` (fine for solo use) for a real
      database once there's a login system, so students can save projects across
      devices.

## AI assistant integration

`api/assistant.js` exposes `POST /api/assistant` with `{ mode, circuit, code,
serialOutput, spec, message }` and returns `{ text }`. It builds the same kind
of teaching-context prompt the artifact version builds client-side, but keeps
the Anthropic API key server-only. `src/web/main.ts` already wires a basic chat
box to it; extend `mode` (`'explain' | 'debug' | 'grade' | 'general'`) as you
build out the richer assistant UI from the artifact demo.
