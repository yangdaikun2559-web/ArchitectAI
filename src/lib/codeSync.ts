import { FileEntry, PinConnection, ComponentItem } from '../types';
import { DEFAULT_COMPONENTS } from '../data/defaultHardware';

/**
 * Utility to parse port letter and pin number from STM32 pin name (e.g. PA8, PB12, PC13)
 */
interface STM32PinParts {
  port: string;      // "A", "B", "C" etc
  pinNum: string;    // "8", "12", "13"
  gpioPort: string;  // "GPIOA", "GPIOB"
  gpioPin: string;   // "GPIO_Pin_8", "GPIO_Pin_12"
  gpioRcc: string;   // "RCC_APB2Periph_GPIOA"
}

export function parseSTM32Pin(pinName: string): STM32PinParts | null {
  const clean = pinName.toUpperCase().trim();
  const match = clean.match(/^P([A-G])(\d+)$/);
  if (!match) return null;

  const port = match[1];
  const pinNum = match[2];
  return {
    port,
    pinNum,
    gpioPort: `GPIO${port}`,
    gpioPin: `GPIO_Pin_${pinNum}`,
    gpioRcc: `RCC_APB2Periph_GPIO${port}`,
  };
}

/**
 * Utility to extract numeric pin number from ESP32 pin name (e.g. "GPIO21" -> "21", "15" -> "15")
 */
export function parseESP32Pin(pinName: string): string {
  const clean = pinName.toUpperCase().trim();
  const match = clean.match(/\d+/);
  return match ? match[0] : clean;
}

interface MacroCandidates {
  role: 'sda' | 'scl' | 'gpio';
  esp32: string[];
  stm32Ports: string[];
  stm32Pins: string[];
  stm32Clocks: string[];
}

/**
 * Normalizes a component name into candidate uppercase C-macro prefixes and synonyms
 */
export function getCleanPrefixes(toComponent: string): string[] {
  // Strip non-ASCII/Chinese characters
  let clean = toComponent.replace(/[^\x00-\x7F]/g, ' ').trim();
  // Replace non-alphanumeric with spaces, keeping dashes and underscores
  clean = clean.replace(/[^a-zA-Z0-9_\-]/g, ' ');
  
  const rawWords = clean.split(/\s+/).map(w => w.toUpperCase().trim()).filter(Boolean);
  const prefixes = new Set<string>();
  
  if (rawWords.length === 0) {
    return ['SENSOR'];
  }
  
  // 1. Full snake_case name (e.g. "SG90_SERVO")
  const fullSnake = rawWords.join('_').replace(/-+/g, '_');
  prefixes.add(fullSnake);
  
  // 2. Full concatenated name (e.g. "SG90SERVO")
  const fullConcat = rawWords.join('').replace(/[^A-Z0-9]/g, '');
  prefixes.add(fullConcat);

  // 3. Add individual words (like MQ, 2, DHT22)
  rawWords.forEach(w => {
    const cleanWord = w.replace(/[^A-Z0-9_]/g, '');
    if (cleanWord.length > 1 || cleanWord.match(/^\d+$/)) {
      prefixes.add(cleanWord);
    }
  });

  // 4. Add common variations and synonyms based on device name
  const fullUpper = toComponent.toUpperCase();
  if (fullUpper.includes('DHT') || fullUpper.includes('AHT') || fullUpper.includes('HUMI') || fullUpper.includes('TEMP') || fullUpper.includes('SGP')) {
    prefixes.add('DHT');
    prefixes.add('DHT22');
    prefixes.add('AHT');
    prefixes.add('SENSOR');
  }
  if (fullUpper.includes('BUZZER') || fullUpper.includes('BUZZ') || fullUpper.includes('BEEP') || fullUpper.includes('ALARM') || fullUpper.includes('SPEAKER')) {
    prefixes.add('BUZZER');
    prefixes.add('BUZZ');
    prefixes.add('ALARM');
    prefixes.add('BEEP');
  }
  if (fullUpper.includes('RELAY') || fullUpper.includes('SWITCH') || fullUpper.includes('VALVE') || fullUpper.includes('RELAYS')) {
    prefixes.add('RELAY');
    prefixes.add('SWITCH');
  }
  if (fullUpper.includes('OLED') || fullUpper.includes('LCD') || fullUpper.includes('SCREEN') || fullUpper.includes('DISPLAY')) {
    prefixes.add('OLED');
    prefixes.add('LCD');
    prefixes.add('DISPLAY');
    prefixes.add('SCREEN');
  }
  if (fullUpper.includes('SERVO') || fullUpper.includes('MOTOR') || fullUpper.includes('STEPC') || fullUpper.includes('SG90')) {
    prefixes.add('SERVO');
    prefixes.add('MOTOR');
  }
  if (fullUpper.includes('MQ') || fullUpper.includes('GAS') || fullUpper.includes('SMOKE')) {
    prefixes.add('MQ');
    prefixes.add('MQ2');
    prefixes.add('GAS');
  }

  return Array.from(prefixes);
}

