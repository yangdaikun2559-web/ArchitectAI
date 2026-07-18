export interface MCU {
  id: string;
  name: string;
  family: 'ESP32' | 'STM32' | 'Arduino' | 'Other';
  sdaPin: string;
  sclPin: string;
  rxPin: string;
  txPin: string;
  voltage: string;
  rom: string;
  active: boolean;
}

export interface ComponentItem {
  id: string;
  name: string;
  type: 'I2C' | 'Analog' | 'Digital' | 'PWM' | 'SPI' | 'UART';
  category: 'Sensor' | 'Display' | 'Alert' | 'Actuator' | 'Other';
  pinsUsed: number;
  voltage: '3.3V' | '5V' | 'Both';
  active: boolean;
  description: string;
  macroPrefix?: string;
  cadLayout?: {
    width: number;
    height: number;
    renderType: string;
    pins: { name: string; offsetY: number; type: string }[];
  };
  drivers?: {
    platformioLibs: string[];
    includes: string[];
    defines: string[];
    globalInstantiation: string;
    setupCode: string;
    apiDocumentation: string;
  };
}

export const DEFAULT_MCUS: MCU[] = [
  { id: 'mcu_1', name: 'ESP32-WROOM-32E', family: 'ESP32', sdaPin: 'GPIO 21', sclPin: 'GPIO 22', rxPin: 'GPIO 3', txPin: 'GPIO 1', voltage: '3.3V', rom: '4MB', active: true },
  { id: 'mcu_2', name: 'STM32F103C8T6 (BluePill)', family: 'STM32', sdaPin: 'PB7', sclPin: 'PB6', rxPin: 'PA10', txPin: 'PA9', voltage: '3.3V', rom: '64KB', active: true },
  { id: 'mcu_3', name: 'Arduino Nano V3.0', family: 'Arduino', sdaPin: 'A4', sclPin: 'A5', rxPin: 'D0', txPin: 'D1', voltage: '5V', rom: '32KB', active: true },
  { id: 'mcu_4', name: 'ESP8266 NodeMCU V3', family: 'ESP32', sdaPin: 'GPIO 4', sclPin: 'GPIO 5', rxPin: 'GPIO 3', txPin: 'GPIO 1', voltage: '3.3V', rom: '4MB', active: false },
  { id: 'mcu_5', name: 'Raspberry Pi Pico W', family: 'Other', sdaPin: 'GP4', sclPin: 'GP5', rxPin: 'GP1', txPin: 'GP0', voltage: '3.3V', rom: '2MB', active: true }
];

