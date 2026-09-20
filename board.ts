import type { BoardPinsState, PlacedComponent } from './types';
import { COMPONENT_LIBRARY, BOARD_DIGITAL_PINS, BOARD_ANALOG_PINS } from './components';

export function freshBoardState(): BoardPinsState {
  const st: BoardPinsState = {};
  for (let i = 0; i < BOARD_DIGITAL_PINS; i++) st['D' + i] = { value: 0, pwm: 0, mode: 'INPUT' };
  BOARD_ANALOG_PINS.forEach(a => (st[a] = { value: 0 }));
  return st;
}

/** Find every placed component pin wired to a given board pin id ('D13', 'A0', ...). */
export function componentsOnPin(components: PlacedComponent[], pinId: string) {
  const hits: { c: PlacedComponent; pinKey: string }[] = [];
  for (const c of components) {
    const def = COMPONENT_LIBRARY[c.type];
    if (!def) continue;
    for (const p of def.pins) {
      if (c.pins[p.key] === pinId) hits.push({ c, pinKey: p.key });
    }
  }
  return hits;
}

/**
 * Re-derive a component's visual state (on/off, angle, color, lcd text, etc.)
 * from the current board pin electrical state. Called after any digitalWrite /
 * analogWrite / Servo.write / LiquidCrystal.print so the UI can just render
 * `component.state` without knowing about pins at all.
 */
export function syncComponentFromPin(c: PlacedComponent, pinKey: string, board: BoardPinsState) {
  const pinId = c.pins[pinKey];
  if (!pinId) return;
  const st = board[pinId] || {};
  if (c.type === 'led' && pinKey === 'A') {
    c.state.on = !!st.value || (st.pwm || 0) > 0;
    c.state.pwm = st.pwm || (st.value ? 255 : 0);
  }
  if (c.type === 'rgbled') {
    const v = st.pwm || (st.value ? 255 : 0);
    if (pinKey === 'R') c.state.r = v;
    if (pinKey === 'G') c.state.g = v;
    if (pinKey === 'B') c.state.b = v;
  }
  if (c.type === 'buzzer' && pinKey === '+') c.state.on = !!st.value;
  if (c.type === 'servo' && pinKey === 'SIG' && st.servoAngle !== undefined) c.state.angle = st.servoAngle;
}