/**
 * Dynamically computes macro candidates for a given connection
 */
export function getDynamicMacros(conn: PinConnection, components: ComponentItem[] = DEFAULT_COMPONENTS): MacroCandidates {
  const toPin = conn.toPin.toUpperCase().trim();
  const sig = (conn.signalType || '').toUpperCase().trim();
  
  const isSda = sig === 'I2C_SDA' || toPin === 'SDA';
  const isScl = sig === 'I2C_SCL' || toPin === 'SCL';
  
  if (isSda) {
    return {
      role: 'sda',
      esp32: ['WIRE_SDA', 'OLED_SDA', 'SDA', 'I2C_SDA', 'SSD1306_SDA'],
      stm32Ports: ['OLED_SDA_PORT', 'OLED_SDA_GPIO', 'I2C_SDA_PORT', 'SSD1306_SDA_PORT', 'I2C_PORT', 'I2C_SDA_GPIO_PORT'],
      stm32Pins: ['OLED_SDA_PIN', 'I2C_SDA_PIN', 'SSD1306_SDA_PIN', 'I2C_SDA_GPIO_PIN'],
      stm32Clocks: ['OLED_SDA_RCC', 'OLED_SDA_CLK', 'I2C_SDA_CLK', 'OLED_RCC', 'OLED_CLK']
    };
  }
  
  if (isScl) {
    return {
      role: 'scl',
      esp32: ['WIRE_SCL', 'OLED_SCL', 'SCL', 'I2C_SCL', 'SSD1306_SCL'],
      stm32Ports: ['OLED_SCL_PORT', 'OLED_SCL_GPIO', 'I2C_SCL_PORT', 'SSD1306_SCL_PORT', 'I2C_PORT', 'I2C_SCL_GPIO_PORT'],
      stm32Pins: ['OLED_SCL_PIN', 'I2C_SCL_PIN', 'SSD1306_SCL_PIN', 'I2C_SCL_GPIO_PIN'],
      stm32Clocks: ['OLED_SCL_RCC', 'OLED_SCL_CLK', 'I2C_SCL_CLK']
    };
  }

  // Generate generic candidate lists based on registry prefix, fallback to guesser
  const regComp = components.find(c => 
    c.name.toLowerCase().includes(conn.toComponent.toLowerCase()) || 
    conn.toComponent.toLowerCase().includes(c.name.toLowerCase()) ||
    (c.macroPrefix && conn.toComponent.toLowerCase().includes(c.macroPrefix.toLowerCase()))
  );
  const prefixes = regComp?.macroPrefix ? [regComp.macroPrefix] : getCleanPrefixes(conn.toComponent);
  const esp32: string[] = [];
  const stm32Ports: string[] = [];
  const stm32Pins: string[] = [];
  const stm32Clocks: string[] = [];

  prefixes.forEach(p => {
    // Normalizing characters to be valid macro names
    const macroPref = p.replace(/[^A-Z0-9_]/g, '_');
    const pinName = toPin.replace(/[^A-Z0-9_]/g, '_');
    
    // ESP32 Candidates
    esp32.push(`${macroPref}_PIN`);
    esp32.push(`PIN_${macroPref}`);
    esp32.push(`${macroPref}PIN`);
    esp32.push(`${macroPref}_GPIO`);
    if (pinName && pinName !== 'DATA' && pinName !== 'IO' && pinName !== 'I_O') {
      esp32.push(`${macroPref}_${pinName}_PIN`);
      esp32.push(`PIN_${macroPref}_${pinName}`);
      esp32.push(`${macroPref}_${pinName}`);
      esp32.push(`${macroPref}${pinName}`);
    }
    
    // STM32 Port Candidates
    stm32Ports.push(`${macroPref}_PORT`);
    stm32Ports.push(`${macroPref}_GPIO_PORT`);
    stm32Ports.push(`${macroPref}_GPIO`);
    if (pinName && pinName !== 'DATA' && pinName !== 'IO' && pinName !== 'I_O') {
      stm32Ports.push(`${macroPref}_${pinName}_PORT`);
      stm32Ports.push(`${macroPref}_${pinName}_GPIO_PORT`);
      stm32Ports.push(`${macroPref}_${pinName}_GPIO`);
      stm32Ports.push(`${macroPref}_GPIO_${pinName}_PORT`);
    }
    
    // STM32 Pin Candidates
    stm32Pins.push(`${macroPref}_PIN`);
    stm32Pins.push(`${macroPref}_GPIO_PIN`);
    if (pinName && pinName !== 'DATA' && pinName !== 'IO' && pinName !== 'I_O') {
      stm32Pins.push(`${macroPref}_${pinName}_PIN`);
      stm32Pins.push(`${macroPref}_${pinName}_GPIO_PIN`);
      stm32Pins.push(`${macroPref}_GPIO_PIN_${pinName}`);
    }
    
    // STM32 Clock Candidates
    stm32Clocks.push(`${macroPref}_RCC`);
    stm32Clocks.push(`${macroPref}_CLK`);
    stm32Clocks.push(`${macroPref}_GPIO_CLK`);
    if (pinName && pinName !== 'DATA' && pinName !== 'IO' && pinName !== 'I_O') {
      stm32Clocks.push(`${macroPref}_${pinName}_RCC`);
      stm32Clocks.push(`${macroPref}_${pinName}_CLK`);
      stm32Clocks.push(`${macroPref}_${pinName}_GPIO_CLK`);
      stm32Clocks.push(`${macroPref}_GPIO_CLK_${pinName}`);
    }
  });

  return {
    role: 'gpio',
    esp32,
    stm32Ports,
    stm32Pins,
    stm32Clocks
  };
}

