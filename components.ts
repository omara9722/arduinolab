import type { ComponentDef } from './types';

// Ten starter components. Add a new one by adding an entry here — nothing
// else needs to change for the interpreter to be able to read/write it.
export const COMPONENT_LIBRARY: Record<string, ComponentDef> = {
  led: {
    id: 'led', name: 'LED', icon: '💡',
    pins: [{ key: 'A', type: 'd', label: 'A' }, { key: 'K', type: 'g', label: 'K' }],
    help: 'A = digital/PWM pin (brightness via analogWrite). K = GND.',
    defaultState: () => ({ on: false, pwm: 0 }),
  },
  rgbled: {
    id: 'rgbled', name: 'RGB LED', icon: '🌈',
    pins: [
      { key: 'R', type: 'd', label: 'R' }, { key: 'G', type: 'd', label: 'G' },
      { key: 'B', type: 'd', label: 'B' }, { key: 'GND', type: 'g', label: 'GND' },
    ],
    help: 'R/G/B on PWM pins, mixed via analogWrite (0-255 each).',
    defaultState: () => ({ r: 0, g: 0, b: 0 }),
  },
  button: {
    id: 'button', name: 'Push Button', icon: '🔘',
    pins: [{ key: 'SIG', type: 'd', label: 'SIG' }, { key: 'GND', type: 'g', label: 'GND' }],
    help: 'SIG to a digital pin (INPUT_PULLUP recommended). Reads LOW when pressed.',
    defaultState: () => ({ pressed: false }),
  },
  potentiometer: {
    id: 'potentiometer', name: 'Potentiometer', icon: '🎚️',
    pins: [{ key: 'WIPER', type: 'a', label: 'OUT' }],
    help: 'WIPER -> analog pin (A0-A5). Value 0-1023.',
    defaultState: () => ({ val: 512 }),
  },
  ldr: {
    id: 'ldr', name: 'Photoresistor', icon: '🔆',
    pins: [{ key: 'OUT', type: 'a', label: 'OUT' }],
    help: 'OUT -> analog pin. Simulates ambient light level (0=dark, 1023=bright).',
    defaultState: () => ({ val: 700 }),
  },
  buzzer: {
    id: 'buzzer', name: 'Buzzer', icon: '🔊',
    pins: [{ key: '+', type: 'd', label: '+' }, { key: '-', type: 'g', label: '-' }],
    help: '+ -> digital pin. Works with digitalWrite or tone()/noTone().',
    defaultState: () => ({ on: false }),
  },
  servo: {
    id: 'servo', name: 'Servo Motor', icon: '⚙️',
    pins: [
      { key: 'SIG', type: 'd', label: 'SIG' }, { key: '+', type: 'p', label: '5V' },
      { key: '-', type: 'g', label: 'GND' },
    ],
    help: 'SIG -> digital pin. Servo.attach(pin); Servo.write(angle);',
    defaultState: () => ({ angle: 90 }),
  },
  lcd1602: {
    id: 'lcd1602', name: 'LCD 16x2', icon: '🖥️', wide: true,
    pins: ['RS', 'EN', 'D4', 'D5', 'D6', 'D7'].map(k => ({ key: k, type: 'd', label: k })),
    help: 'LiquidCrystal lcd(RS,EN,D4,D5,D6,D7); lcd.print("...");',
    defaultState: () => ({ lines: ['', ''] }),
  },
  ultrasonic: {
    id: 'ultrasonic', name: 'Ultrasonic (HC-SR04)', icon: '📡',
    pins: [{ key: 'TRIG', type: 'd', label: 'TRG' }, { key: 'ECHO', type: 'd', label: 'ECH' }],
    help: 'pulseIn(echoPin, HIGH) after a 10us TRIG pulse returns echo time.',
    defaultState: () => ({ dist: 40 }),
  },
  dht11: {
    id: 'dht11', name: 'DHT11 Temp/Humidity', icon: '🌡️',
    pins: [{ key: 'DATA', type: 'd', label: 'DAT' }],
    help: 'DHT dht(pin, DHT11); dht.readTemperature(); dht.readHumidity();',
    defaultState: () => ({ temp: 24, hum: 45 }),
  },
};

export const BOARD_DIGITAL_PINS = 14; // D0-D13
export const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
export const BOARD_ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
