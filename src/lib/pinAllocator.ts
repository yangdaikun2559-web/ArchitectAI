import { PinConnection, ComponentItem } from '../types';

interface AllocatorState {
  usedPins: Set<string>;
  i2cAllocated: { sda: string; scl: string } | null;
  spiAllocated: { sck: string; miso: string; mosi: string } | null;
  uartAllocated: { tx: string; rx: string } | null;
}

export function allocatePins(selectedComps: ComponentItem[], platform: string): PinConnection[] {
  const isSTM32 = platform.toUpperCase().includes('STM32');
  const isESP32 = platform.toUpperCase().includes('ESP32');

  // 1. Define physical pin resources based on the MCU platform
  let i2cSdaDefault = 'GPIO21';
  let i2cSclDefault = 'GPIO22';
  let uartTxDefault = 'GPIO17';
  let uartRxDefault = 'GPIO16';
  let spiSckDefault = 'GPIO18';
  let spiMisoDefault = 'GPIO19';
  let spiMosiDefault = 'GPIO23';
  let spiCsDefault = 'GPIO5';

  let adcPool = ['GPIO32', 'GPIO33', 'GPIO34', 'GPIO35', 'GPIO36', 'GPIO39'];
  let gpioPool = [
    'GPIO4', 'GPIO13', 'GPIO14', 'GPIO25', 'GPIO26', 'GPIO27',
    'GPIO12', 'GPIO15', 'GPIO2'
  ];

  let power3v3 = '3V3';
  let power5v = '5V';
  let powerGnd = 'GND';

  if (isSTM32) {
    i2cSdaDefault = 'PB7';
    i2cSclDefault = 'PB6';
    uartTxDefault = 'PA2'; // USART2 for external wifi
    uartRxDefault = 'PA3';
    spiSckDefault = 'PB13'; // SPI2
    spiMisoDefault = 'PB14';
    spiMosiDefault = 'PB15';
    spiCsDefault = 'PB12';

    adcPool = ['PA0', 'PA1', 'PB0', 'PB1'];
    // Order GPIO pool, avoiding standard I2C, UART2, and SPI2 pins
    gpioPool = [
      'PA8', 'PB12', 'PB11', 'PB10', 'PB9', 'PB8', 'PB5', 'PB4', 'PB3',
      'PA15', 'PA12', 'PA11', 'PC13', 'PC14', 'PC15', 'PA1', 'PA0'
    ];
    power3v3 = '3V3';
    power5v = '5V';
    powerGnd = 'GND';
  } else if (!isESP32) {
    // Fallback/Arduino Nano
    i2cSdaDefault = 'A4';
    i2cSclDefault = 'A5';
    uartTxDefault = 'D1';
    uartRxDefault = 'D0';
    spiSckDefault = 'D13';
    spiMisoDefault = 'D12';
    spiMosiDefault = 'D11';
    spiCsDefault = 'D10';

    adcPool = ['A0', 'A1', 'A2', 'A3'];
    gpioPool = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
    power3v3 = '3V3';
    power5v = '5V';
    powerGnd = 'GND';
  }

  const state: AllocatorState = {
    usedPins: new Set<string>(),
    i2cAllocated: null,
    spiAllocated: null,
    uartAllocated: null
  };

  const connections: PinConnection[] = [];

  // Helper to request a unique GPIO pin
  const popGPIO = (): string => {
    for (const pin of gpioPool) {
      if (!state.usedPins.has(pin)) {
        state.usedPins.add(pin);
        return pin;
      }
    }
    // Fallback if pool exhausted
    return 'GND';
  };

  // Helper to request a unique ADC pin
  const popADC = (): string => {
    for (const pin of adcPool) {
      if (!state.usedPins.has(pin)) {
        state.usedPins.add(pin);
        return pin;
      }
    }
    // Fallback to GPIO if ADC pool exhausted
    return popGPIO();
  };

  // Helper to reserve a specific pin if it's available
  const reservePin = (pin: string): boolean => {
    if (!state.usedPins.has(pin)) {
      state.usedPins.add(pin);
      return true;
    }
    return false;
  };

  // Pre-sort components by bus requirements to avoid fragmentation
  // Priority: UART > SPI > I2C > Analog > Digital
  const sortedComps = [...selectedComps].sort((a, b) => {
    const getOrder = (type: string) => {
      if (type === 'UART') return 1;
      if (type === 'SPI') return 2;
      if (type === 'I2C') return 3;
      if (type === 'Analog') return 4;
      return 5;
    };
    return getOrder(a.type) - getOrder(b.type);
  });

  for (const comp of sortedComps) {
    if (!comp.cadLayout || !comp.cadLayout.pins) continue;

    for (const pin of comp.cadLayout.pins) {
      const pinNameUpper = pin.name.toUpperCase();
      const pinTypeUpper = (pin.type || '').toUpperCase();
      let fromPin = '';
      let signalType: PinConnection['signalType'] = 'GPIO';
      let color = '#3B82F6'; // Default blue
      let description = `连接到主控与 ${comp.name} 的引脚`;

      // 1. Power & Ground
      if (pinTypeUpper === 'VCC') {
        fromPin = comp.voltage === '5V' ? power5v : power3v3;
        signalType = 'VCC';
        color = '#ef4444'; // Red
        description = `${comp.name} 供电引脚`;
      } else if (pinTypeUpper === 'GND') {
        fromPin = powerGnd;
        signalType = 'GND';
        color = '#94a3b8'; // Grey/GND
        description = `${comp.name} 共地引脚`;
      } 
      // 2. I2C Bus
      else if (pinTypeUpper === 'I2C_SDA' || pinNameUpper === 'SDA') {
        if (!state.i2cAllocated) {
          reservePin(i2cSdaDefault);
          reservePin(i2cSclDefault);
          state.i2cAllocated = { sda: i2cSdaDefault, scl: i2cSclDefault };
        }
        fromPin = state.i2cAllocated.sda;
        signalType = 'I2C_SDA';
        color = '#a855f7'; // Purple
        description = `I2C 数据总线线缆连接`;
      } else if (pinTypeUpper === 'I2C_SCL' || pinNameUpper === 'SCL') {
        if (!state.i2cAllocated) {
          reservePin(i2cSdaDefault);
          reservePin(i2cSclDefault);
          state.i2cAllocated = { sda: i2cSdaDefault, scl: i2cSclDefault };
        }
        fromPin = state.i2cAllocated.scl;
        signalType = 'I2C_SCL';
        color = '#06b6d4'; // Cyan
        description = `I2C 时钟总线线缆连接`;
      }
      // 3. UART Bus
      else if (pinTypeUpper === 'UART_TX' || pinNameUpper === 'TX' || pinNameUpper === 'TXD') {
        if (!state.uartAllocated) {
          reservePin(uartTxDefault);
          reservePin(uartRxDefault);
          state.uartAllocated = { tx: uartTxDefault, rx: uartRxDefault };
        }
        // TX on component connects to RX on MCU
        fromPin = state.uartAllocated.rx;
        signalType = 'UART_RX';
        color = '#ec4899'; // Pink/RX
        description = `串口通讯 RX 数据接收端口线`;
      } else if (pinTypeUpper === 'UART_RX' || pinNameUpper === 'RX' || pinNameUpper === 'RXD') {
        if (!state.uartAllocated) {
          reservePin(uartTxDefault);
          reservePin(uartRxDefault);
          state.uartAllocated = { tx: uartTxDefault, rx: uartRxDefault };
        }
        // RX on component connects to TX on MCU
        fromPin = state.uartAllocated.tx;
        signalType = 'UART_TX';
        color = '#f59e0b'; // Amber/TX
        description = `串口通讯 TX 数据发送端口线`;
      }
      // 4. SPI Bus
      else if (pinTypeUpper === 'SPI_MOSI' || (comp.type === 'SPI' && (pinNameUpper === 'MOSI' || pinNameUpper === 'DIN'))) {
        if (!state.spiAllocated) {
          reservePin(spiSckDefault);
          reservePin(spiMisoDefault);
          reservePin(spiMosiDefault);
          state.spiAllocated = { sck: spiSckDefault, miso: spiMisoDefault, mosi: spiMosiDefault };
        }
        fromPin = state.spiAllocated.mosi;
        signalType = 'GPIO';
        color = '#f59e0b'; // Amber
        description = `SPI 主机输出/从机输入总线连接`;
      } else if (pinTypeUpper === 'SPI_MISO' || (comp.type === 'SPI' && (pinNameUpper === 'MISO' || pinNameUpper === 'SO' || pinNameUpper === 'DOUT'))) {
        if (!state.spiAllocated) {
          reservePin(spiSckDefault);
          reservePin(spiMisoDefault);
          reservePin(spiMosiDefault);
          state.spiAllocated = { sck: spiSckDefault, miso: spiMisoDefault, mosi: spiMosiDefault };
        }
        fromPin = state.spiAllocated.miso;
        signalType = 'GPIO';
        color = '#ec4899'; // Pink
        description = `SPI 主机输入/从机输出总线连接`;
      } else if (pinTypeUpper === 'SPI_SCK' || (comp.type === 'SPI' && (pinNameUpper === 'SCK' || pinNameUpper === 'CLK'))) {
        if (!state.spiAllocated) {
          reservePin(spiSckDefault);
          reservePin(spiMisoDefault);
          reservePin(spiMosiDefault);
          state.spiAllocated = { sck: spiSckDefault, miso: spiMisoDefault, mosi: spiMosiDefault };
        }
        fromPin = state.spiAllocated.sck;
        signalType = 'GPIO';
        color = '#06b6d4'; // Cyan
        description = `SPI 时钟信号线缆总线连接`;
      } else if (pinNameUpper === 'CS' || pinNameUpper === 'SS' || pinNameUpper === 'SDA/SS') {
        // SPI chip select must be unique
        // Try to allocate spiCsDefault first if not already used, otherwise pop GPIO
        if (!state.usedPins.has(spiCsDefault)) {
          fromPin = spiCsDefault;
          state.usedPins.add(spiCsDefault);
        } else {
          fromPin = popGPIO();
        }
        signalType = 'GPIO';
        color = '#10b981'; // Green
        description = `SPI 设备片选引脚选定`;
      }
      // 5. Analog signals
      else if (pinTypeUpper === 'ADC' || pinNameUpper === 'A0' || pinNameUpper === 'OUT' && comp.type === 'Analog') {
        fromPin = popADC();
        signalType = 'ADC';
        color = '#10b981'; // Green
        description = `${comp.name} 模拟量电压信号采集`;
      }
      // 6. Generic GPIO and PWM
      else {
        fromPin = popGPIO();
        signalType = pinTypeUpper === 'PWM' ? 'PWM' : 'GPIO';
        color = signalType === 'PWM' ? '#f59e0b' : '#3B82F6';
        description = `${comp.name} 数字信号/控制通信接口线`;
      }

      connections.push({
        fromPin,
        toComponent: comp.name,
        toPin: pin.name,
        signalType,
        color,
        description
      });
    }
  }

  return connections;
}