/**
 * Main synchronization engine
 * Takes current file entries, parses changed connections, and updates code contents intelligently.
 * Dynamically resolves macro matching rules without static hardcoding.
 */
export function syncFirmwarePins(
  files: FileEntry[],
  originalConns: PinConnection[],
  tunedConns: PinConnection[],
  platform: string,
  components: ComponentItem[] = DEFAULT_COMPONENTS
): FileEntry[] {
  if (!originalConns || !tunedConns || originalConns.length === 0 || tunedConns.length === 0) {
    return files;
  }

  const isSTM32 = platform.toUpperCase().includes('STM32');
  let updatedFiles = [...files];

  // Map original connections by Key to detect pin adjustments
  const originalMap = new Map<string, PinConnection>();
  originalConns.forEach(c => {
    const key = `${c.toComponent.toUpperCase()}_${c.toPin.toUpperCase()}`;
    originalMap.set(key, c);
  });

  // Check what was tuned/changed
  tunedConns.forEach((currentConn) => {
    const key = `${currentConn.toComponent.toUpperCase()}_${currentConn.toPin.toUpperCase()}`;
    const orig = originalMap.get(key);
    if (!orig) return; // No matched connection

    const oldPin = orig.fromPin.toUpperCase().trim();
    const newPin = currentConn.fromPin.toUpperCase().trim();

    // If pin has indeed been tuned / changed manually
    if (oldPin !== newPin) {
      const macros = getDynamicMacros(currentConn, components);

      // Apply specific replacements based on the target platform framework
      if (isSTM32) {
        const oldParts = parseSTM32Pin(oldPin);
        const newParts = parseSTM32Pin(newPin);

        if (oldParts && newParts) {
          updatedFiles = updatedFiles.map(file => {
            let content = file.content;
            const ext = file.path.split('.').pop()?.toLowerCase();

            // 1. Macro replacements inside source code files (.c, .h, .cpp)
            if (ext === 'c' || ext === 'h' || ext === 'cpp') {
              // 1.1 Replace Port Macros
              macros.stm32Ports.forEach(cand => {
                const portReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO[A-G])\\b`, 'g');
                content = content.replace(portReg, `$1${newParts.gpioPort}`);
              });

              // 1.2 Replace Pin Macros
              macros.stm32Pins.forEach(cand => {
                const pinReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO_Pin_\\d+)\\b`, 'g');
                content = content.replace(pinReg, `$1${newParts.gpioPin}`);
              });

              // 1.3 Replace RCC Clocks
              macros.stm32Clocks.forEach(cand => {
                const clkReg = new RegExp(`(#define\\s+${cand}\\s+)(RCC_APB2Periph_GPIO[A-G])\\b`, 'g');
                content = content.replace(clkReg, `$1${newParts.gpioRcc}`);
              });

              // 1.4 Apply fallback literal swap of PA8 to PA10 etc. inside relevant implementation files
              const prefixes = getCleanPrefixes(currentConn.toComponent);
              const isRelevantFile = file.path.includes('main') || prefixes.some(pref => {
                const normalizedPath = file.path.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const normalizedPref = pref.replace(/[^A-Z0-9]/g, '');
                return normalizedPath.includes(normalizedPref);
              });

              if (isRelevantFile) {
                content = content.replace(new RegExp(`\\b${oldParts.gpioPort}\\b`, 'g'), newParts.gpioPort);
                content = content.replace(new RegExp(`\\b${oldParts.gpioPin}\\b`, 'g'), newParts.gpioPin);
                content = content.replace(new RegExp(`\\b${oldParts.gpioRcc}\\b`, 'g'), newParts.gpioRcc);
              }
            }

            // 2. Textual reference replacements in Documentation / README.md / configs
            if (ext === 'md' || ext === 'ini' || ext === 'txt') {
              const labelReg = new RegExp(`\\b${oldPin}\\b`, 'g');
              content = content.replace(labelReg, newPin);

              const labelLowerReg = new RegExp(`\\b${oldPin.toLowerCase()}\\b`, 'g');
              content = content.replace(labelLowerReg, newPin.toLowerCase());
            }

            return { ...file, content };
          });
        }
      } else {
        // ESP32 Arduino framework macro updates
        const oldNum = parseESP32Pin(oldPin);
        const newNum = parseESP32Pin(newPin);

        updatedFiles = updatedFiles.map(file => {
          let content = file.content;
          const ext = file.path.split('.').pop()?.toLowerCase();

          if (ext === 'cpp' || ext === 'h' || ext === 'ino') {
            macros.esp32.forEach(cand => {
              // Match #define CANDIDATE 15 (or GPIO15)
              const defReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO)?(${oldNum})\\b`, 'g');
              content = content.replace(defReg, `$1$2${newNum}`);

              // Const vars: const int CANDIDATE = 15;
              const constReg = new RegExp(`(\\bconst\\s+int\\s+${cand}\\s*=\\s*)(GPIO)?(${oldNum})\\b`, 'gi');
              content = content.replace(constReg, `$1$2${newNum}`);

              // Normal vars: int CANDIDATE = 15;
              const varReg = new RegExp(`(\\bint\\s+${cand}\\s*=\\s*)(GPIO)?(${oldNum})\\b`, 'gi');
              content = content.replace(varReg, `$1$2${newNum}`);
            });

            // Also check for SCL/SDA Wire.begin overrides
            if (macros.role === 'sda' || macros.role === 'scl') {
              if (file.path.includes('main') || file.path.includes('pins')) {
                if (macros.role === 'sda') {
                  const wireSdaReg = new RegExp(`(Wire\\.begin\\s*\\(\\s*)${oldNum}(\\s*,)`, 'g');
                  content = content.replace(wireSdaReg, `$1${newNum}$2`);
                } else {
                  const wireSclReg = new RegExp(`(Wire\\.begin\\s*\\(\\s*\\d+\\s*,\\s*)${oldNum}(\\s*\\))`, 'g');
                  content = content.replace(wireSclReg, `$1${newNum}$2`);
                }
              }
            }
          }

          if (ext === 'md' || ext === 'ini' || ext === 'txt') {
            const labelReg = new RegExp(`\\b${oldPin}\\b`, 'g');
            content = content.replace(labelReg, newPin);

            const labelLowerReg = new RegExp(`\\b${oldPin.toLowerCase()}\\b`, 'g');
            content = content.replace(labelLowerReg, newPin.toLowerCase());
          }

          return { ...file, content };
        });
      }
    }
  });

  return updatedFiles;
}

/**
 * Post-generation synchronizer that takes connection mapping as the source of truth,
 * resolves MCU pin configuration, and overwrites source code macros to guarantee 100% alignment.
 */
export function syncCodeFromConnections(
  files: FileEntry[],
  connections: PinConnection[],
  platform: string,
  components: ComponentItem[] = DEFAULT_COMPONENTS
): FileEntry[] {
  if (!connections || connections.length === 0) {
    return files;
  }

  const isSTM32 = platform.toUpperCase().includes('STM32');
  let updatedFiles = [...files];

  connections.forEach((conn) => {
    const newPin = conn.fromPin.toUpperCase().trim();
    const macros = getDynamicMacros(conn, components);

    // Let's find the current pin definition in the files first to act as "oldPin"
    let oldPin: string | null = null;

    if (isSTM32) {
      // Look for a pin macro and port macro to construct the old pin
      // e.g., #define OLED_SDA_PIN GPIO_Pin_7 and #define OLED_SDA_PORT GPIOB -> PB7
      let portLetter: string | null = null;
      let pinNum: string | null = null;

      for (const file of updatedFiles) {
        const ext = file.path.split('.').pop()?.toLowerCase();
        if (ext !== 'h' && ext !== 'c' && ext !== 'cpp') continue;

        // Try to match pin macro
        for (const pinCand of macros.stm32Pins) {
          const pinReg = new RegExp(`#define\\s+${pinCand}\\s+GPIO_Pin_(\\d+)\\b`);
          const pinMatch = file.content.match(pinReg);
          if (pinMatch) {
            pinNum = pinMatch[1];
            break;
          }
        }

        // Try to match port macro
        for (const portCand of macros.stm32Ports) {
          const portReg = new RegExp(`#define\\s+${portCand}\\s+GPIO([A-G])\\b`);
          const portMatch = file.content.match(portReg);
          if (portMatch) {
            portLetter = portMatch[1];
            break;
          }
        }

        if (portLetter && pinNum) {
          oldPin = `P${portLetter}${pinNum}`;
          break;
        }
      }

      if (oldPin && oldPin !== newPin) {
        const oldParts = parseSTM32Pin(oldPin);
        const newParts = parseSTM32Pin(newPin);

        if (oldParts && newParts) {
          updatedFiles = updatedFiles.map(file => {
            let content = file.content;
            const ext = file.path.split('.').pop()?.toLowerCase();

            if (ext === 'c' || ext === 'h' || ext === 'cpp') {
              // Replace Port Macros
              macros.stm32Ports.forEach(cand => {
                const portReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO[A-G])\\b`, 'g');
                content = content.replace(portReg, `$1${newParts.gpioPort}`);
              });

              // Replace Pin Macros
              macros.stm32Pins.forEach(cand => {
                const pinReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO_Pin_\\d+)\\b`, 'g');
                content = content.replace(pinReg, `$1${newParts.gpioPin}`);
              });

              // Replace RCC Clocks
              macros.stm32Clocks.forEach(cand => {
                const clkReg = new RegExp(`(#define\\s+${cand}\\s+)(RCC_APB2Periph_GPIO[A-G])\\b`, 'g');
                content = content.replace(clkReg, `$1${newParts.gpioRcc}`);
              });

              // Apply literal replacements in main and peripheral implementation files
              const prefixes = getCleanPrefixes(conn.toComponent);
              const isRelevantFile = file.path.includes('main') || prefixes.some(pref => {
                const normalizedPath = file.path.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const normalizedPref = pref.replace(/[^A-Z0-9]/g, '');
                return normalizedPath.includes(normalizedPref);
              });

              if (isRelevantFile) {
                content = content.replace(new RegExp(`\\b${oldParts.gpioPort}\\b`, 'g'), newParts.gpioPort);
                content = content.replace(new RegExp(`\\b${oldParts.gpioPin}\\b`, 'g'), newParts.gpioPin);
                content = content.replace(new RegExp(`\\b${oldParts.gpioRcc}\\b`, 'g'), newParts.gpioRcc);
              }
            }

            if (ext === 'md' || ext === 'ini' || ext === 'txt') {
              content = content.replace(new RegExp(`\\b${oldPin}\\b`, 'g'), newPin);
              if (oldPin) {
                content = content.replace(new RegExp(`\\b${oldPin.toLowerCase()}\\b`, 'g'), newPin.toLowerCase());
              }
            }

            return { ...file, content };
          });
        }
      } else {
        // If we couldn't find an existing definition of the macro, but newPin is valid,
        // we should still try to overwrite the macro definition in the header files anyway (e.g. if the macro was defined but using a different structure)
        const newParts = parseSTM32Pin(newPin);
        if (newParts) {
          updatedFiles = updatedFiles.map(file => {
            let content = file.content;
            const ext = file.path.split('.').pop()?.toLowerCase();
            if (ext === 'c' || ext === 'h' || ext === 'cpp') {
              // Replace Port Macros
              macros.stm32Ports.forEach(cand => {
                const portReg = new RegExp(`(#define\\s+${cand}\\s+)(\\S+)\\b`, 'g');
                content = content.replace(portReg, `$1${newParts.gpioPort}`);
              });
              // Replace Pin Macros
              macros.stm32Pins.forEach(cand => {
                const pinReg = new RegExp(`(#define\\s+${cand}\\s+)(\\S+)\\b`, 'g');
                content = content.replace(pinReg, `$1${newParts.gpioPin}`);
              });
              // Replace RCC Clocks
              macros.stm32Clocks.forEach(cand => {
                const clkReg = new RegExp(`(#define\\s+${cand}\\s+)(\\S+)\\b`, 'g');
                content = content.replace(clkReg, `$1${newParts.gpioRcc}`);
              });
            }
            return { ...file, content };
          });
        }
      }
    } else {
      // ESP32
      // Look for macro definition of the pin to determine oldPin
      for (const file of updatedFiles) {
        const ext = file.path.split('.').pop()?.toLowerCase();
        if (ext !== 'h' && ext !== 'cpp' && ext !== 'ino') continue;

        for (const pinCand of macros.esp32) {
          const pinReg = new RegExp(`#define\\s+${pinCand}\\s+(\\d+)\\b`);
          const pinMatch = file.content.match(pinReg);
          if (pinMatch) {
            oldPin = pinMatch[1];
            break;
          }
          const constReg = new RegExp(`const\\s+int\\s+${pinCand}\\s*=\\s*(\\d+)\\b`, 'i');
          const constMatch = file.content.match(constReg);
          if (constMatch) {
            oldPin = constMatch[1];
            break;
          }
        }
        if (oldPin) break;
      }

      if (oldPin && oldPin !== newPin) {
        const oldNum = parseESP32Pin(oldPin);
        const newNum = parseESP32Pin(newPin);

        updatedFiles = updatedFiles.map(file => {
          let content = file.content;
          const ext = file.path.split('.').pop()?.toLowerCase();

          if (ext === 'cpp' || ext === 'h' || ext === 'ino') {
            macros.esp32.forEach(cand => {
              const defReg = new RegExp(`(#define\\s+${cand}\\s+)(GPIO)?(${oldNum})\\b`, 'g');
              content = content.replace(defReg, `$1$2${newNum}`);

              const constReg = new RegExp(`(\\bconst\\s+int\\s+${cand}\\s*=\\s*)(GPIO)?(${oldNum})\\b`, 'gi');
              content = content.replace(constReg, `$1$2${newNum}`);

              const varReg = new RegExp(`(\\bint\\s+${cand}\\s*=\\s*)(GPIO)?(${oldNum})\\b`, 'gi');
              content = content.replace(varReg, `$1$2${newNum}`);
            });

            if (macros.role === 'sda' || macros.role === 'scl') {
              if (file.path.includes('main') || file.path.includes('pins')) {
                if (macros.role === 'sda') {
                  const wireSdaReg = new RegExp(`(Wire\\.begin\\s*\\(\\s*)${oldNum}(\\s*,)`, 'g');
                  content = content.replace(wireSdaReg, `$1${newNum}$2`);
                } else {
                  const wireSclReg = new RegExp(`(Wire\\.begin\\s*\\(\\s*\\d+\\s*,\\s*)${oldNum}(\\s*\\))`, 'g');
                  content = content.replace(wireSclReg, `$1${newNum}$2`);
                }
              }
            }
          }

          if (ext === 'md' || ext === 'ini' || ext === 'txt') {
            content = content.replace(new RegExp(`\\b${oldPin}\\b`, 'g'), newPin);
            if (oldPin) {
              content = content.replace(new RegExp(`\\b${oldPin.toLowerCase()}\\b`, 'g'), newPin.toLowerCase());
            }
          }

          return { ...file, content };
        });
      } else {
        // Fallback: overwrite the macros/constants directly if possible
        const newNum = parseESP32Pin(newPin);
        updatedFiles = updatedFiles.map(file => {
          let content = file.content;
          const ext = file.path.split('.').pop()?.toLowerCase();
          if (ext === 'cpp' || ext === 'h' || ext === 'ino') {
            macros.esp32.forEach(cand => {
              const defReg = new RegExp(`(#define\\s+${cand}\\s+)\\d+\\b`, 'g');
              content = content.replace(defReg, `$1${newNum}`);
              const constReg = new RegExp(`(\\bconst\\s+int\\s+${cand}\\s*=\\s*)\\d+\\b`, 'gi');
              content = content.replace(constReg, `$1${newNum}`);
            });
          }
          return { ...file, content };
        });
      }
    }
  });

  // FALLBACK INJECTIONS: Ensure delay.h is in main.c and strictly required macros are in pins.h
  if (isSTM32) {
    let mainC = updatedFiles.find(f => f.path.toLowerCase().endsWith('main.c'));
    let pinsHeader = updatedFiles.find(f => f.path.toLowerCase().endsWith('pins.h'));
    
    if (!pinsHeader) {
      pinsHeader = updatedFiles.find(f => f.path.toLowerCase().endsWith('main.h'));
    }

    if (!pinsHeader && connections.length > 0) {
      // Create a fallback pins.h if it doesn't exist at all
      pinsHeader = {
        path: "user/pins.h",
        content: "#ifndef __PINS_H\n#define __PINS_H\n#include \"stm32f10x.h\"\n\n#endif\n",
        language: "header"
      };
      updatedFiles.push(pinsHeader);
      if (mainC && !mainC.content.includes("pins.h")) {
         mainC.content = `#include "pins.h"\n` + mainC.content;
      }
    }

    // Inject delay.h into main.c
    if (mainC) {
      if (!mainC.content.includes("delay.h")) {
        mainC.content = `#include "delay.h"\n` + mainC.content;
      }
    }

    // Ensure all macros for all connections are present in the header
    if (pinsHeader) {
      let missingMacrosText = "";
      
      connections.forEach(conn => {
        const macros = getDynamicMacros(conn, components);
        const newParts = parseSTM32Pin(conn.fromPin.toUpperCase().trim());
        if (!newParts) return;

        const checkAndInject = (cand: string, val: string) => {
          const reg = new RegExp(`(#define\\s+${cand}\\s+)`);
          if (!reg.test(pinsHeader!.content)) {
            missingMacrosText += `#define ${cand} ${val}\n`;
          }
        };

        const compLower = conn.toComponent.toLowerCase();
        if (compLower.includes('oled') || compLower.includes('ssd1306') || compLower.includes('display')) {
          if (macros.role === 'sda') {
            checkAndInject("OLED_SDA_PIN", newParts.gpioPin);
            checkAndInject("OLED_SDA_PORT", newParts.gpioPort);
            checkAndInject("OLED_SDA_CLK", newParts.gpioRcc);
          } else if (macros.role === 'scl') {
            checkAndInject("OLED_SCL_PIN", newParts.gpioPin);
            checkAndInject("OLED_SCL_PORT", newParts.gpioPort);
            checkAndInject("OLED_SCL_CLK", newParts.gpioRcc);
          }
        } else if (compLower.includes('dht') || compLower.includes('aht')) {
          checkAndInject("DHT_PIN", newParts.gpioPin);
          checkAndInject("DHT_GPIO_PORT", newParts.gpioPort);
          checkAndInject("DHT_GPIO_CLK", newParts.gpioRcc);
        } else if (compLower.includes('buzz') || compLower.includes('beep') || compLower.includes('alarm')) {
          checkAndInject("BUZZER_PIN", newParts.gpioPin);
          checkAndInject("BUZZER_GPIO_PORT", newParts.gpioPort);
          checkAndInject("BUZZER_GPIO_CLK", newParts.gpioRcc);
        } else {
           const genericPinCand = macros.stm32Pins.length > 2 ? macros.stm32Pins[2] : macros.stm32Pins[0];
           const genericPortCand = macros.stm32Ports.length > 3 ? macros.stm32Ports[3] : macros.stm32Ports[0];
           const genericClkCand = macros.stm32Clocks.length > 3 ? macros.stm32Clocks[3] : macros.stm32Clocks[0];
           if (genericPinCand) checkAndInject(genericPinCand, newParts.gpioPin);
           if (genericPortCand) checkAndInject(genericPortCand, newParts.gpioPort);
           if (genericClkCand) checkAndInject(genericClkCand, newParts.gpioRcc);
        }
      });

      if (missingMacrosText.length > 0) {
        const endifMatch = pinsHeader.content.lastIndexOf("#endif");
        if (endifMatch !== -1) {
          pinsHeader.content = pinsHeader.content.slice(0, endifMatch) + 
            `\n/* System Auto-Injected Fallback Macros */\n${missingMacrosText}\n` + 
            pinsHeader.content.slice(endifMatch);
        } else {
          pinsHeader.content += `\n/* System Auto-Injected Fallback Macros */\n${missingMacrosText}\n`;
        }
      }
      
      // Ensure all .c and .cpp files include pins.h
      updatedFiles.forEach(f => {
        const ext = f.path.split('.').pop()?.toLowerCase();
        if (ext === 'c' || ext === 'cpp') {
           if (!f.content.includes("pins.h")) {
              f.content = `#include "pins.h"\n` + f.content;
           }
        }
      });
    }
  }

  return updatedFiles;
}
