export type PinType = 'd' | 'a' | 'p' | 'g'; // digital / analog / power / ground

export interface ComponentPinDef {
  key: string;      // e.g. 'A', 'SIG', 'TRIG'
  type: PinType;
  label: string;
}

export interface ComponentDef {
  id: string;
  name: string;
  icon: string;
  pins: ComponentPinDef[];
  wide?: boolean;
  help: string;
  defaultState: () => Record<string, any>;
}

export interface PlacedComponent {
  uid: number;
  type: string;
  x: number;
  y: number;
  pins: Record<string, string | null>; // pinKey -> board pin id ('D13', 'A0', 'GND', ...)
  state: Record<string, any>;
}

export interface BoardPinState {
  value?: number;   // 0/1
  pwm?: number;      // 0-255
  mode?: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  servoAngle?: number;
}

export type BoardPinsState = Record<string, BoardPinState>;