export const DEFAULT_COMPONENTS: ComponentItem[] = [
  {
    id: 'comp_1',
    name: 'DHT22 温湿度传感器',
    type: 'Digital',
    category: 'Sensor',
    pinsUsed: 1,
    voltage: 'Both',
    active: true,
    description: '单总线精密温湿度传感器，默认 10k 上拉',
    macroPrefix: 'DHT',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'DATA', offsetY: 45, type: 'GPIO' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/DHT sensor library', 'adafruit/Adafruit Unified Sensor'],
      includes: ['#include <DHT.h>'],
      defines: ['#define DHTTYPE DHT22'],
      globalInstantiation: 'DHT dht(PIN_{{MACRO_PREFIX}}, DHTTYPE);',
      setupCode: 'dht.begin();',
      apiDocumentation: 'float readTemperature(); - 读取摄氏度温度值\nfloat readHumidity(); - 读取空气相对湿度值'
    }
  },
  {
    id: 'comp_2',
    name: 'MQ-2 易燃气体传感器',
    type: 'Analog',
    category: 'Sensor',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '烟雾、液化气与天然气敏感电阻探头',
    macroPrefix: 'MQ2',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 45, type: 'GND' },
        { name: 'A0', offsetY: 72, type: 'ADC' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: '',
      apiDocumentation: 'int analogRead(PIN_{{MACRO_PREFIX}}); - 读取气体模拟浓度值'
    }
  },
  {
    id: 'comp_3',
    name: 'OLED 128x64 SSD1306',
    type: 'I2C',
    category: 'Display',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '经典 I2C 控制显示屏',
    macroPrefix: 'OLED',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'oled_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit SSD1306', 'adafruit/Adafruit GFX Library'],
      includes: ['#include <Wire.h>', '#include <Adafruit_GFX.h>', '#include <Adafruit_SSD1306.h>'],
      defines: ['#define SCREEN_WIDTH 128', '#define SCREEN_HEIGHT 64', '#define OLED_RESET -1'],
      globalInstantiation: 'Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);',
      setupCode: 'if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { Serial.println(F("SSD1306 allocation failed")); }\ndisplay.clearDisplay();\ndisplay.display();',
      apiDocumentation: 'void clearDisplay(); - 清屏\nvoid display(); - 刷新显示\nvoid setTextSize(uint8_t s); - 设置文字大小\nvoid setTextColor(uint16_t c); - 设置颜色\nvoid setCursor(int16_t x, int16_t y); - 设置光标位置\nvoid print(String s); - 输出文字\nvoid println(String s); - 输出文字并换行'
    }
  },
  {
    id: 'comp_4',
    name: '1602 LCD (配合 I2C 转接板)',
    type: 'I2C',
    category: 'Display',
    pinsUsed: 2,
    voltage: '5V',
    active: true,
    description: '低成本带背光字符液晶显示器',
    macroPrefix: 'LCD',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'oled_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['marcoschwartz/LiquidCrystal_I2C'],
      includes: ['#include <LiquidCrystal_I2C.h>'],
      defines: [],
      globalInstantiation: 'LiquidCrystal_I2C lcd(0x27, 16, 2);',
      setupCode: 'lcd.init();\nlcd.backlight();',
      apiDocumentation: 'void clear(); - 清屏\nvoid setCursor(uint8_t col, uint8_t row); - 设置光标\nvoid print(String s); - 显示文本\nvoid println(String s); - 显示文本并换行'
    }
  },
  {
    id: 'comp_5',
    name: 'SG90 模拟舵机',
    type: 'PWM',
    category: 'Actuator',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '50Hz 单片机 PWM 频率占空比电机',
    macroPrefix: 'SERVO',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 45, type: 'GND' },
        { name: 'PWM', offsetY: 72, type: 'PWM' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: ['#include <ESP32Servo.h>'],
      defines: [],
      globalInstantiation: 'Servo myservo;',
      setupCode: 'myservo.attach(PIN_{{MACRO_PREFIX}});',
      apiDocumentation: 'void write(int value); - 写入引脚角度值（0-180度）'
    }
  },
  {
    id: 'comp_6',
    name: '有源 5V 蜂鸣器',
    type: 'Digital',
    category: 'Alert',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '高电平直接触发持续警报声响',
    macroPrefix: 'BUZZER',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'buzzer_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 45, type: 'GND' },
        { name: 'I/O', offsetY: 72, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: 'pinMode(PIN_{{MACRO_PREFIX}}, OUTPUT);',
      apiDocumentation: 'digitalWrite(PIN_{{MACRO_PREFIX}}, HIGH); - 开启/触发蜂鸣器鸣叫\ndigitalWrite(PIN_{{MACRO_PREFIX}}, LOW); - 关闭蜂鸣器'
    }
  },
  {
    id: 'comp_7',
    name: 'MAX6675 K型热电偶',
    type: 'SPI',
    category: 'Sensor',
    pinsUsed: 3,
    voltage: '3.3V',
    active: true,
    description: '冷端补偿串行通讯 SPI 摄氏度温度变送器',
    macroPrefix: 'MAX6675',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCK', offsetY: 54, type: 'GPIO' },
        { name: 'CS', offsetY: 72, type: 'GPIO' },
        { name: 'SO', offsetY: 90, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/MAX6675 library'],
      includes: ['#include <max6675.h>'],
      defines: [],
      globalInstantiation: 'MAX6675 thermocouple(PIN_{{MACRO_PREFIX}}_SCK, PIN_{{MACRO_PREFIX}}_CS, PIN_{{MACRO_PREFIX}}_SO);',
      setupCode: '',
      apiDocumentation: 'double readCelsius(); - 读取热电偶的实时摄氏度温度'
    }
  },
  {
    id: 'comp_8',
    name: 'ESP8266 Wi-Fi 模块 (ESP-01S)',
    type: 'UART',
    category: 'Other',
    pinsUsed: 2,
    voltage: '3.3V',
    active: true,
    description: '串行 AT 指令 Wi-Fi 芯片，用于外挂联网通讯',
    macroPrefix: 'ESP8266',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'TXD', offsetY: 54, type: 'UART_TX' },
        { name: 'RXD', offsetY: 72, type: 'UART_RX' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: '',
      apiDocumentation: '支持发送标准 AT 串行指令与 ESP8266 连接，用于 TCP/UDP MQTT 联网数据上报。'
    }
  },
  {
    id: 'comp_9',
    name: 'MAX30102 心率血氧传感器',
    type: 'I2C',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: '3.3V',
    active: true,
    description: '集成了发光二极管与光电检测器的脉搏血氧及心率监测传感器',
    macroPrefix: 'MAX30102',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['sparkfun/SparkFun MAX3010x Pulse Oximeter and Heart Rate Sensor'],
      includes: ['#include <Wire.h>', '#include "MAX30105.h"'],
      defines: [],
      globalInstantiation: 'MAX30105 particleSensor;',
      setupCode: 'if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { Serial.println("MAX30102 not found"); }',
      apiDocumentation: 'float getTemperature(); - 读取内置温度传感器值\nvoid setup(); - 初始化传感器设置\nuint32_t getRed(); - 获取红光强度通道数据\nuint32_t getIR(); - 获取红外光强度通道数据'
    }
  },
  {
    id: 'comp_10',
    name: 'DS18B20 防水温度传感器',
    type: 'Digital',
    category: 'Sensor',
    pinsUsed: 1,
    voltage: 'Both',
    active: true,
    description: '单总线精密数字温度传感器，广泛用于液体和管道温度测量',
    macroPrefix: 'DS18B20',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'DATA', offsetY: 45, type: 'GPIO' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: ['paulstoffregen/OneWire', 'milesburton/DallasTemperature'],
      includes: ['#include <OneWire.h>', '#include <DallasTemperature.h>'],
      defines: [],
      globalInstantiation: 'OneWire oneWire_DS18B20(PIN_{{MACRO_PREFIX}}); DallasTemperature sensors_DS18B20(&oneWire_DS18B20);',
      setupCode: 'sensors_DS18B20.begin();',
      apiDocumentation: 'float getTempCByIndex(int index); - 获取指定索引传感器摄氏温度值\nvoid requestTemperatures(); - 发送温度转换请求指令'
    }
  },
  {
    id: 'comp_11',
    name: 'HC-SR04 超声波测距传感器',
    type: 'Digital',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: '5V',
    active: true,
    description: '非接触式超声波测距模块，测量范围 2cm-400cm',
    macroPrefix: 'ULTRASONIC',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'TRIG', offsetY: 36, type: 'GPIO' },
        { name: 'ECHO', offsetY: 54, type: 'GPIO' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: ['teckel12/NewPing'],
      includes: ['#include <NewPing.h>'],
      defines: ['#define MAX_DISTANCE 400'],
      globalInstantiation: 'NewPing sonar(PIN_{{MACRO_PREFIX}}_TRIG, PIN_{{MACRO_PREFIX}}_ECHO, MAX_DISTANCE);',
      setupCode: '',
      apiDocumentation: 'unsigned int ping_cm(); - 获取测距厘米数，若超出范围或未检测到则返回 0\nunsigned int ping_median(uint8_t it); - 多次测量求中值，提高抗干扰度'
    }
  },
  {
    id: 'comp_12',
    name: 'MPU6050 三轴陀螺仪加速度传感器',
    type: 'I2C',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '集成3轴陀螺仪、3轴加速度计及数字运动处理器(DMP)',
    macroPrefix: 'MPU6050',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit MPU6050', 'adafruit/Adafruit Unified Sensor', 'adafruit/Adafruit BusIO'],
      includes: ['#include <Adafruit_MPU6050.h>', '#include <Adafruit_Sensor.h>', '#include <Wire.h>'],
      defines: [],
      globalInstantiation: 'Adafruit_MPU6050 mpu;',
      setupCode: 'if (!mpu.begin()) { Serial.println("MPU6050 connection failed"); }',
      apiDocumentation: 'bool getEvent(sensors_event_t *a, sensors_event_t *g, sensors_event_t *temp); - 获取加速度、陀螺仪和温度传感器数据事件'
    }
  },
  {
    id: 'comp_13',
    name: 'BME280 温湿度气压传感器',
    type: 'I2C',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '高精度环境温度、相对湿度与绝对大气压强测量传感器',
    macroPrefix: 'BME280',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit BME280 Library', 'adafruit/Adafruit Unified Sensor'],
      includes: ['#include <Wire.h>', '#include <Adafruit_Sensor.h>', '#include <Adafruit_BME280.h>'],
      defines: ['#define SEALEVELPRESSURE_HPA (1013.25)'],
      globalInstantiation: 'Adafruit_BME280 bme;',
      setupCode: 'if (!bme.begin(0x76)) { Serial.println("BME280 not found, check addr 0x76/0x77"); }',
      apiDocumentation: 'float readTemperature(); - 获取当前气温摄氏度\nfloat readHumidity(); - 获取空气相对湿度百分比\nfloat readPressure(); - 获取大气压帕斯卡 (Pa)\nfloat readAltitude(float seaLevelhPa); - 估算当前海拔高度值'
    }
  },
  {
    id: 'comp_14',
    name: 'BH1750 数字光照传感器',
    type: 'I2C',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '两线式串行总线数字光强度传感器，直接输出勒克斯(Lux)值',
    macroPrefix: 'BH1750',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['claws/BH1750'],
      includes: ['#include <Wire.h>', '#include <BH1750.h>'],
      defines: [],
      globalInstantiation: 'BH1750 lightMeter;',
      setupCode: 'Wire.begin(); if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) { Serial.println("BH1750 init error"); }',
      apiDocumentation: 'float readLightLevel(); - 直接读取实时照度 Lux 数值'
    }
  },
  {
    id: 'comp_15',
    name: 'HC-SR501 人体红外感应传感器',
    type: 'Digital',
    category: 'Sensor',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '基于红外线技术的自动控制模块，检测人体移动输出高电平信号',
    macroPrefix: 'PIR',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'OUT', offsetY: 45, type: 'GPIO' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: 'pinMode(PIN_{{MACRO_PREFIX}}, INPUT);',
      apiDocumentation: 'digitalRead(PIN_{{MACRO_PREFIX}}); - 检测是否有人，返回 HIGH 表示有人检测到，LOW 表示无人'
    }
  },
  {
    id: 'comp_16',
    name: 'YL-69 土壤湿度传感器',
    type: 'Analog',
    category: 'Sensor',
    pinsUsed: 1,
    voltage: 'Both',
    active: true,
    description: '插入土壤测量水份的电阻式感应器，支持模拟和数字双路输出',
    macroPrefix: 'SOIL',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 45, type: 'GND' },
        { name: 'A0', offsetY: 72, type: 'ADC' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: 'pinMode(PIN_{{MACRO_PREFIX}}, INPUT);',
      apiDocumentation: 'int analogRead(PIN_{{MACRO_PREFIX}}); - 读取湿度模拟值，越湿数值越小（通常 0-4095）'
    }
  },
  {
    id: 'comp_17',
    name: 'MFRC522 RFID 射频刷卡模块',
    type: 'SPI',
    category: 'Sensor',
    pinsUsed: 4,
    voltage: '3.3V',
    active: true,
    description: '13.56MHz 高集成度非接触式射频读写卡芯片',
    macroPrefix: 'RC522',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 30, type: 'GND' },
        { name: 'RST', offsetY: 42, type: 'GPIO' },
        { name: 'MISO', offsetY: 54, type: 'GPIO' },
        { name: 'MOSI', offsetY: 66, type: 'GPIO' },
        { name: 'SCK', offsetY: 78, type: 'GPIO' },
        { name: 'SDA/SS', offsetY: 90, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: ['miguelbalboa/rfid'],
      includes: ['#include <SPI.h>', '#include <MFRC522.h>'],
      defines: [],
      globalInstantiation: 'MFRC522 mfrc522(PIN_{{MACRO_PREFIX}}_SS, PIN_{{MACRO_PREFIX}}_RST);',
      setupCode: 'SPI.begin(); mfrc522.PCD_Init();',
      apiDocumentation: 'bool PICC_IsNewCardPresent(); - 检查是否有新卡片\nbool PICC_ReadCardSerial(); - 读取卡片序列号，返回 true 表示成功\nvoid PICC_DumpToSerial(MFRC522::Uid *uid); - 串口格式化打印卡片 UUID'
    }
  },
  {
    id: 'comp_18',
    name: 'SGP30 空气质量 TVOC 传感器',
    type: 'I2C',
    category: 'Sensor',
    pinsUsed: 2,
    voltage: '3.3V',
    active: true,
    description: '金属氧化物气体传感器，测量等效二氧化碳和总挥发性有机物',
    macroPrefix: 'SGP30',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'SCL', offsetY: 54, type: 'I2C_SCL' },
        { name: 'SDA', offsetY: 72, type: 'I2C_SDA' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit SGP30 Sensor'],
      includes: ['#include <Wire.h>', '#include "Adafruit_SGP30.h"'],
      defines: [],
      globalInstantiation: 'Adafruit_SGP30 sgp;',
      setupCode: 'if (!sgp.begin()) { Serial.println("SGP30 not found"); }',
      apiDocumentation: 'bool IAQmeasure(); - 开启环境参数采集更新命令，返回 true 表示成功\nuint16_t TVOC; - TVOC 有毒有害挥发物浓度(ppb)\nuint16_t eCO2; - 等效二氧化碳浓度(ppm)'
    }
  },
  {
    id: 'comp_19',
    name: 'ST7735 彩色 TFT 显示屏',
    type: 'SPI',
    category: 'Display',
    pinsUsed: 5,
    voltage: '3.3V',
    active: true,
    description: '1.8寸彩色 TFT 液晶屏，分辨率 128x160，采用 SPI 接口控制',
    macroPrefix: 'TFT',
    cadLayout: {
      width: 160,
      height: 120,
      renderType: 'oled_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 30, type: 'GND' },
        { name: 'CS', offsetY: 45, type: 'GPIO' },
        { name: 'RST', offsetY: 60, type: 'GPIO' },
        { name: 'DC', offsetY: 75, type: 'GPIO' },
        { name: 'MOSI', offsetY: 90, type: 'SPI_MOSI' },
        { name: 'SCK', offsetY: 105, type: 'SPI_SCK' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit ST7735 and ST7789 Library', 'adafruit/Adafruit GFX Library', 'adafruit/Adafruit BusIO'],
      includes: ['#include <Adafruit_GFX.h>', '#include <Adafruit_ST7735.h>', '#include <SPI.h>'],
      defines: [],
      globalInstantiation: 'Adafruit_ST7735 tft = Adafruit_ST7735(PIN_{{MACRO_PREFIX}}_CS, PIN_{{MACRO_PREFIX}}_DC, PIN_{{MACRO_PREFIX}}_RST);',
      setupCode: 'tft.initR(INITR_BLACKTAB); tft.fillScreen(ST7735_BLACK);',
      apiDocumentation: 'void fillScreen(uint16_t color); - 填充整个屏幕颜色\nvoid setCursor(int16_t x, int16_t y); - 设置光标坐标\nvoid setTextColor(uint16_t c); - 设置文本前景色\nvoid setTextSize(uint8_t s); - 设置字体大小\nvoid print(String s); - 显示普通文本'
    }
  },
  {
    id: 'comp_20',
    name: 'TM1637 四位数码管显示模块',
    type: 'Digital',
    category: 'Display',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '带时钟点（冒号）的四位共阳极数码管显示器模块，适用于电子时钟 and 简易计数看板',
    macroPrefix: 'SEG',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'oled_style',
      pins: [
        { name: 'GND', offsetY: 18, type: 'GND' },
        { name: 'VCC', offsetY: 36, type: 'VCC' },
        { name: 'DIO', offsetY: 54, type: 'GPIO' },
        { name: 'CLK', offsetY: 72, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: ['smouban/TM1637'],
      includes: ['#include <TM1637Display.h>'],
      defines: [],
      globalInstantiation: 'TM1637Display displaySeg(PIN_{{MACRO_PREFIX}}_CLK, PIN_{{MACRO_PREFIX}}_DIO);',
      setupCode: 'displaySeg.setBrightness(0x0f);',
      apiDocumentation: 'void showNumberDec(int num, bool leading_zero = false, uint8_t length = 4, uint8_t pos = 0); - 在数码管显示10进制数字\nvoid setSegments(const uint8_t segments[], uint8_t length = 4, uint8_t pos = 0); - 设定原始段码进行自定义字符显示'
    }
  },
  {
    id: 'comp_21',
    name: 'MAX7219 8x8 LED点阵屏模块',
    type: 'SPI',
    category: 'Display',
    pinsUsed: 3,
    voltage: '5V',
    active: true,
    description: '由 MAX7219 串行输入/输出共阴极显示驱动芯片驱动的 8x8 点阵屏，可级联控制',
    macroPrefix: 'MATRIX',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'oled_style',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'DIN', offsetY: 54, type: 'GPIO' },
        { name: 'CS', offsetY: 72, type: 'GPIO' },
        { name: 'CLK', offsetY: 90, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: ['wayoda/LedControl'],
      includes: ['#include <LedControl.h>'],
      defines: [],
      globalInstantiation: 'LedControl lc=LedControl(PIN_{{MACRO_PREFIX}}_DIN, PIN_{{MACRO_PREFIX}}_CLK, PIN_{{MACRO_PREFIX}}_CS, 1);',
      setupCode: 'lc.shutdown(0,false); lc.setBrightness(0,8); lc.clearDisplay(0);',
      apiDocumentation: 'void setLed(int addr, int row, int col, boolean state); - 开启或关闭某一颗像素LED点\nvoid setRow(int addr, int row, byte value); - 设置一整行的亮灭状态值\nvoid clearDisplay(int addr); - 清除该级联屏上所有的LED像素亮灭状态'
    }
  },
  {
    id: 'comp_22',
    name: '5V 单路继电器模块',
    type: 'Digital',
    category: 'Actuator',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '弱电控制强电开关模块，常开/常闭触点，支持最大 250VAC/10A 或 30VDC/10A',
    macroPrefix: 'RELAY',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 45, type: 'GND' },
        { name: 'IN', offsetY: 72, type: 'GPIO' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: 'pinMode(PIN_{{MACRO_PREFIX}}, OUTPUT); digitalWrite(PIN_{{MACRO_PREFIX}}, LOW);',
      apiDocumentation: 'digitalWrite(PIN_{{MACRO_PREFIX}}, HIGH); - 吸合继电器，接通电路\ndigitalWrite(PIN_{{MACRO_PREFIX}}, LOW); - 断开继电器，切断电路'
    }
  },
  {
    id: 'comp_23',
    name: 'WS2812B 智能幻彩 RGB 灯条',
    type: 'Digital',
    category: 'Actuator',
    pinsUsed: 1,
    voltage: '5V',
    active: true,
    description: '内置控制芯片的串行可寻址单总线三色 LED 灯条',
    macroPrefix: 'LED_STRIP',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'sensor_style',
      pins: [
        { name: '5V', offsetY: 18, type: 'VCC' },
        { name: 'DIN', offsetY: 45, type: 'GPIO' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: ['adafruit/Adafruit NeoPixel'],
      includes: ['#include <Adafruit_NeoPixel.h>'],
      defines: ['#define LED_COUNT 10'],
      globalInstantiation: 'Adafruit_NeoPixel strip = Adafruit_NeoPixel(LED_COUNT, PIN_{{MACRO_PREFIX}}, NEO_GRB + NEO_KHZ800);',
      setupCode: 'strip.begin(); strip.show(); strip.setBrightness(50);',
      apiDocumentation: 'void setPixelColor(uint16_t n, uint32_t c); - 设置第 n 个LED的颜色（如 strip.Color(255,0,0)）\nvoid show(); - 刷新灯条颜色渲染\nvoid clear(); - 清空并关闭所有LED灯'
    }
  },
  {
    id: 'comp_24',
    name: 'L298N 双路直流电机驱动板',
    type: 'PWM',
    category: 'Actuator',
    pinsUsed: 6,
    voltage: 'Both',
    active: true,
    description: '双H桥电机驱动芯片，可同时驱动两个直流减速电机或一个步进电机',
    macroPrefix: 'MOTOR',
    cadLayout: {
      width: 160,
      height: 165,
      renderType: 'generic_board',
      pins: [
        { name: 'VS',  offsetY: 15,  type: 'VCC' },
        { name: 'VCC', offsetY: 30,  type: 'VCC' },
        { name: 'GND', offsetY: 45,  type: 'GND' },
        { name: 'IN1', offsetY: 60,  type: 'GPIO' },
        { name: 'IN2', offsetY: 75,  type: 'GPIO' },
        { name: 'IN3', offsetY: 90,  type: 'GPIO' },
        { name: 'IN4', offsetY: 105, type: 'GPIO' },
        { name: 'ENA', offsetY: 120, type: 'PWM' },
        { name: 'ENB', offsetY: 135, type: 'PWM' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: [],
      defines: [],
      globalInstantiation: '',
      setupCode: 'pinMode(PIN_{{MACRO_PREFIX}}_IN1, OUTPUT); pinMode(PIN_{{MACRO_PREFIX}}_IN2, OUTPUT); pinMode(PIN_{{MACRO_PREFIX}}_IN3, OUTPUT); pinMode(PIN_{{MACRO_PREFIX}}_IN4, OUTPUT); pinMode(PIN_{{MACRO_PREFIX}}_ENA, OUTPUT); pinMode(PIN_{{MACRO_PREFIX}}_ENB, OUTPUT);',
      apiDocumentation: '// 通道A正转: digitalWrite(PIN_MOTOR_IN1,HIGH); digitalWrite(PIN_MOTOR_IN2,LOW); analogWrite(PIN_MOTOR_ENA, speed);\n// 通道A反转: digitalWrite(PIN_MOTOR_IN1,LOW); digitalWrite(PIN_MOTOR_IN2,HIGH);\n// 通道B正转: digitalWrite(PIN_MOTOR_IN3,HIGH); digitalWrite(PIN_MOTOR_IN4,LOW); analogWrite(PIN_MOTOR_ENB, speed);\n// 通道B反转: digitalWrite(PIN_MOTOR_IN3,LOW); digitalWrite(PIN_MOTOR_IN4,HIGH);\n// 停止: analogWrite(PIN_MOTOR_ENA, 0); analogWrite(PIN_MOTOR_ENB, 0);'
    }
  },
  {
    id: 'comp_25',
    name: 'ULN2003 步进电机驱动模块',
    type: 'Digital',
    category: 'Actuator',
    pinsUsed: 4,
    voltage: '5V',
    active: true,
    description: '高耐压、大电流达林顿管阵列，配合 28BYJ-48 五线四相减速步进电机使用',
    macroPrefix: 'STEPPER',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'IN1', offsetY: 18, type: 'GPIO' },
        { name: 'IN2', offsetY: 36, type: 'GPIO' },
        { name: 'IN3', offsetY: 54, type: 'GPIO' },
        { name: 'IN4', offsetY: 72, type: 'GPIO' },
        { name: 'GND', offsetY: 90, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: ['#include <Stepper.h>'],
      defines: ['#define STEPS_PER_REV 2048'],
      globalInstantiation: 'Stepper myStepper(STEPS_PER_REV, PIN_{{MACRO_PREFIX}}_IN1, PIN_{{MACRO_PREFIX}}_IN3, PIN_{{MACRO_PREFIX}}_IN2, PIN_{{MACRO_PREFIX}}_IN4);',
      setupCode: 'myStepper.setSpeed(10);',
      apiDocumentation: 'void step(int steps); - 控制电机转动步数，正数为顺时针，负数为逆时针'
    }
  },
  {
    id: 'comp_26',
    name: 'NEO-6M GPS 定位模块',
    type: 'UART',
    category: 'Other',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '高性能 GPS 定位模组，配置陶瓷天线，串口输出标准 NMEA 语句',
    macroPrefix: 'GPS',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'RXD', offsetY: 36, type: 'UART_RX' },
        { name: 'TXD', offsetY: 54, type: 'UART_TX' },
        { name: 'GND', offsetY: 72, type: 'GND' }
      ]
    },
    drivers: {
      platformioLibs: ['mikalhart/TinyGPSPlus'],
      includes: ['#include <TinyGPSPlus.h>'],
      defines: [],
      globalInstantiation: 'TinyGPSPlus gps;',
      setupCode: '',
      apiDocumentation: 'double location.lat(); - 获取当前纬度坐标值\ndouble location.lng(); - 获取当前经度坐标值\nuint32_t satellites.value(); - 获取当前搜星连接数'
    }
  },
  {
    id: 'comp_27',
    name: 'HC-05 蓝牙串口透传模块',
    type: 'UART',
    category: 'Other',
    pinsUsed: 2,
    voltage: 'Both',
    active: true,
    description: '主从一体蓝牙串行总线透传模块，支持标准 SPP 协议与手机通信',
    macroPrefix: 'BT',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 36, type: 'GND' },
        { name: 'TX', offsetY: 54, type: 'UART_TX' },
        { name: 'RX', offsetY: 72, type: 'UART_RX' }
      ]
    },
    drivers: {
      platformioLibs: [],
      includes: ['#include <SoftwareSerial.h>'],
      defines: [],
      globalInstantiation: 'SoftwareSerial btSerial(PIN_{{MACRO_PREFIX}}_TX, PIN_{{MACRO_PREFIX}}_RX);',
      setupCode: 'btSerial.begin(9600);',
      apiDocumentation: 'int read(); - 读取手机发送的一个字符字节\nsize_t write(uint8_t c); - 向连接的蓝牙手机发送一个字节'
    }
  },
  {
    id: 'comp_28',
    name: 'nRF24L01 2.4G 无线通信模块',
    type: 'SPI',
    category: 'Other',
    pinsUsed: 5,
    voltage: '3.3V',
    active: true,
    description: '工作在 2.4GHz 全球通用 ISM 频段的单芯片无线收发器',
    macroPrefix: 'RF24',
    cadLayout: {
      width: 160,
      height: 90,
      renderType: 'generic_board',
      pins: [
        { name: 'VCC', offsetY: 18, type: 'VCC' },
        { name: 'GND', offsetY: 30, type: 'GND' },
        { name: 'CSN', offsetY: 42, type: 'GPIO' },
        { name: 'CE', offsetY: 54, type: 'GPIO' },
        { name: 'MOSI', offsetY: 66, type: 'SPI_MOSI' },
        { name: 'MISO', offsetY: 78, type: 'SPI_MISO' },
        { name: 'SCK', offsetY: 90, type: 'SPI_SCK' }
      ]
    },
    drivers: {
      platformioLibs: ['nrf24/RF24'],
      includes: ['#include <SPI.h>', '#include <nRF24L01.h>', '#include <RF24.h>'],
      defines: [],
      globalInstantiation: 'RF24 radio(PIN_{{MACRO_PREFIX}}_CE, PIN_{{MACRO_PREFIX}}_CSN);',
      setupCode: 'radio.begin(); radio.setPALevel(RF24_PA_LOW);',
      apiDocumentation: 'bool write(const void* buf, uint8_t len); - 无线发送指定数据包\nbool available(); - 检查是否有收到的无线数据包\nvoid read(void* buf, uint8_t len); - 读取无线接收到的数据包内容'
    }
  }
];
