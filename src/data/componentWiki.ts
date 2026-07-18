export interface WikiPinInfo {
  pin: string;
  descZh: string;
  descEn: string;
}

export interface WikiEntry {
  nameZh: string;
  nameEn: string;
  categoryZh: string;
  categoryEn: string;
  principleZh: string;
  principleEn: string;
  voltageWarningZh: string;
  voltageWarningEn: string;
  pinFunctions: WikiPinInfo[];
}

export const componentWiki: Record<string, WikiEntry> = {
  dht22: {
    nameZh: "DHT22 温湿度传感器",
    nameEn: "DHT22 Temperature & Humidity Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "DHT22（又称 AM2302）是一种含有已校准数字信号输出的温湿度复合传感器。它应用专用的数字模块采集技术和温湿度传感技术，内部包含一个电容式感湿元件和一个高精度 NTC 测温元件，并与一个高性能 8 位单片机相连接。传感器通过单总线（Single-Bus）协议与微控制器通信，仅需一根数据线即可同时传输温湿度数据。",
    principleEn: "The DHT22 (AM2302) is a basic, low-cost digital temperature and humidity sensor. It uses a capacitive humidity sensor and a thermistor to measure the surrounding air, and spits out a digital signal on the data pin (no analog input pins needed). It communicates via a proprietary single-bus protocol.",
    voltageWarningZh: "工作电压为 3.3V 至 5V。在进行长距离传输（超过 20 米）时建议使用 5V 供电。注意：数据引脚（DATA）必须加挂一个 4.7kΩ 至 10kΩ 的上拉电阻到 VCC，否则主控可能无法稳定读取数据。",
    voltageWarningEn: "Operates at 3.3V - 5V. For long cable runs (> 20 meters), 5V is recommended. Note: The data line (DATA) requires a 4.7kΩ - 10kΩ pull-up resistor to VCC for stable communications.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.3V - 5.5V)", descEn: "Power positive (3.3V - 5.5V)" },
      { pin: "DATA", descZh: "单总线数字双向数据引脚，需上拉", descEn: "Single-bus bidirectional digital data pin, requires pull-up" },
      { pin: "NC", descZh: "悬空引脚，无需连接", descEn: "No connection, leave floating" },
      { pin: "GND", descZh: "电源地 (0V)", descEn: "Power ground (0V)" }
    ]
  },
  dht11: {
    nameZh: "DHT11 温湿度传感器",
    nameEn: "DHT11 Temperature & Humidity Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "DHT11 是一款含有已校准数字信号输出的温湿度复合传感器。其内部结构与 DHT22 类似，包含一个电阻式感湿元件和一个 NTC 测温元件。相较于 DHT22，DHT11 的量程较窄（温度 0~50℃，湿度 20~90%RH），精度较低，但响应速度快、成本更低，适合要求不高的入门级教学演示。",
    principleEn: "The DHT11 is a basic digital temperature and humidity sensor. It uses a resistive humidity sensor and a thermistor. Compared to the DHT22, the DHT11 has a smaller measurement range (0-50°C, 20-90% RH) and lower accuracy, but is cheaper and responsive, making it ideal for introductory classroom experiments.",
    voltageWarningZh: "工作电压为 3.5V 至 5.5V。由于 DHT11 通信时数据线高低电平切换频繁，数据引脚同样必须连接一个 5kΩ 或 10kΩ 的上拉电阻至 VCC，以保证信号稳定性。",
    voltageWarningEn: "Operates at 3.5V - 5.5V. The DATA pin requires a 5kΩ - 10kΩ pull-up resistor to VCC to ensure signal integrity during fast transitions.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.3V - 5V)", descEn: "Power positive (3.3V - 5V)" },
      { pin: "DATA", descZh: "单总线数字数据输入/输出引脚", descEn: "Single-bus digital data input/output pin" },
      { pin: "NC", descZh: "空脚，不连接", descEn: "No connection" },
      { pin: "GND", descZh: "地线 (GND)", descEn: "Ground (0V)" }
    ]
  },
  aht20: {
    nameZh: "AHT20 温湿度传感器",
    nameEn: "AHT20 Temperature & Humidity Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "AHT20 是新一代高精度数字温湿度传感器，配备了全新设计的 ASIC 专用芯片、经过改进的半导体电容式湿度传感元件和一个标准的片上温度传感元件。它采用标准的 I2C 接口进行通信，具有响应速度快、抗干扰能力强、长期稳定性好等特点，支持多个 I2C 设备共用总线。",
    principleEn: "AHT20 is a new generation of high-precision digital temperature and humidity sensor. Equipped with a newly designed ASIC chip and an improved capacitive sensor, it communicates via standard I2C interface, featuring fast response, high noise immunity, and excellent long-term stability.",
    voltageWarningZh: "工作电压为 2.0V 至 5.5V，推荐 3.3V 供电。由于使用 I2C 协议通信，SCL 和 SDA 引脚上建议加挂 4.7kΩ 的上拉电阻到 VCC（许多传感器扩展板上已自带该电阻）。",
    voltageWarningEn: "Operates at 2.0V - 5.5V, with 3.3V recommended. SCL and SDA lines should be pulled up to VCC with 4.7kΩ resistors (usually included on module breakouts).",
    pinFunctions: [
      { pin: "VDD/VCC", descZh: "电源输入 (2.0V - 5.5V)", descEn: "Power input (2.0V - 5.5V)" },
      { pin: "SDA", descZh: "I2C 串行数据线", descEn: "I2C Serial Data line" },
      { pin: "GND", descZh: "电源接地引脚", descEn: "Power ground pin" },
      { pin: "SCL", descZh: "I2C 串行时钟线", descEn: "I2C Serial Clock line" }
    ]
  },
  mq2: {
    nameZh: "MQ-2 易燃气体传感器",
    nameEn: "MQ-2 Flammable Gas Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "MQ-2 气体传感器所使用的气敏材料是在清洁空气中电导率较低的二氧化锡 (SnO2)。当传感器所处环境中存在易燃气体时，传感器的电导率随空气中易燃气体浓度的增加而增大。使用简单的电路即可将电导率的变化转换成与该气体浓度相对应的模拟输出信号 (A0) 或通过比较器输出数字高低电平 (D0)。",
    principleEn: "MQ-2 gas sensor uses SnO2, which has lower conductivity in clean air. When flammable gases are present, the sensor's conductivity increases with gas concentration. An analog signal (A0) or digital output (D0) via a comparator can be read by a microcontroller.",
    voltageWarningZh: "工作电压固定为 5.0V，内部加热丝工作需要较大的电流（约 150mA）。注意：ESP32 或 STM32 的 GPIO 输入电压最高为 3.3V，若使用 MQ-2 的模拟输出 (A0)，必须使用两个电阻分压（如 1kΩ 和 2kΩ）将 0~5V 降压至 0~3.3V，否则会导致主控引脚物理烧毁！",
    voltageWarningEn: "Requires 5.0V for heating element, drawing up to 150mA. Note: ESP32/STM32 GPIO pins are not 5V tolerant! If using the analog output (A0), you must use a resistor divider (e.g., 1kΩ & 2kΩ) to scale the 0-5V signal down to 0-3.3V to prevent pin damage.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入 (必须为 5.0V)", descEn: "Power input (must be 5.0V)" },
      { pin: "GND", descZh: "电源地 (GND)", descEn: "Ground (0V)" },
      { pin: "D0", descZh: "阈值比较数字输出（高/低电平）", descEn: "Digital output threshold comparison (high/low)" },
      { pin: "A0", descZh: "气敏模拟电压输出 (0V - 5V)", descEn: "Analog voltage output (0V - 5V)" }
    ]
  },
  sgp30: {
    nameZh: "SGP30 多像素气体传感器",
    nameEn: "SGP30 Multi-pixel Gas Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "SGP30 是一款金属氧化物半导体化学气体传感器，具有多个传感器像素，集成了先进的空气质量检测算法。它能够提供极高精度的总挥发性有机化合物 (TVOC) 浓度和二氧化碳等效值 (eCO2)，输出数字校准数据。传感器采用独特的抗硅氧烷技术，具有超长稳定性和极低的漂移率，通过 I2C 接口传输数据。",
    principleEn: "SGP30 is a metal-oxide semiconductor gas sensor featuring multiple sensing elements. It integrates advanced digital processing algorithms to output Total Volatile Organic Compounds (TVOC) and equivalent CO2 (eCO2) readings over I2C.",
    voltageWarningZh: "工作电压为 1.8V 至 3.3V，切勿接入 5V 电源！SGP30 对电源纹波较为敏感，在实际电路中应保证供电纯净。通信引脚 SDA/SCL 连接 3.3V 主控时可直接接入，无需电平转换。",
    voltageWarningEn: "Operates at 1.8V - 3.3V. Do NOT apply 5V power! The SGP30 is sensitive to power ripple. Data pins connect directly to 3.3V microcontrollers without level translation.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入 (1.8V - 3.3V)", descEn: "Power input (1.8V - 3.3V)" },
      { pin: "GND", descZh: "系统地线", descEn: "System Ground" },
      { pin: "SCL", descZh: "I2C 时钟总线引脚", descEn: "I2C Clock pin" },
      { pin: "SDA", descZh: "I2C 数据总线引脚", descEn: "I2C Data pin" }
    ]
  },
  ssd1306: {
    nameZh: "SSD1306 OLED 液晶显示屏 (128x64)",
    nameEn: "SSD1306 OLED Display (128x64)",
    categoryZh: "显示器",
    categoryEn: "Display",
    principleZh: "SSD1306 是一款单芯片 CMOS OLED/PLED 驱动控制器。它主要用于 128x64 点阵的有机发光二极管（OLED）屏幕显示。OLED 屏幕具有自发光特性，不需要背光灯，因此对比度极高、功耗低、响应速度极快。该屏幕在创客开发中通常搭载 I2C 接口子板进行通信，仅占用两根控制引脚即可画点、写字、画图。",
    principleEn: "SSD1306 is a single-chip CMOS OLED driver controller. It drives a 128x64 dot matrix organic light emitting diode screen. OLED displays are self-illuminating (no backlight required), providing high contrast, low power draw, and fast response times over I2C.",
    voltageWarningZh: "工作电压为 3.3V 至 5.0V（屏幕芯片通常带有 3.3V 低压降稳压芯片）。SDA 和 SCL 物理连接必须分别连接到主控芯片指定的硬件 I2C 通道，并在多器件共用总线时确保地址没有碰撞（默认 I2C 地址为 0x3C）。",
    voltageWarningEn: "Operates at 3.3V - 5.0V (most breakout boards feature an on-board 3.3V regulator). SDA/SCL must connect to the microcontroller's hardware I2C pins. Verify default I2C address (usually 0x3C) is unique on the bus.",
    pinFunctions: [
      { pin: "GND", descZh: "电源接地引脚 (GND)", descEn: "Ground pin (0V)" },
      { pin: "VCC", descZh: "电源正极 (3.3V - 5V)", descEn: "Power positive (3.3V - 5V)" },
      { pin: "SCL", descZh: "I2C 时钟总线，连接主控 SCL", descEn: "I2C clock line, connects to MCU SCL" },
      { pin: "SDA", descZh: "I2C 数据总线，连接主控 SDA", descEn: "I2C data line, connects to MCU SDA" }
    ]
  },
  lcd1602: {
    nameZh: "1602 LCD 字符液晶屏 (搭载 I2C 接口板)",
    nameEn: "1602 LCD Display (with I2C Backpack)",
    categoryZh: "显示器",
    categoryEn: "Display",
    principleZh: "1602 字符液晶屏能显示 2 行、每行 16 个 ASCII 字符。标准的 1602 屏采用 16 脚并行接口，接线繁琐（需要占用至少 6 个单片机 GPIO）。为了简化走线，通常在其背面焊接一块 PCF8574 I/O 扩展芯片（I2C 背包板），将并行总线压缩为 I2C 串行总线。液晶屏采用扭曲向列型 (TN) 液晶，依赖背光LED照亮字符。",
    principleEn: "1602 LCD displays 16 characters per row across 2 rows. Standard parallel interfacing requires 6+ GPIOs. By adding a PCF8574 I2C backpack expander, the parallel lines are compressed into standard 2-wire I2C communication, drastically simplifying routing.",
    voltageWarningZh: "工作电压固定为 5.0V。注意：很多 1602 LCD 屏在 3.3V 供电下字迹会极其暗淡甚至无法显示。由于背包板输出的数据高电平也是 5V，连接 3.3V 主控（如 ESP32/STM32）通信时，一般可以直接连接通信线，但严格电气规范下建议使用 I2C 双向电平转换模块保护引脚。",
    voltageWarningEn: "Requires 5.0V. At 3.3V, characters will be barely visible or blank. Although standard I2C lines can often pull up to 3.3V, in highly robust circuits, a bidirectional I2C level translator should be used between the 5V LCD and 3.3V microcontroller.",
    pinFunctions: [
      { pin: "GND", descZh: "电源负极", descEn: "Ground" },
      { pin: "VCC", descZh: "电源正极 (必须接 5V 保证对比度)", descEn: "Power positive (must connect 5V for contrast)" },
      { pin: "SDA", descZh: "I2C 数据输入引脚", descEn: "I2C Data line" },
      { pin: "SCL", descZh: "I2C 时钟输入引脚", descEn: "I2C Clock line" }
    ]
  },
  sg90: {
    nameZh: "SG90 模拟舵机 (微型伺服电机)",
    nameEn: "SG90 Micro Servo Motor",
    categoryZh: "执行器",
    categoryEn: "Actuator",
    principleZh: "SG90 舵机是一种微型位置伺服驱动器。其内部由无核心直流电机、减速齿轮组、电位器（位置反馈）和控制集成电路板组成。它通过接收频率为 50Hz（周期为 20ms）的脉冲宽度调制（PWM）信号来控制输出轴的角度。脉冲宽度在 0.5ms（对应0度）至 2.5ms（对应180度）之间变化，控制舵机轴旋转至目标位置并锁止。",
    principleEn: "SG90 is a micro position-controlled servo motor containing a DC motor, gears, feedback potentiometer, and control board. It decodes a 50Hz PWM signal (20ms cycle). Pulse widths between 0.5ms (0°) and 2.5ms (180°) define the shaft angle.",
    voltageWarningZh: "工作电压为 4.8V 至 6.0V。注意：舵机在转动瞬间会产生极大的瞬间电流（可达 500mA-1A），严禁直接用单片机引脚输出供电或直连 ESP32 板载 3.3V 稳压脚，极易引发主控因欠压复位或稳压芯片过热烧毁。必须外部接入 5V 开关电源，并确保外部电源 GND 与主控 GND 连接在一起（共地）。",
    voltageWarningEn: "Requires 4.8V - 6.0V. Caution: The servo draws substantial peak current (up to 1A) during movement. Never power it directly from an MCU output pin or the ESP32's onboard 3.3V regulator! Use an external 5V power supply, ensuring you connect the external GND and MCU GND together.",
    pinFunctions: [
      { pin: "GND (棕色线)", descZh: "电源地线 (0V)", descEn: "Power Ground (Brown)" },
      { pin: "VCC (红色线)", descZh: "电源正极 (必须接 5V 外部供电)", descEn: "Power positive (Red, 5V external power)" },
      { pin: "PWM (橙色线)", descZh: "脉宽调制信号输入线，连接单片机支持 PWM 的 GPIO", descEn: "PWM control signal input (Orange), connects to MCU PWM GPIO" }
    ]
  },
  buzzer: {
    nameZh: "有源 5V 蜂鸣器",
    nameEn: "Active 5V Buzzer",
    categoryZh: "报警器",
    categoryEn: "Alert",
    principleZh: "有源蜂鸣器是一种一体化结构的电子讯响器，采用直流电压供电。所谓“有源”，是指蜂鸣器内部集成了一套多谐振荡器电路。主控芯片只需要给它输入一个高电平信号（直流电压），内部振荡器即开始工作，推动压电陶瓷片或电磁线圈发声，发出固定频率（约 2kHz）的鸣叫声，开发简单，不需要写音频驱动代码。",
    principleEn: "An active buzzer is an integrated sound-producing electronic transducer. Unlike passive buzzers, 'active' means it houses an internal oscillation source. Applying standard high-level DC voltage directly sounds the buzzer at a fixed frequency (usually 2kHz) without PWM generation.",
    voltageWarningZh: "工作电平通常为 5V。ESP32/STM32 的 GPIO 引脚驱动电流有限（仅 12mA~20mA），而蜂鸣器工作时通常消耗 30mA 左右。若长时间直接驱动，可能会加重单片机引脚发热老化。在实物电路中，建议使用一个 NPN 三极管（如 S8050）作为开关驱动，并在引脚间串联 1kΩ 限流电阻。",
    voltageWarningEn: "Typically operates at 5V DC. Microcontroller GPIO output current is limited (12mA-20mA), whereas buzzers consume around 30mA. Direct long-term drive can strain the silicon. It is recommended to use an NPN transistor (e.g., S8050) as an electronic switch with a 1kΩ resistor.",
    pinFunctions: [
      { pin: "VCC (+极/长脚)", descZh: "控制信号输入端或电源输入正极，接 GPIO 针脚", descEn: "Signal input / Power positive (Long pin), connects to GPIO" },
      { pin: "GND (-极/短脚)", descZh: "电源地端，接地", descEn: "Ground (Short pin)" }
    ]
  },
  esp32: {
    nameZh: "ESP32-WROOM-32E 开发板",
    nameEn: "ESP32-WROOM-32E Microcontroller Board",
    categoryZh: "主控芯片",
    categoryEn: "Controller",
    principleZh: "ESP32-WROOM-32E 是一款基于 ESP32-D0WD-V3 芯片设计的通用型 Wi-Fi + 蓝牙 + 蓝牙低功耗 (BLE) MCU 模组。内置超高性能的 Tensilica Xtensa 32 位 LX6 双核处理器，主频高达 240MHz。它搭载了丰富的片上外设，包含高速 SPI、UART、I2C、ADC 模拟输入转换等，是当今物联网、创客智能项目首选的核心芯片。",
    principleEn: "ESP32-WROOM-32E is a powerful, generic Wi-Fi + Bluetooth + BLE MCU module. Centered on the dual-core Tensilica Xtensa 32-bit LX6 processor operating up to 240MHz, it integrates extensive peripherals including SPI, UART, I2C, and ADCs, making it the premier choice for modern IoT creations.",
    voltageWarningZh: "核心工作电压为 3.3V！板载电平承载最高不可超过 3.6V。切勿将 5V 电平线（如 5V 传感器的数据线）直连到 ESP32 GPIO 引脚，会损坏核心引脚。在使用内置 USB 供电时，开发板通过稳压芯片将 5V 转为 3.3V。GPIO12/15/0 等引脚是上电引导引脚，接线时应避开挂载大型传感器，防止因拉电平导致系统无法上电或闪存报错。",
    voltageWarningEn: "Operating voltage is 3.3V! Pins are NOT 5V tolerant. Feeding 5V directly to GPIOs can destroy the MCU. The development board scales USB 5V down to 3.3V via LDO. GPIO pins 12, 15, and 0 are bootstrapping pins; avoid connecting high-impedance sensors that alter boot levels.",
    pinFunctions: [
      { pin: "3V3", descZh: "板载 3.3V 稳压输出引脚，限流约 500mA", descEn: "On-board 3.3V regulated power output (Max ~500mA)" },
      { pin: "GND", descZh: "电源参考地线引脚 (GND)", descEn: "Ground reference pin (0V)" },
      { pin: "GPIO 21", descZh: "默认的 I2C SDA 数据通信引脚", descEn: "Default I2C SDA data communication line" },
      { pin: "GPIO 22", descZh: "默认的 I2C SCL 时钟通信引脚", descEn: "Default I2C SCL clock communication line" },
      { pin: "V5/VIN", descZh: "直接连接 USB-C 的 5V 电源输入引脚", descEn: "USB-C direct 5V power input line (VIN)" }
    ]
  },
  stm32: {
    nameZh: "STM32F103C8T6 (Blue Pill) 开发板",
    nameEn: "STM32F103C8T6 (Blue Pill) Controller",
    categoryZh: "主控芯片",
    categoryEn: "Controller",
    principleZh: "STM32F103C8T6 是一款基于 ARM Cortex-M3 内核的 32 位高精密微控制器，工作频率达 72MHz。它在创客界常以“Blue Pill（蓝色药丸）”开发板形式存在。该开发板提供 64KB Flash 闪存和 20KB SRAM，拥有极快的定时器捕获和高精度多通道 ADC。由于芯片本身没有集成无线模块，通常用于有线工业、精密仪表或单机运动控制教学。",
    principleEn: "STM32F103C8T6 is a high-density performance line micro-controller based on the 32-bit ARM Cortex-M3 core, operating at 72MHz. Famously nicknamed the 'Blue Pill', it features 64KB Flash, 20KB SRAM, and rich hardware peripherals, commonly taught for high-speed industrial control.",
    voltageWarningZh: "工作电平为 3.3V。部分引脚标记为 FT (Five-volt Tolerant) 可容忍 5V 输入电压，而其他普通引脚不容忍 5V！请查阅引脚定义表接线。若通过 USB 供电，板载 5V 引脚可以直接向 5V 传感器（如 SG90 舵机）供电，但必须与 STM32 共地。",
    voltageWarningEn: "Operates at 3.3V. Select pins are FT (Five-volt Tolerant) and can accept 5V inputs, while others are strictly 3.3V max! When powered via USB, the 5V pins can source external 5V sensors/actuators (ensure GNDs are shared).",
    pinFunctions: [
      { pin: "3V3", descZh: "板载稳压 3.3V 输出引脚", descEn: "On-board 3.3V power regulator output" },
      { pin: "GND", descZh: "公共接地端", descEn: "Common Ground" },
      { pin: "PB7", descZh: "标准 I2C SDA 数据引脚（部分引脚 ft）", descEn: "Standard I2C SDA data pin (select FT)" },
      { pin: "PB6", descZh: "标准 I2C SCL 时钟引脚（部分引脚 ft）", descEn: "Standard I2C SCL clock pin (select FT)" },
      { pin: "5V", descZh: "板载 5V 电源输出端，来自于 USB 电压", descEn: "On-board 5V output sourced from USB" }
    ]
  },
  max6675: {
    nameZh: "MAX6675 K型热电偶温度传感器模块",
    nameEn: "MAX6675 K-Type Thermocouple Sensor Module",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "MAX6675 是一款复杂的单片有源冷端补偿、线性化的 K 型热电偶通用模拟数字转换器。内部包含冷端补偿二极管、12位 ADC（可检测小至 0.25℃ 的温度变化）以及 SPI 兼容的提码数据输出串行三线数字接口。它测量两个不同电极接触面因温差产生的微弱塞贝克（Seebeck）电压，并将其转换为对应的数字温度数据输出。",
    principleEn: "MAX6675 performs cold-junction compensation and digitizes the signal from a type-K thermocouple. The data is output in a 12-bit resolution, SPI-compatible, read-only format. It measures the thermoelectric voltage generated by two dissimilar metals to compute the junction temperature.",
    voltageWarningZh: "工作电压为 3.0V 至 5.5V，推荐使用 3.3V 供电。接线时必须确保热电偶正负极极性正确，接反会导致温度读数向相反方向漂移。热电偶屏蔽层切勿与大地或系统 GND 短接，以避免共模干扰。",
    voltageWarningEn: "Operates at 3.0V - 5.5V (3.3V recommended). Ensure correct polarity of the thermocouple wires; reversed polarity will cause inverse temperature readings. Avoid shorting the thermocouple metal sheath to Ground to reduce common-mode noise.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.0V - 5.5V)", descEn: "Power positive (3.0V - 5.5V)" },
      { pin: "GND", descZh: "电源地 (0V)", descEn: "Power ground (0V)" },
      { pin: "SCK", descZh: "SPI 串行时钟输入引脚", descEn: "SPI Serial Clock input" },
      { pin: "CS", descZh: "SPI 片选输入引脚，低电平有效", descEn: "SPI Chip Select, active low" },
      { pin: "SO", descZh: "SPI 串行数据输出引脚", descEn: "SPI Serial Data Output" }
    ]
  },
  esp8266: {
    nameZh: "ESP8266 Wi-Fi 模块 (ESP-01S)",
    nameEn: "ESP8266 Wi-Fi Module (ESP-01S)",
    categoryZh: "通信模块",
    categoryEn: "Communication",
    principleZh: "ESP-01S 是一款基于乐鑫 ESP8266EX 芯片的超微型串口 Wi-Fi 模块。模块内置完整的 TCP/IP 协议栈，通过内置的 UART 串口与外部主控 MCU 进行通信，接收 AT 指令进行 Wi-Fi 网络连接、数据收发及 TCP/UDP 连接。可作为外挂式无线网卡使用。",
    principleEn: "ESP-01S is a micro Wi-Fi module based on the ESP8266EX SoC. It features an integrated TCP/IP protocol stack, allowing any microcontroller with a UART interface to connect to Wi-Fi networks and send/receive data via standard serial AT commands.",
    voltageWarningZh: "工作电压固定为严格的 3.3V！该模块功耗较大（发送瞬间电流可达 200mA-300mA），严禁使用普通 GPIO 引脚或微弱的 3.3V LDO 供电。其串口引脚不容忍 5V 电平，与 5V MCU 通信时必须串联电平转换模块或分压电阻，否则极易物理烧毁芯片。",
    voltageWarningEn: "Requires a strict 3.3V supply capable of sourcing up to 300mA during transmissions. The UART RX pin is NOT 5V tolerant. Use a level shifter when interfacing with 5V microcontrollers like Arduino Uno/Nano.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (必须为 3.3V)", descEn: "Power positive (must be 3.3V)" },
      { pin: "GND", descZh: "电源地 (0V)", descEn: "Power ground (0V)" },
      { pin: "TXD", descZh: "串口发送引脚，连接主控 RXD", descEn: "UART Transmit, connects to MCU RX" },
      { pin: "RXD", descZh: "串口接收引脚，连接主控 TXD，3.3V电平", descEn: "UART Receive, connects to MCU TX (3.3V logic)" },
      { pin: "CH_PD / EN", descZh: "使能引脚，必须接高电平 (3.3V) 才能使能模块", descEn: "Chip Enable, must be tied high to 3.3V" },
      { pin: "RST", descZh: "复位引脚，低电平复位，悬空或接高电平", descEn: "Reset pin, active low" }
    ]
  },
  max30102: {
    nameZh: "MAX30102 心率血氧脉搏传感器",
    nameEn: "MAX30102 Heart Rate & Oximeter Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "MAX30102 是一款集成了红光 LED、红外光 LED、光电检测器以及带环境光消除的低噪声模拟信号处理器件。通过测量人体手指微血管在心脏搏动时对红光和红外光的吸收率变化（PPG光电容积脉搏波法），算法可以实时计算出心率和血液氧饱合度。采用 I2C 总线传输原始数据。",
    principleEn: "MAX30102 is an integrated pulse oximetry and heart-rate monitor sensor. It includes red/IR LEDs, photodetectors, optical elements, and low-noise electronics with ambient light rejection. It uses photoplethysmography (PPG) to track heart rate and blood oxygen levels via I2C.",
    voltageWarningZh: "工作电压通常为 1.8V 至 3.3V。传感器贴近皮肤进行测量时，注意保持表面清洁，避免过度按压导致局部血管闭塞，这会引发读数严重失真。通信总线 SDA/SCL 需配有适当上拉电阻。",
    voltageWarningEn: "Operates at 1.8V - 3.3V. When measuring, apply gentle pressure; pressing too hard will restrict local blood flow and distort the PPG waveform. Ensure appropriate pull-up resistors on I2C lines.",
    pinFunctions: [
      { pin: "VIN", descZh: "电源输入端 (1.8V - 3.3V)", descEn: "Power input (1.8V - 3.3V)" },
      { pin: "GND", descZh: "电源地 (0V)", descEn: "Power ground" },
      { pin: "SCL", descZh: "I2C 串行时钟线", descEn: "I2C Serial Clock" },
      { pin: "SDA", descZh: "I2C 串行数据线", descEn: "I2C Serial Data" },
      { pin: "INT", descZh: "中断输出引脚，低电平有效，常悬空", descEn: "Interrupt output, active low, usually open" }
    ]
  },
  ds18b20: {
    nameZh: "DS18B20 数字单总线防水温度探头",
    nameEn: "DS18B20 1-Wire Temperature Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "DS18B20 是一款独特的单总线（1-Wire）数字温度计，它将温敏元件、ADC 和通讯闪存集成在单个三脚芯片中。探头外裹不锈钢护套，具有防水防潮特性。每个 DS18B20 都带有一个出厂唯一的 64 位序列号，这允许在同一根单总线上挂载多达数十个 DS18B20 传感器进行多点测温。",
    principleEn: "DS18B20 is a digital thermometer communicating over a proprietary 1-Wire bus. Each device has a unique 64-bit serial code etched at the factory, enabling multiple sensors to share the same physical bus wire. The stainless steel enclosure makes it waterproof.",
    voltageWarningZh: "工作电压为 3.0V 至 5.5V。使用单总线通信时，必须在 VCC 和 DATA 引脚之间连接一个 4.7kΩ 的上拉电阻，否则主控将无法发现器件。支持寄生电源模式（通过数据线供电），但教学实验中推荐常规 3 线连接。",
    voltageWarningEn: "Operates at 3.0V - 5.5V. A 4.7kΩ pull-up resistor must be connected between VCC and the DATA line for communication to function. Parasitic power mode is supported but active 3-wire powering is recommended.",
    pinFunctions: [
      { pin: "VCC (红)", descZh: "电源正极 (3.0V - 5.5V)", descEn: "Power positive (3.0V - 5.5V)" },
      { pin: "DATA (黄/蓝)", descZh: "1-Wire 串行双向数据通信线，需挂拉电阻", descEn: "1-Wire Serial bidirectional Data, requires pull-up" },
      { pin: "GND (黑)", descZh: "电源地 (0V)", descEn: "Power Ground (0V)" }
    ]
  },
  hcsr04: {
    nameZh: "HC-SR04 超声波测距传感器",
    nameEn: "HC-SR04 Ultrasonic Distance Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "HC-SR04 超声波测距模块利用声波反射原理测量距离。主控向 TRIG 引脚发送至少 10微秒 的高电平脉冲触发信号，模块内部将自动发射 8 个 40kHz 的超声波脉冲。当声波遇到障碍物返回被接收器接收时，ECHO 引脚会输出一个高电平，其持续时间与声波往返时间成正比。距离 = (高电平时间 × 声速 340m/s) / 2。",
    principleEn: "HC-SR04 uses sonar to determine distance. Microcontrollers trigger a measurement by sending a 10µs high pulse to the TRIG pin. The sensor transmits an 8-cycle 40kHz ultrasonic burst. The ECHO pin goes high, returning a pulse width proportional to distance (Distance = Time * Speed of Sound / 2).",
    voltageWarningZh: "经典 HC-SR04 必须工作在 5.0V。由于其输出的 ECHO 高电平信号也是 5V，直连 3.3V 主控（如 ESP32 或 STM32）的 GPIO 时，必须使用分压电阻（如 1kΩ 和 2kΩ）将 5V 转换为 3.3V，否则会导致主控管脚物理过压损坏。",
    voltageWarningEn: "Requires 5.0V. The ECHO output pulse is 5V; connecting it directly to 3.3V microcontrollers (ESP32/STM32) can damage the GPIO. Use a resistor voltage divider to scale the 5V ECHO signal to 3.3V.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入 (必须为 5.0V)", descEn: "Power input (must be 5.0V)" },
      { pin: "TRIG", descZh: "触发信号输入引脚，接收 10us 脉冲", descEn: "Trigger signal input, accepts 10us pulse" },
      { pin: "ECHO", descZh: "回响信号输出引脚，输出高电平时间表距离", descEn: "Echo signal output, pulse width represents distance" },
      { pin: "GND", descZh: "系统接地线", descEn: "System Ground" }
    ]
  },
  mpu6050: {
    nameZh: "MPU6050 六轴惯性传感器 (加速度+陀螺仪)",
    nameEn: "MPU6050 6-Axis Inertial Measurement Unit",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "MPU6050 是一款集成了三轴 MEMS 加速度计和三轴 MEMS 陀螺仪的六轴运动处理组件。它内部包含 16 位的 ADC 对各轴模拟量进行数字转换，并集成数字运动处理器 (DMP)，可通过 I2C 接口直接输出姿态解算后的四元数。被广泛用于平衡小车、无人机和机器人姿态感知。",
    principleEn: "MPU6050 integrates a 3-axis gyroscope and a 3-axis accelerometer along with a Digital Motion Processor (DMP) on a single silicon die. It utilizes onboard 16-bit ADCs to digitize raw readings and provides orientation output via I2C.",
    voltageWarningZh: "工作电压为 3.3V 至 5.0V。芯片核心为 3.3V，开发板子板通常内置 LDO。注意：在快速运动测量时，需保证排线牢固以防 I2C 总线因震动接触不良产生总线死锁（可以通过软件复位 I2C 解决）。",
    voltageWarningEn: "Operates at 3.3V - 5.0V. Ensure stable connections during high vibration or motion to prevent serial bus errors. Address pin AD0 determines I2C address (0x68 when low, 0x69 when high).",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.3V - 5V)", descEn: "Power positive (3.3V - 5V)" },
      { pin: "GND", descZh: "电源参考地线", descEn: "Ground" },
      { pin: "SCL", descZh: "I2C 串行时钟线", descEn: "I2C Serial Clock" },
      { pin: "SDA", descZh: "I2C 串行数据线", descEn: "I2C Serial Data" },
      { pin: "AD0", descZh: "I2C 地址控制引脚，接低 0x68，接高 0x69", descEn: "I2C Address LSB pin (GND=0x68, VCC=0x69)" },
      { pin: "INT", descZh: "数据就绪中断输出脚，低电平/高电平有效", descEn: "Interrupt output pin" }
    ]
  },
  bme280: {
    nameZh: "BME280 高精度温湿度气压传感器",
    nameEn: "BME280 Temp, Humidity & Pressure Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "BME280 是一款专为移动应用设计的多功能数字环境传感器。它集成了一个八针金属封装，包含高度线性的相对湿度、绝对大气压力和气温测量元件。该传感器具备极高的响应速度和精度，气压传感器拥有极低的噪声（支持高度差小至 7.5 厘米的测量），支持 I2C/SPI 双协议通信。",
    principleEn: "BME280 is a combined digital sensor measuring temperature, humidity, and barometric pressure. Designed for battery-operated devices, it features high precision and fast response. Pressure resolution is high enough to detect altitude shifts of 7.5cm.",
    voltageWarningZh: "核心工作电压为 1.8V 至 3.6V，通常使用 3.3V 供电。接线时切勿输入 5V。若使用 I2C 接口，芯片地址可通过 SDO 管脚配置（接地为 0x76，接高电平为 0x77）。",
    voltageWarningEn: "Operates at 1.8V - 3.6V. Do NOT connect to 5V! The SDO pin configures the I2C address (0x76 when grounded, 0x77 when tied high to VDD).",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入 (1.8V - 3.6V)", descEn: "Power input (1.8V - 3.6V)" },
      { pin: "GND", descZh: "接地端", descEn: "Ground" },
      { pin: "SCL", descZh: "I2C 时钟线 (SCL) / SPI 时钟线 (SCK)", descEn: "I2C SCL / SPI SCK Clock line" },
      { pin: "SDA", descZh: "I2C 数据线 (SDA) / SPI 主入从出 (MOSI)", descEn: "I2C SDA / SPI MOSI line" },
      { pin: "CSB", descZh: "SPI 片选引脚，挂载 I2C 时必须接高电平(VCC)", descEn: "Chip Select, must tie high for I2C" },
      { pin: "SDO", descZh: "SPI 从出主入 (MISO) / I2C 地址控制引脚", descEn: "SPI MISO / I2C Address LSB" }
    ]
  },
  bh1750: {
    nameZh: "BH1750FVI 数字光照强度传感器",
    nameEn: "BH1750 Ambient Light Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "BH1750 是一款两线制 I2C 接口数字环境光照强度传感器。内部包含光敏二极管、集成运算放大器、ADC 转换器以及数字逻辑电路。传感器可以直接输出经过校准的十进制照度 Lux 值，光谱响应特性与人眼视觉灵敏度高度接近，无需任何二次换算，即可用于自动调光控制。",
    principleEn: "BH1750 is a digital ambient light sensor with an I2C bus interface. It converts light intensity to a digital value with a spectral response close to that of the human eye, outputting readings directly in Lux units without external scaling.",
    voltageWarningZh: "工作电压为 3.0V 至 5.0V，推荐 3.3V。数据总线 SDA/SCL 连接微控制器时需检查是否连接了上拉电阻。地址引脚 ADDR 接地时 I2C 读地址为 0x23，接 VCC 时为 0x5C。",
    voltageWarningEn: "Operates at 3.0V - 5.0V (3.3V recommended). Tie the ADDR pin to GND for address 0x23, or to VCC for address 0x5C.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.0V - 5V)", descEn: "Power positive (3.0V - 5V)" },
      { pin: "GND", descZh: "电源负极", descEn: "Ground" },
      { pin: "SCL", descZh: "I2C 串行时钟总线", descEn: "I2C Serial Clock" },
      { pin: "SDA", descZh: "I2C 串行数据总线", descEn: "I2C Serial Data" },
      { pin: "ADDR", descZh: "I2C 地址控制线，接地为 0x23，接高为 0x5C", descEn: "I2C Address LSB (GND=0x23, VCC=0x5C)" }
    ]
  },
  hcsr501: {
    nameZh: "HC-SR501 人体红外感应模块",
    nameEn: "HC-SR501 PIR Motion Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "HC-SR501 是基于红外线技术的自动控制模块。其核心探头为热释电红外传感器（PIR），能够探测人体发射的特定波长红外热辐射。模块上覆有菲涅尔滤光镜片，将红外光折射聚焦于感应元件。当感应区域有红外源移动时，感应器温度产生起伏，模块内部电路处理后使输出脚 (OUT) 维持一定时间的高电平。",
    principleEn: "HC-SR501 is an automatic control module based on infrared technology, featuring a Pyroelectric Infrared (PIR) sensor. It detects thermal radiation changes when a human body moves through its field of view, outputting a high pulse on the OUT pin.",
    voltageWarningZh: "工作电压为 4.8V 至 20V，推荐 5V 供电。但是，模块输出的 OUT 控制信号电平固定为 3.3V（即高电平为 3.3V），因此该信号引脚可以直接安全地与 ESP32、STM32 等 3.3V 主控的 GPIO 连接，无需额外限流或降压。",
    voltageWarningEn: "Supply voltage range is 4.8V - 20V (5V recommended). Note: The output signal (OUT) is 3.3V CMOS logic, making it safe to connect directly to 3.3V microcontrollers (ESP32/STM32) without level shifters.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极输入端 (4.8V - 20V)", descEn: "Power positive input (4.8V - 20V)" },
      { pin: "OUT", descZh: "数字电平输出引脚 (高电平 3.3V 表有人，低电平无人)", descEn: "Digital output (3.3V High = Detected, Low = Empty)" },
      { pin: "GND", descZh: "电源地线", descEn: "Ground" }
    ]
  },
  yl69: {
    nameZh: "YL-69 土壤湿度传感器",
    nameEn: "YL-69 Soil Moisture Sensor",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "YL-69（包含探测板与控制板）是一款基于电阻式阻抗测量原理的土壤湿度传感器。当土壤含水量高时，土壤的电导率上升，插入土壤中的两个探针叶片之间的电阻下降，模块模拟端子 A0 输出的电压降低。控制板上搭载 LM393 比较器，可通过电位器调节湿度报警阈值，并通过数字端子 D0 输出高低电平。",
    principleEn: "YL-69 measures soil moisture by assessing the electrical resistance between two metal probe prongs. When soil moisture is high, conductivity increases and resistance drops, lowering the voltage on the analog output (A0). A digital output (D0) is also driven via an LM393 comparator.",
    voltageWarningZh: "工作电压为 3.3V 至 5.0V。在 3.3V 主控（如 ESP32）上使用模拟输出 A0 时，建议将模块直接用 3.3V 供电，这样 A0 的输出范围（0~3.3V）刚好适配主控 ADC 的量程。注意：探针长期通电易发生电化学腐蚀，实验完毕应及时断电。",
    voltageWarningEn: "Operates at 3.3V - 5.0V. If interfacing A0 with 3.3V microcontrollers, power the sensor at 3.3V to map the analog output to the ADC range. Note: Probes are susceptible to electrochemical corrosion; avoid leaving them powered continuously in soil.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.3V - 5V)", descEn: "Power positive (3.3V - 5V)" },
      { pin: "GND", descZh: "接地脚 (0V)", descEn: "Ground" },
      { pin: "A0", descZh: "模拟电压输出引脚 (湿度越高，电压值越低)", descEn: "Analog output (More moisture = Lower voltage)" },
      { pin: "D0", descZh: "数字开关输出引脚，由板载旋钮阀值比较器输出", descEn: "Digital threshold output from on-board comparator" }
    ]
  },
  mfrc522: {
    nameZh: "MFRC522 RFID 射频刷卡模块",
    nameEn: "MFRC522 RFID Reader Module",
    categoryZh: "通信模块",
    categoryEn: "Communication",
    principleZh: "MFRC522 是一款高度集成的 13.56MHz 非接触式射频识别卡读写芯片。模块利用电磁感应原理，通过天线发射交变电磁波，为进入射频场内的无源 IC 卡/钥匙扣提供感应工作电源，并与之进行双向高速数据载波解调通信。在智能门禁、车载考勤等系统中作为读卡器使用，支持 SPI 串行总线。",
    principleEn: "MFRC522 is a highly integrated 13.56MHz contactless RFID reader module. Utilizing electromagnetic induction, it powers passive transponder cards (tags) entering its field and establishes high-speed bidirectional SPI communication to read or write block data.",
    voltageWarningZh: "工作电压固定为 3.3V，切勿连接 5V 电源！该模块通信引脚属于 3.3V 逻辑电平。连接 Arduino Nano (5V 供电) 时，其 SPI 通信引脚最好加装串联电阻（约 220Ω 或 1kΩ）进行限流保护，或者使用 3.3V/5V 双向电平转换器。",
    voltageWarningEn: "Operates strictly at 3.3V. Pins are not 5V tolerant. When wiring to a 5V controller (Arduino Nano), add series current-limiting resistors (e.g., 1kΩ) on logic lines or use a level translator to protect the SPI receiver.",
    pinFunctions: [
      { pin: "3.3V", descZh: "模块工作电源正极，必须接 3.3V", descEn: "Module power input, must connect 3.3V" },
      { pin: "RST", descZh: "复位输入引脚，低电平使能内部复位", descEn: "Reset input, active low" },
      { pin: "GND", descZh: "电源地 (0V)", descEn: "Ground" },
      { pin: "MISO", descZh: "SPI 总线从机输出主机输入线", descEn: "SPI MISO (Master In Slave Out)" },
      { pin: "MOSI", descZh: "SPI 总线主机输出从机输入线", descEn: "SPI MOSI (Master Out Slave In)" },
      { pin: "SCK", descZh: "SPI 串行时钟输入引脚", descEn: "SPI Serial Clock" },
      { pin: "SDA (NSS)", descZh: "SPI 片选信号输入端，接 GPIO", descEn: "SPI Chip Select (SS), active low" }
    ]
  },
  arduino: {
    nameZh: "Arduino Nano V3.0 主控开发板",
    nameEn: "Arduino Nano V3.0 Controller",
    categoryZh: "主控芯片",
    categoryEn: "Controller",
    principleZh: "Arduino Nano V3.0 是一款基于 ATmega328P 微控制器的通用型微小开发板。它具备 14 个数字输入/输出引脚（其中 6 个可用于 PWM 输出）、8 个模拟输入通道、一个 16MHz 石英晶体振荡器、一个 Mini-B USB 接口以及标准的 ICSP 烧录排针。由于其紧凑的直插排针结构，非常适合直接插在面包板上进行开发实验。",
    principleEn: "Arduino Nano V3.0 is a compact microcontroller board based on the ATmega328P. It features 14 digital I/O pins (6 PWM outputs), 8 analog inputs, a 16MHz crystal oscillator, and a Mini-B USB connection, perfectly breadboard-friendly.",
    voltageWarningZh: "开发板核心工作电压为 5V！其引脚输入与输出均工作在 5V 逻辑电平下。因此，若需要外接 3.3V 传感器（如 SGP30, MFRC522 等），必须通过板载 3.3V 引脚供电，且在数据线上增加电平转换保护。主板最大总输出电流限制在 200mA 左右，切勿使用板载 5V/3.3V 引脚直接给大功率电机或多个舵机供电。",
    voltageWarningEn: "Operates at 5V logic. Connecting 3.3V devices directly requires level shifting. Total microcontroller current draw should not exceed 200mA; avoid powering heavy loads like motors or multiple servos directly from board rails.",
    pinFunctions: [
      { pin: "5V", descZh: "5V 稳压电源输出引脚，外接传感器供电", descEn: "Regulated 5V output to power peripherals" },
      { pin: "3V3", descZh: "板载 3.3V 稳压输出脚，供电能力较弱(约 50mA)", descEn: "On-board 3.3V regulator output (Max 50mA)" },
      { pin: "GND", descZh: "电源公共参考接地引脚 (GND)", descEn: "Common Ground" },
      { pin: "VIN", descZh: "外部直流电源正极输入端 (6V - 12V)", descEn: "External DC voltage input (6V - 12V)" },
      { pin: "A4 (SDA)", descZh: "默认模拟输入通道 4 / I2C SDA 引脚", descEn: "Analog input 4 / I2C SDA communication" },
      { pin: "A5 (SCL)", descZh: "默认模拟输入通道 5 / I2C SCL 引脚", descEn: "Analog input 5 / I2C SCL communication" },
      { pin: "RST", descZh: "复位输入引脚，低电平使板卡硬件复位", descEn: "Reset input, active low" }
    ]
  },
  pico: {
    nameZh: "Raspberry Pi Pico W 树莓派微控制器",
    nameEn: "Raspberry Pi Pico W Board",
    categoryZh: "主控芯片",
    categoryEn: "Controller",
    principleZh: "Raspberry Pi Pico W 是基于树莓派 RP2040 双核 ARM Cortex-M0+ 微控制器芯片设计的无线开发板，内置 2MB 闪存。它集成了一个由英飞凌芯片提供的单频 2.4GHz 无线网络模块（Wi-Fi 4 和蓝牙 5.2），使得 Pico W 成为物联网无线教学、分布式采集控制的首选利器。支持标准的 C/C++ 以及 MicroPython 开发。",
    principleEn: "Raspberry Pi Pico W is a microcontroller board built on the RP2040 dual-core ARM Cortex-M0+ MCU with 2MB flash. It features an Infineon wireless chip supporting 2.4GHz Wi-Fi and Bluetooth 5.2, ideal for wireless IoT teaching.",
    voltageWarningZh: "核心工作电平为 3.3V，所有 GPIO 物理引脚最高仅能承载 3.3V！输入 5V 信号会导致核心永久烧毁。电源可通过 Micro-USB 输入，或者通过 VSYS 引脚提供 1.8V 至 5.5V 输入。接线时切勿将红色的 5V 传感器电源线接至 GPIO。",
    voltageWarningEn: "Operating voltage is 3.3V; pins are NOT 5V tolerant. Power can be supplied via USB or the VSYS pin (1.8V - 5.5V). Always verify sensor data line voltages before connecting to Pico GPIOs.",
    pinFunctions: [
      { pin: "3V3", descZh: "板载 3.3V 稳压电轨输出引脚，最大输出 300mA", descEn: "On-board 3.3V regulated power output (Max 300mA)" },
      { pin: "GND", descZh: "公共接地端", descEn: "Common Ground" },
      { pin: "VSYS", descZh: "系统主电源输入脚，支持电池/锂电池组输入", descEn: "System main power input (1.8V - 5.5V)" },
      { pin: "VBUS", descZh: "USB 连接器输入电源输出脚，输出 USB-C 5V 电压", descEn: "USB power pin output (5V from USB port)" },
      { pin: "GP4", descZh: "默认的 I2C SDA 数据通信引脚", descEn: "Default I2C SDA line" },
      { pin: "GP5", descZh: "默认的 I2C SCL 时钟通信引脚", descEn: "Default I2C SCL line" },
      { pin: "GP0", descZh: "UART 通信默认 TXD 串口输出脚", descEn: "Default UART TX line" },
      { pin: "GP1", descZh: "UART 通信默认 RXD 串口输入脚", descEn: "Default UART RX line" }
    ]
  },
  st7735: {
    nameZh: "ST7735 彩色 TFT 显示屏",
    nameEn: "ST7735 Color TFT Display",
    categoryZh: "显示器",
    categoryEn: "Display",
    principleZh: "ST7735 是一款支持 128x160 像素的彩色 TFT 液晶屏驱动芯片，支持 18 位/16 位色深表现。模块使用标准 SPI 串行总线进行通信，其自带内置 RAM 显存以维持静态图像显示，并有背光控制电路。由于其能够显示细腻丰富的彩色图形、菜单和波形曲线，在物联网创意作品和小型控制面板中有着广泛的应用。",
    principleEn: "ST7735 is a single-chip controller/driver for 262K color, 128x160 resolution TFT panels. It communicates via standard SPI bus, featuring built-in display RAM and backlight control circuits, widely used for rendering graphics and menus.",
    voltageWarningZh: "接口控制引脚及电源通常工作在 3.3V 逻辑！若外接 5V 开发板（如 Arduino Uno/Nano），必须在 SCK, MOSI, CS, DC 等数据线串联分压电阻或经过电平转换芯片，否则会损坏液晶屏的内部驱动电路。背光 LED 引脚（LED/BL）通常需要接限流电阻至 3.3V。",
    voltageWarningEn: "Logic level is 3.3V. Using 5V microcontrollers like Arduino requires serial resistors or logic level converters on SPI data lines to prevent permanent display driver damage. Backlight pin (LED/BL) needs a current-limiting resistor.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极输入 (3.3V / 建议)", descEn: "Power positive input (3.3V recommended)" },
      { pin: "GND", descZh: "电源参考接地引脚 (GND)", descEn: "Common Ground" },
      { pin: "CS", descZh: "SPI 协议片选控制引脚，低电平使能", descEn: "SPI Chip Select pin, active low" },
      { pin: "RST", descZh: "硬件复位输入引脚，低电平触发复位", descEn: "Hardware Reset pin, active low" },
      { pin: "DC/RS", descZh: "数据/命令选择控制线 (1=数据, 0=寄存器命令)", descEn: "Data/Command selection control pin (1=Data, 0=Command)" },
      { pin: "MOSI/SDA", descZh: "SPI 主出从入串行数据线，发送像素值", descEn: "SPI MOSI line for transmitting pixel data" },
      { pin: "SCK/SCL", descZh: "SPI 串行同步时钟总线脚", descEn: "SPI Serial Clock bus pin" }
    ]
  },
  tm1637: {
    nameZh: "TM1637 四位数码管显示模块",
    nameEn: "TM1637 4-Digit Display Module",
    categoryZh: "显示器",
    categoryEn: "Display",
    principleZh: "TM1637 是一款带键盘扫描接口的 LED（发光二极管显示器）驱动控制专用电路，内部集成 MCU 数字接口、数据锁存器、LED 驱动和键盘扫描等电路。模块板载四位共阳极红色数码管，并带有时钟分隔冒号（:），采用两线式协议（类似 I2C 但不完全相同，不需器件地址）进行串行控制，极大地节省了控制芯片的 I/O 引脚。",
    principleEn: "TM1637 is an LED driver control circuit with keyboard scan interface, integrated MCU digital interface, and data latches. The module features a 4-digit common-anode 7-segment display with a clock colon, controlled via a 2-wire serial protocol.",
    voltageWarningZh: "工作电压为 3.3V 至 5.0V。由于 TM1637 通信使用的是非标准两线协议，若在 STM32 硬件 I2C 上强行运行可能会导致时序冲突。通常建议使用普通 GPIO 软件模拟双线驱动，DIO 和 CLK 引脚不需要额外上拉电阻即可工作。",
    voltageWarningEn: "Operates at 3.3V - 5.0V. Since it uses a non-standard 2-wire protocol, software GPIO simulation is highly recommended rather than hardware I2C controllers to prevent protocol timing collisions.",
    pinFunctions: [
      { pin: "GND", descZh: "公共接地端 (GND)", descEn: "Power Ground (0V)" },
      { pin: "VCC", descZh: "电源输入引脚 (3.3V - 5V)", descEn: "Power input pin (3.3V - 5V)" },
      { pin: "DIO", descZh: "串行数据输入/输出双向控制脚", descEn: "Serial Data input/output bidirectional pin" },
      { pin: "CLK", descZh: "时钟信号输入脚，由主控芯片提供方波时钟", descEn: "Clock signal input pin, provided by MCU" }
    ]
  },
  max7219: {
    nameZh: "MAX7219 8x8 LED点阵屏模块",
    nameEn: "MAX7219 8x8 LED Matrix Module",
    categoryZh: "显示器",
    categoryEn: "Display",
    principleZh: "MAX7219 是一种集成化的串行输入/输出共阴极显示驱动器，它连接微处理器与 8 位数字的 7 段数字 LED 显示器、条形图显示器或 64 个独立的 LED（如 8x8 点阵）。芯片内部包括一个 B 型译码器、多路扫描电路、段字驱动器以及一个 8x8 的静态 RAM 用于存储每个数据。通信接口采用标准三线 SPI，且支持多个模块链式级联，从而可以使用相同的 3 根线驱动巨大的点阵看板。",
    principleEn: "MAX7219 is a compact, serial input/output common-cathode display driver. It interfaces microprocessors to 8-digit 7-segment displays or 8x8 LED dot matrices. It uses a 3-wire serial SPI interface and supports daisy-chaining.",
    voltageWarningZh: "工作电压为 4.5V 至 5.5V，推荐 5V 供电。虽然工作在 5V，但它的 SPI 逻辑引脚（DIN, CLK, CS）可以兼容 3.3V 主控（如 ESP32/STM32）的电平输入。请确保 5V 供电电流充足（单个点阵全亮可消耗达 300mA 左右，多个级联时必须使用外部独立电源，不可直接由开发板拉载）。",
    voltageWarningEn: "Operates at 4.5V - 5.5V (5V recommended). Logic inputs are 3.3V compatible. A single 8x8 matrix can draw up to 300mA when fully lit; always use external power when daisy-chaining multiple modules.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极输入 (必须接 5V 驱动)", descEn: "Power positive input (must connect to 5V)" },
      { pin: "GND", descZh: "电源接地参考脚", descEn: "Power Ground pin" },
      { pin: "DIN", descZh: "SPI 串行数据输入端，级联时接前级 DOUT", descEn: "SPI Serial Data input pin, connects to DOUT of previous stage" },
      { pin: "CS", descZh: "片选锁存信号线，高电平或脉冲装载数据", descEn: "Chip Select latch signal, loads data on rising edge" },
      { pin: "CLK", descZh: "SPI 串行同步时钟输入脚", descEn: "SPI Serial Clock input pin" }
    ]
  },
  relay: {
    nameZh: "5V 单路继电器模块",
    nameEn: "5V Single Relay Module",
    categoryZh: "执行器",
    categoryEn: "Actuator",
    principleZh: "单路继电器模块是一种通过电磁铁控制内部机械开关触点的电学器件，实现用微弱的低压数字信号控制高电压、大电流的交流或直流用电器负载。模块内部包含光耦隔离电路、晶体管驱动级、电磁线圈以及续流保护二极管。当控制引脚（IN）给有效电平时，光耦导通，晶体管放大驱动线圈，产生磁力吸引衔铁，使公共端（COM）从常闭端（NC）切换接通到常开端（NO）。",
    principleEn: "A relay is an electromagnetic switch operated by a relatively small electric current that can turn on or off a much larger electric current. It contains an optocoupler isolator, transistor driver, coil, and a freewheeling diode.",
    voltageWarningZh: "模块主供电 VCC 为 5V，但控制引脚 IN 的触发电压可以是 3.3V。由于电磁铁吸合瞬间会产生较大的浪涌电流，且断开时有极高的线圈反向电动势（虽然带有续流二极管保护），建议微控制器的电源与继电器的 VCC 之间串联光耦隔离，防止电磁干扰导致 MCU 意外复位。",
    voltageWarningEn: "Requires 5V VCC power, but logic trigger input (IN) supports 3.3V. Coil activation generates electromagnetic interference and switching surges; optocoupler isolation is recommended to prevent MCU reset.",
    pinFunctions: [
      { pin: "VCC", descZh: "5V 电磁线圈驱动电源输入", descEn: "5V electromagnetic coil power input" },
      { pin: "GND", descZh: "电源系统地线", descEn: "System Ground" },
      { pin: "IN", descZh: "数字控制信号输入引脚，高电平或低电平触发", descEn: "Digital control signal input, active-high or active-low trigger" }
    ]
  },
  ws2812b: {
    nameZh: "WS2812B 智能幻彩 RGB 灯条",
    nameEn: "WS2812B Addressable RGB Strip",
    categoryZh: "执行器",
    categoryEn: "Actuator",
    principleZh: "WS2812B 是一款集成了控制电路与发光电路于一体的智能外控 LED 光源。其外形采用标准的 5050 封装，内部包含一个数字接口数据锁存信号整形放大驱动电路，以及高精度的内部振荡器和 12V 高压恒流驱动级。采用单线级联归零码通讯协议（基于特定时间宽度的脉冲表示0和1），数据通过主控单引脚（DIN）串行送入，各芯片自动截取前 24 位 RGB 颜色数据，并将剩余数据整形放大后通过 DOUT 传给下一个灯珠，实现像素级寻址控制。",
    principleEn: "WS2812B is an intelligent control LED light source that integrates the control circuit and RGB chip into a single 5050 package. It uses a single-wire NZR communications protocol for pixel-level color control.",
    voltageWarningZh: "标准供电电压为 5.0V，严禁接高于 6V 的电源！由于数据总线采用特定的微秒级脉冲时序，通信线上建议串联一个 330Ω 至 470Ω 的电阻，防止高频阻抗不匹配破坏时序。另外，多颗灯全亮时电流巨大（每颗 RGB 全亮约消耗 60mA），若灯珠数超过 10 颗，必须使用外部独立 5V 供电，切勿通过开发板的 5V 引脚供电以防烧毁稳压器或熔断 USB 接口。",
    voltageWarningEn: "Operates strictly at 5.0V. Add a 330Ω - 470Ω serial resistor on the data line (DIN) to suppress voltage spikes. Multi-LED installations draw huge currents (60mA per LED); use external 5V power supply for >10 LEDs.",
    pinFunctions: [
      { pin: "5V", descZh: "5V 稳压电源输入正极", descEn: "5V regulated power input" },
      { pin: "DIN", descZh: "单线高精度串行数据输入引脚", descEn: "Single-wire high-precision serial data input pin" },
      { pin: "GND", descZh: "系统公共参考地线", descEn: "System reference Ground" }
    ]
  },
  l298n: {
    nameZh: "L298N 双路直流电机驱动板",
    nameEn: "L298N Dual Motor Driver Board",
    categoryZh: "执行器",
    categoryEn: "Actuator",
    principleZh: "L298N 是一款高电压、大电流双全桥式驱动芯片，内部包含 4 通道逻辑驱动电路和两个独立的全桥功率输出级。通常做成驱动板模块，配有滤波电容和板载 5V 稳压芯片（L7805）。模块通过 ENA/ENB 两个使能引脚进行 PWM 调速控制，而 IN1/IN2 和 IN3/IN4 输入引脚则控制双路直流电机的正反转与制动。它能够直接驱动电压最高达 46V、电流达 2A 的直流电机或双相步进电机。",
    principleEn: "L298N is a high-voltage, high-current dual full-bridge driver chip designed to accept standard TTL logic levels. It drives DC motors or bi-phase stepper motors up to 46V and 2A per channel using PWM inputs.",
    voltageWarningZh: "驱动板的 VS 为电机供电正极（必须接外部独立动力电池，电压范围 5V - 35V），VCC 为逻辑控制电源（5V），板载 5V 稳压跳线帽插上时，VS 可以给逻辑端稳压。注意：当电机运转、换向瞬间，会产生极高的反向反电动势（大浪涌），切勿将电机动力电源（VS）与单片机主板（3.3V/5V）共用同一组低功率电源，且两系统必须共地（GND）。",
    voltageWarningEn: "VS is the motor power input (5V - 35V, requires external battery/power source). Logic control requires 5V. Ensure MCU system and L298N share a common Ground (GND), but keep motor power paths physically isolated from logic rails.",
    pinFunctions: [
      { pin: "VS", descZh: "电机动力电源正极输入 (5V - 35V 强电输入)", descEn: "Motor driver supply voltage input (5V - 35V)" },
      { pin: "VCC", descZh: "5V 逻辑控制芯片供电端", descEn: "5V logic supply voltage input" },
      { pin: "GND", descZh: "电源公共参考地线，必须与主控共地", descEn: "Power Ground, must be tied to MCU Ground" },
      { pin: "IN1", descZh: "通道 A 正反转逻辑输入引脚 1", descEn: "Motor A direction logic input 1" },
      { pin: "IN2", descZh: "通道 A 正反转逻辑输入引脚 2", descEn: "Motor A direction logic input 2" },
      { pin: "IN3", descZh: "通道 B 正反转逻辑输入引脚 3", descEn: "Motor B direction logic input 3" },
      { pin: "IN4", descZh: "通道 B 正反转逻辑输入引脚 4", descEn: "Motor B direction logic input 4" },
      { pin: "ENA", descZh: "通道 A 使能引脚，接 PWM 可调节电机 A 转速", descEn: "Enable A pin, apply PWM to control Motor A speed" },
      { pin: "ENB", descZh: "通道 B 使能引脚，接 PWM 可调节电机 B 转速", descEn: "Enable B pin, apply PWM to control Motor B speed" }
    ]
  },
  uln2003: {
    nameZh: "ULN2003 步进电机驱动模块",
    nameEn: "ULN2003 Stepper Driver Module",
    categoryZh: "执行器",
    categoryEn: "Actuator",
    principleZh: "ULN2003 是一款高电压、大电流达林顿管阵列芯片，内部由七组 NPN 达林顿对管组成，每组都具有高压输出及共阴极钳位二极管，用于感性负载开关切换的续流保护。在步进电机驱动板上，通常引出 4 路数字控制端（IN1 - IN4），连接单片机 GPIO。按特定脉冲时序（单四拍/双四拍/八拍）依次给输入端送入高电平，即可驱动 28BYJ-48 等五线四相减速步进电机以精密角度转动。",
    principleEn: "ULN2003 is a high-voltage, high-current Darlington transistor array. In stepper driver modules, 4 inputs (IN1-IN4) from microcontroller GPIOs control a 5-wire 4-phase stepper motor (like 28BYJ-48) using sequential pulse trains.",
    voltageWarningZh: "驱动板的供电端通常需要接入 5V 或 12V 独立直流电源，以供应线圈工作电流。切勿直接通过开发板的 5V/3.3V 引脚带载，否则电机的频繁换相及线圈感性负荷会引入大量高频谐波和电压骤降，引发单片机程序紊乱、死机或硬件复位。",
    voltageWarningEn: "Requires 5V - 12V external power for stepper coils. Driving stepper motors directly from the MCU's on-board regulators will cause severe voltage dips, logic corruption, or hardware resets due to back EMF.",
    pinFunctions: [
      { pin: "IN1", descZh: "步进电机 A 相控制输入引脚", descEn: "Stepper Motor Phase A control input" },
      { pin: "IN2", descZh: "步进电机 B 相控制输入引脚", descEn: "Stepper Motor Phase B control input" },
      { pin: "IN3", descZh: "步进电机 C 相控制输入引脚", descEn: "Stepper Motor Phase C control input" },
      { pin: "IN4", descZh: "步进电机 D 相控制输入引脚", descEn: "Stepper Motor Phase D control input" },
      { pin: "GND", descZh: "公共接地端 (GND)", descEn: "Power Ground (0V)" }
    ]
  },
  neo6m: {
    nameZh: "NEO-6M GPS 全球定位模块",
    nameEn: "NEO-6M GPS Location Module",
    categoryZh: "通讯模块",
    categoryEn: "Communication",
    principleZh: "NEO-6M 是一款高性能 GPS 卫星定位接收机模组，集成 u-blox 6 导航引擎。模块配置了无源或有源陶瓷贴片天线，能够接收全球定位卫星信号，在室外开阔场地自动完成搜星锁频，计算出当前的经度、纬度、海拔高度、UTC 时间等丰富参数。数据以标准的 NMEA-0183 协议数据包格式，通过硬件串口（UART）以 9600 默认波特率不断向主控芯片发送，通常搭配 TinyGPS++ 库解析经纬度字符串。",
    principleEn: "NEO-6M is a high-performance GPS receiver module with an integrated u-blox 6 engine and patch antenna. It outputs standard NMEA-0183 sentences via a standard UART serial interface, typically running at 9600 bps.",
    voltageWarningZh: "工作电压为 3.0V 至 5.0V。其串口输出 Tx 引脚的逻辑电平为 3.3V 逻辑，可安全地直接连接 ESP32, STM32 或 5V 的 Arduino。注意：该模块在室内、建筑内或者茂密树木下由于无法直接接收卫星的无线微波信号，可能会导致搜星失败，定位指示 LED 闪烁表示定位成功。",
    voltageWarningEn: "Operates at 3.0V - 5.0V with 3.3V UART logic output. GPS microwave signals cannot penetrate indoor walls or concrete structures; testing must be performed outdoors or near windows.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入引脚 (3.3V - 5V)", descEn: "Power input pin (3.3V - 5V)" },
      { pin: "RX", descZh: "串口接收脚，接收命令，兼容 3.3V/5V", descEn: "UART RX input, accepts configuration commands" },
      { pin: "TX", descZh: "串口发送脚，输出标准 NMEA 报文 (3.3V 逻辑)", descEn: "UART TX output, sends NMEA packets (3.3V logic)" },
      { pin: "GND", descZh: "公共参考接地端 (0V)", descEn: "Power Ground (0V)" }
    ]
  },
  hc05: {
    nameZh: "HC-05 蓝牙串口透传模块",
    nameEn: "HC-05 Bluetooth Serial Module",
    categoryZh: "通讯模块",
    categoryEn: "Communication",
    principleZh: "HC-05 是一款主从一体的蓝牙串口透传模块，基于蓝牙 2.0+EDR 规范设计。模块引出串口接口（UART），在配对建立成功后，其底层射频无线协议对主控芯片完全透明，相当于一根无线的串行数据线。用户可以使用它与手机 APP 建立蓝牙连接以发送指令；也可以让两个 HC-05 模块（一个设置为主机，一个设置为从机）自动配对，实现两个单片机开发板之间的远距离无线透传。",
    principleEn: "HC-05 is a Master/Slave Bluetooth SPP (Serial Port Protocol) module designed for wireless serial communication. Once paired, it acts as a transparent wireless serial bridge between the MCU and Bluetooth terminals.",
    voltageWarningZh: "底板供电 VCC 支持 3.6V 至 6V，但模块核心的 Rx/Tx 数据线工作在 3.3V 逻辑！若连接 5V 单片机（如 Arduino Uno/Nano），其 Rx 接收脚必须连接分压电阻（如 1kΩ 和 2kΩ），否则 5V 的串口电平高频灌入会导致蓝牙核心芯片永久烧毁。",
    voltageWarningEn: "VCC accepts 3.6V - 6V, but UART data lines operate at 3.3V logic. Connecting to 5V MCUs like Arduino requires a resistor divider on the module's RX line to prevent terminal chip burnout.",
    pinFunctions: [
      { pin: "VCC", descZh: "底板电源输入脚 (3.6V - 6V)", descEn: "Power input pin (3.6V - 6V)" },
      { pin: "GND", descZh: "公共接地端", descEn: "Power Ground" },
      { pin: "TX", descZh: "串口数据发送引脚 (3.3V 逻辑)", descEn: "UART TX serial data output (3.3V logic)" },
      { pin: "RX", descZh: "串口数据接收引脚 (3.3V 逻辑，接 5V 需分压)", descEn: "UART RX serial data input (3.3V logic, needs divider on 5V)" }
    ]
  },
  nrf24l01: {
    nameZh: "nRF24L01 2.4G 无线通信模块",
    nameEn: "nRF24L01 2.4G Wireless Module",
    categoryZh: "通讯模块",
    categoryEn: "Communication",
    principleZh: "nRF24L01 是一款工作在 2.4GHz 到 2.5GHz 世界通用 ISM 频段的单芯片无线收发器芯片。它内置了 ShockBurst 硬件协议链路层，能自动处理报头、自动校验 CRC 以及自动应答（Auto-ACK），极大地减轻了主控 MCU 的运算负担。主控芯片通过标准 SPI 协议与 nRF24L01 进行控制寄存器配置和读写数据包。常用于遥控玩具、无线遥控手柄及中短距离的传感器网络数据收集。",
    principleEn: "nRF24L01 is a single-chip 2.4GHz transceiver with an embedded packet processing engine (ShockBurst), enabling hardware-level CRC and auto-acknowledgment over a standard high-speed SPI bus interface.",
    voltageWarningZh: "工作供电电压 VCC 必须严格限制在 1.9V 到 3.6V 之间（推荐 3.3V），接入 5V 会瞬间烧毁芯片！不过其 SPI 数据控制脚（MOSI, MISO, SCK, CSN, CE）是 5V 耐压的，可以直接连接 5V 开发板。由于芯片工作在 2.4G 射频状态，工作电流会瞬时剧烈切换，建议在模块的 VCC 与 GND 之间并联一个 10uF 的电解电容或钽电容，以滤除电源纹波干扰，防止无线数据包丢失或通信中断。",
    voltageWarningEn: "VCC supply must be 1.9V - 3.6V (3.3V recommended). Do NOT apply 5V to VCC. SPI signal pins are 5V tolerant. Add a 10uF decoupling capacitor across VCC and GND to filter out power supply ripple.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源输入端 (必须在 1.9V - 3.6V 之间)", descEn: "Power input (must be 1.9V - 3.6V)" },
      { pin: "GND", descZh: "系统公共参考地", descEn: "Power Ground" },
      { pin: "CSN", descZh: "SPI 片选选择引脚，低电平选中设备", descEn: "SPI Chip Select Not pin, active low" },
      { pin: "CE", descZh: "工作模式使能控制引脚 (接收/发送使能控制)", descEn: "Chip Enable pin, controls RX/TX active modes" },
      { pin: "MOSI", descZh: "SPI 主出从入数据总线脚", descEn: "SPI Master Out Slave In line" },
      { pin: "MISO", descZh: "SPI 主入从出数据总线脚", descEn: "SPI Master In Slave Out line" },
      { pin: "SCK", descZh: "SPI 同步串行时钟总线脚", descEn: "SPI Serial Clock line" }
    ]
  },
  nodemcu: {
    nameZh: "NodeMCU V3 (ESP8266) 物联网开发板",
    nameEn: "NodeMCU V3 (ESP8266) Development Board",
    categoryZh: "主控芯片",
    categoryEn: "Controller",
    principleZh: "NodeMCU V3 是一款集成了 ESP8266 核心无线芯片与 CP2102/CH340 串口转换芯片的高集成度物联网快速原型开发板。它自带 PCB 天线，具备 11 个数字输入/输出引脚（均支持中断/PWM/I2C/单总线，除 D0 外）和 1 个模拟输入通道（A0）。目前广泛应用于配合 Arduino IDE、PlatformIO 环境，使用 C/C++ 语言进行轻量级物联网边缘节点开发。",
    principleEn: "NodeMCU V3 is an open-source firmware and development kit that helps to prototype IoT products using ESP8266 WiFi MCU. It integrates serial converter and voltage regulator, programmed with Arduino C++ or MicroPython.",
    voltageWarningZh: "微控制器核心工作电压为 3.3V。板载的 5V 引脚在接 USB 时为 5V 输入/输出，其余所有的 D0 - D8 以及 Rx/Tx 引脚只能承载最高 3.3V 的信号输入！错误地将 5V 数据信号直接灌入 GPIO 会损坏开发板芯片。另外，由于 ESP8266 在连接 WiFi 或发送数据包时，射频电路瞬时瞬态功耗大（可达 300mA 以上），供电电源应保证足够的输出电流裕量。",
    voltageWarningEn: "Core runs at 3.3V; GPIO pins are NOT 5V tolerant. GPIO pins accept max 3.3V logic. Connecting 5V lines directly damages the MCU. Wi-Fi transmissions cause temporary current surges (>300mA); ensure stable power supplies.",
    pinFunctions: [
      { pin: "3V3", descZh: "板载 3.3V 稳压输出引脚，对外设模块供电", descEn: "On-board 3.3V regulated power output" },
      { pin: "GND", descZh: "系统公共参考地引脚", descEn: "System reference Ground" },
      { pin: "TX", descZh: "主 UART0 串口发送引脚 (GPIO 1)", descEn: "Primary UART0 TX line (GPIO 1)" },
      { pin: "RX", descZh: "主 UART0 串口接收引脚 (GPIO 3)", descEn: "Primary UART0 RX line (GPIO 3)" },
      { pin: "D0", descZh: "GPIO 16 / 带板载 LED，不支持硬中断", descEn: "GPIO 16 / tied to onboard LED, no interrupt support" },
      { pin: "D1", descZh: "GPIO 5 / 默认的 I2C SCL 时钟总线脚", descEn: "GPIO 5 / default I2C SCL clock pin" },
      { pin: "D2", descZh: "GPIO 4 / 默认的 I2C SDA 数据总线脚", descEn: "GPIO 4 / default I2C SDA data pin" },
      { pin: "D3", descZh: "GPIO 0 / 启动引导选择脚，默认内部上拉", descEn: "GPIO 0 / boot selection pin, internal pull-up" },
      { pin: "D4", descZh: "GPIO 2 / 辅助发送引脚，连接板载辅助 LED", descEn: "GPIO 2 / secondary TX, tied to ESP-12 module LED" },
      { pin: "D5", descZh: "GPIO 14 / HSPI SCK 时钟信号引脚", descEn: "GPIO 14 / HSPI Clock line" },
      { pin: "D6", descZh: "GPIO 12 / HSPI MISO 数据信号引脚", descEn: "GPIO 12 / HSPI MISO line" },
      { pin: "D7", descZh: "GPIO 13 / HSPI MOSI 数据信号引脚", descEn: "GPIO 13 / HSPI MOSI line" },
      { pin: "D8", descZh: "GPIO 15 / HSPI CS 片选信号线，低电平使能", descEn: "GPIO 15 / HSPI Chip Select, active low" },
      { pin: "RXD/RX2", descZh: "辅助接收引脚 (通常不作主串口)", descEn: "Auxiliary RX serial receive pin" },
      { pin: "TXD/TX2", descZh: "辅助发送引脚 (通常不作主串口)", descEn: "Auxiliary TX serial transmit pin" },
      { pin: "5V", descZh: "接 USB 时输出稳定 5V，或接外部 5V 给开发板供电", descEn: "5V power input or output via USB connector" }
    ]
  },
  ldr: {
    nameZh: "光敏电阻传感器",
    nameEn: "Photoresistor Sensor (LDR)",
    categoryZh: "传感器",
    categoryEn: "Sensor",
    principleZh: "光敏电阻（LDR，光电导器件）是一种电阻值随入射光线强弱而变化的传感器。在无光照（黑暗）时，其半导体内部载流子极少，电阻呈高阻状态（一般可达数兆欧）；当受到光照时，光子激发半导体材料内的电子跃迁，自由电子浓度上升，从而使电阻值迅速下降（可降至几百甚至几十欧）。模块通常搭配分压电阻，通过模拟引脚 (A0) 输出变化的电压值，或者通过 LM393 比较器数字引脚 (D0) 输出阈值电平。",
    principleEn: "A photoresistor (or light-dependent resistor, LDR) is a light-controlled variable resistor. The resistance of a photoresistor decreases with increasing incident light intensity; in other words, it exhibits photoconductivity. LDR sensor modules typically include a voltage divider circuit to output an analog voltage (A0) corresponding to light level, or a digital output (D0) via an onboard LM393 comparator based on a potentiometer threshold.",
    voltageWarningZh: "工作电压通常为 3.3V 至 5.0V。在 3.3V 主控（如 ESP32）上使用模拟输出 A0 时，建议将模块直接用 3.3V 供电，以使输出电压范围刚好匹配主控 ADC 量程。注意不要将 5V 供电下的模拟引脚直接连到 3.3V 主控引脚，以免过压烧毁 GPIO。",
    voltageWarningEn: "Operates at 3.3V - 5.0V. When using the analog output (A0) with a 3.3V microcontroller (like ESP32), power the sensor with 3.3V to safely map the output voltage range to the ADC's range. Do NOT connect a 5V analog output directly to a 3.3V GPIO pin.",
    pinFunctions: [
      { pin: "VCC", descZh: "电源正极 (3.3V - 5V)", descEn: "Power positive (3.3V - 5V)" },
      { pin: "GND", descZh: "电源参考地 (0V)", descEn: "Power Ground (0V)" },
      { pin: "OUT/A0", descZh: "模拟电压输出，光照越强输出电压越低（或根据分压结构相反）", descEn: "Analog voltage output (lower voltage for brighter light depending on configuration)" },
      { pin: "D0", descZh: "数字阀值开关输出，光照超标输出低电平", descEn: "Digital switch output, goes Low when light exceeds threshold" }
    ]
  }
};
