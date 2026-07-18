import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LanguageProvider, useLanguage } from './lib/LanguageContext';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { RequirementInput } from './components/RequirementInput';
import { PromptOptimize } from './components/PromptOptimize';
import { TaskProgress } from './components/TaskProgress';
import { ProjectResults } from './components/ProjectResults';
import { CodeViewer } from './components/CodeViewer';
import { HistoryList } from './components/HistoryList';
import { DownloadCenter } from './components/DownloadCenter';
import { AdminPanel } from './components/AdminPanel';
import { ClassManagement } from './components/ClassManagement';
import { MyClasses } from './components/MyClasses';
import { IoTProject, FileEntry, GenerationStepLog, PinConnection } from './types';
import { api } from './lib/api';
import { LoginModal } from './components/LoginModal';
import JSZip from 'jszip';
import { Cpu, AlertCircle, LogIn, Sparkles, Sliders, Database, Binary, HelpCircle } from 'lucide-react';
import { syncFirmwarePins } from './lib/codeSync';
import { DEFAULT_MCUS, DEFAULT_COMPONENTS, MCU, ComponentItem } from './data/defaultHardware';

const ESP32_DEMO_PROJECT: IoTProject = {
  projectId: 'demo_greenhouse_sensation',
  userId: 'demo_user',
  name: '智能温室大棚自动化物联网系统',
  status: 'completed',
  rawInput: '我想做一款智能温室大棚检测系统，用ESP32控制板开发。挂载AHT20温湿度传感器和SGP30气体浓度传感器模块，在SSD1306液晶屏大屏幕上轮播数据。温湿度超标准或者有毒气体超标时，开启有源蜂鸣器警报，并通过WiFi发局域网通知。用标准USB电压供电。',
  optimizedPrompt: `【IOT SYSTEM ARCHITECTURE DESIGN】
Platform: ESP32
Sensors: AHT20 Temperature & Humidity, SGP30 Multi-pixel Gas Sensor
Display: OLED 128x64 SSD1306
Alerts: Active 5V Buzzer
Network: Local Wi-Fi (HTTP & UDP Broadcast notification)
Power: USB 5V (Standard Type-C interface)

【GPIO ASSIGNMENT RULES】
- I2C SDA: GPIO 21
- I2C SCL: GPIO 22
- Buzzer (GPIO Pin): GPIO 23
- Status LED: GPIO 2

【COMPILED OUTLINE TARGETS】
Provide optimized driver class integration for AHT20 and SGP30, auto layout rendering logic on SSD1306, with a safety buzz alarm.`,
  recommendedPlatform: 'ESP32',
  recommendedSensors: 'AHT20 温湿度传感器 + SGP30 气体变送器',
  recommendedDisplays: 'OLED 128x64 SSD1306',
  recommendedAlerts: '有源蜂鸣器',
  recommendedNetwork: '局部 Wi-Fi 通讯协议',
  recommendedPower: '标准 Type-C USB 5V',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  readmeText: `# 智能温室大棚自动化物联网系统 - 固件技术文档

本固件专为搭载 ESP32 处理芯片的智能农业大棚监测系统而编写，集成了温湿度高敏感知、有害TVOC气体标定、多设备 I2C 总线共用及自动数字蜂鸣警报等高级功能。

## 🛠️ 主控针脚引脚分配图 (CAD Wiring Pin Map)
- **OLED SSD1306 (I2C):** SDA → GPIO 21, SCL → GPIO 22
- **AHT20 温湿度 (I2C):** 共用 SDA → GPIO 21, SCL → GPIO 22
- **SGP30 气体检测 (I2C):** 共用 SDA → GPIO 21, SCL → GPIO 22
- **有源5V蜂鸣器 (Digital):** I/O 引脚 → GPIO 23
- **板载指示状态灯 (GPIO):** GPIO 2 (输出，低/高电平交替)

## 📦 主程序类驱动与依赖
编译之前请完成平台驱动依赖配置：
1. Adafruit_SSD1306
2. Adafruit_AHT20
3. Adafruit_SGP30`,
  codeFiles: JSON.stringify([
    {
      path: 'firmware/main.cpp',
      content: `#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHT20.h>
#include <Adafruit_SGP30.h>
#include "pins.h"

Adafruit_SSD1306 display(128, 64, &Wire, -1);
Adafruit_AHT20 aht;
Adafruit_SGP30 sgp;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  
  // 启动 I2C 总线
  Wire.begin(WIRE_SDA, WIRE_SCL);
  
  // 初始化 OLED 屏幕
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED 启动失败"));
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("System Booting...");
  display.display();

  // AHT20 传感器
  if (!aht.begin()) {
    Serial.println("AHT20 启动失败");
  }

  // SGP30 传感器
  if (!sgp.begin()){
    Serial.println("SGP30 启动失败");
  }
}

void loop() {
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  
  if (!sgp.IAQmeasure()) {
    Serial.println("SGP30 测量失败");
  }

  float t = temp.temperature;
  float h = humidity.relative_humidity;
  uint16_t co2 = sgp.TVOC; // 模拟等效浓度
  
  // Serial 输出
  Serial.printf("Temp: %.1f C, Hum: %.1f %%, TVOC: %d ppb\\n", t, h, co2);

  // 显示数据
  display.clearDisplay();
  display.setCursor(0,0);
  display.printf("Temp:  %.1f C\\n", t);
  display.printf("Humid: %.1f %%\\n", h);
  display.printf("Gas TVOC: %d ppb\\n", co2);
  
  // 安全限制检验与蜂鸣触发
  if (t > 38.0 || co2 > 500) {
    digitalWrite(PIN_BUZZER, HIGH);
    display.printf("\\n** ALARM ACTIVE! **");
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
  
  display.display();
  delay(1500);
}`
    },
    {
      path: 'firmware/pins.h',
      content: `#ifndef PINS_H
#define PINS_H

// --- 实时编译器自动配置 - ESP32 ARCHITECTURE ---
#define WIRE_SDA 21
#define WIRE_SCL 22

// --- 外设硬件引脚配置 ---
#define PIN_BUZZER 23
#define PIN_STATUS_LED 2

#endif // PINS_H`
    },
    {
      path: 'README.md',
      content: `# 智能温室自动控制系统
请导入 PlatformIO 库依赖后编译本工程。
通过标准 5V-C 口接入即可开启闭循环自动化警备。`
    }
  ]),
  diagramSvg: JSON.stringify([
    {
      fromPin: "GPIO23",
      toComponent: "有源蜂鸣器",
      toPin: "I/O",
      signalType: "GPIO",
      color: "#eab308",
      description: "蜂鸣器控制引脚"
    },
    {
      fromPin: "GND",
      toComponent: "有源蜂鸣器",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "蜂鸣器接地线"
    },
    {
      fromPin: "3V3",
      toComponent: "有源蜂鸣器",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "蜂鸣器电源线"
    },
    {
      fromPin: "GPIO21",
      toComponent: "OLED SSD1306液晶屏",
      toPin: "SDA",
      signalType: "I2C_SDA",
      color: "#2563eb",
      description: "OLED屏幕 I2C 数据线"
    },
    {
      fromPin: "GPIO22",
      toComponent: "OLED SSD1306液晶屏",
      toPin: "SCL",
      signalType: "I2C_SCL",
      color: "#059669",
      description: "OLED屏幕 I2C 时钟线"
    },
    {
      fromPin: "3V3",
      toComponent: "OLED SSD1306液晶屏",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "OLED屏幕电源线"
    },
    {
      fromPin: "GND",
      toComponent: "OLED SSD1306液晶屏",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "OLED屏幕接地线"
    },
    {
      fromPin: "GPIO21",
      toComponent: "AHT20温湿度传感器",
      toPin: "SDA",
      signalType: "I2C_SDA",
      color: "#2563eb",
      description: "AHT20 数据线"
    },
    {
      fromPin: "GPIO22",
      toComponent: "AHT20温湿度传感器",
      toPin: "SCL",
      signalType: "I2C_SCL",
      color: "#059669",
      description: "AHT20 时钟线"
    },
    {
      fromPin: "3V3",
      toComponent: "AHT20温湿度传感器",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "AHT20电源线"
    },
    {
      fromPin: "GND",
      toComponent: "AHT20温湿度传感器",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "AHT20接地线"
    }
  ])
};

const STM32_COMPETITION_DEMO_PROJECT: IoTProject = {
  projectId: 'demo_stm32_greenhouse_competition',
  userId: 'demo_user',
  name: 'STM32智能温室环境监测与报警系统',
  status: 'completed',
  rawInput: '我想做一个智能温室环境监测系统，用 STM32F103C8T6 控制板开发。系统需要采集温湿度和空气质量数据，在 OLED 屏上显示，当温度过高或空气质量异常时，通过蜂鸣器报警，并支持后续通过 ESP8266 模块扩展远程查看。',
  optimizedPrompt: `【物联网探究式学习课例】
课例名称：基于 STM32 的智能温室环境监测与报警系统
主控平台：STM32F103C8T6 Blue Pill
教学目标：完成需求分析、器件选型、虚拟接线、安全检测、代码理解和工程导出

【硬件结构】
- 主控：STM32F103C8T6
- 温湿度采集：DHT22 单总线传感器
- 气体/烟雾风险检测：MQ-2 传感器，A0 模拟量接入 ADC
- 本地显示：OLED SSD1306，I2C 通信
- 异常报警：有源蜂鸣器，GPIO 输出控制
- 联网拓展：ESP8266 WiFi 模块，USART 通信
- 供电：USB 5V 输入，STM32 逻辑电平 3.3V

【推荐引脚分配】
- DHT22 DATA -> PA0
- MQ-2 A0 -> PA1 (ADC)
- OLED SCL -> PB6
- OLED SDA -> PB7
- Buzzer I/O -> PB0
- ESP8266 TX -> PA3 (STM32 USART2_RX)
- ESP8266 RX -> PA2 (STM32 USART2_TX)

【安全检测重点】
- 所有模块必须共地
- MQ-2 与蜂鸣器为 5V 器件，信号接入 STM32 时注意电平与驱动能力
- 蜂鸣器建议使用三极管或驱动模块，避免 GPIO 直接承载过大电流
- OLED 使用 I2C，DHT22 使用单总线，MQ-2 使用 ADC，接口类型要区分清楚`,
  recommendedPlatform: 'STM32',
  recommendedSensors: 'DHT22 温湿度传感器 + MQ-2 气体/烟雾传感器',
  recommendedDisplays: 'OLED SSD1306 显示屏',
  recommendedAlerts: '有源蜂鸣器',
  recommendedNetwork: 'ESP8266 WiFi 模块拓展',
  recommendedPower: 'USB 5V 供电，STM32 3.3V 逻辑电平',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  readmeText: `# STM32智能温室环境监测与报警系统 - 课件工程说明

本课例面向《单片机接口技术》《嵌入式系统开发》和物联网入门课程，使用 STM32F103C8T6 作为主控，围绕温室环境监测任务组织学生完成需求分析、器件选型、虚拟接线、安全检测、代码理解和工程导出。

## 一、硬件连接建议

- **OLED SSD1306 (I2C)**：SCL -> PB6，SDA -> PB7，VCC -> 3V3，GND -> GND
- **DHT22 温湿度传感器**：DATA -> PA0，VCC -> 3V3，GND -> GND，DATA 建议上拉 10kΩ
- **MQ-2 气体/烟雾传感器**：A0 -> PA1，VCC -> 5V，GND -> GND
- **有源蜂鸣器**：I/O -> PB0，VCC -> 5V，GND -> GND
- **ESP8266 拓展模块**：TX -> PA3，RX -> PA2，VCC -> 3V3，GND -> GND

## 二、课堂安全提示

1. 所有模块必须共地，否则信号参考电平不一致。
2. MQ-2 模块和蜂鸣器常见工作电压为 5V，连接 STM32 信号线时需注意电平兼容和驱动能力。
3. 蜂鸣器建议通过三极管或驱动模块控制，避免 STM32 GPIO 直接承载过大电流。
4. OLED 使用 I2C 总线，DHT22 使用单总线，MQ-2 使用 ADC，学生需要区分不同接口类型。

## 三、代码探究重点

- GPIO 初始化：配置 DHT22、MQ-2、蜂鸣器和 ESP8266 拓展串口
- I2C 初始化：驱动 OLED 显示屏
- ADC 初始化：采集 MQ-2 模拟量
- 阈值判断：温度或气体值超过阈值时触发报警
- 工程导出：生成可在 Keil MDK 中继续完善和验证的工程文件`,
  codeFiles: JSON.stringify([
    {
      path: 'user/pins.h',
      language: 'c',
      content: `#ifndef __PINS_H
#define __PINS_H

#include "stm32f10x.h"

// OLED SSD1306 I2C pins
#define OLED_SCL_PORT        GPIOB
#define OLED_SCL_PIN         GPIO_Pin_6
#define OLED_SCL_CLK         RCC_APB2Periph_GPIOB
#define OLED_SDA_PORT        GPIOB
#define OLED_SDA_PIN         GPIO_Pin_7
#define OLED_SDA_CLK         RCC_APB2Periph_GPIOB

// DHT22 single-wire data pin
#define DHT22_PORT           GPIOA
#define DHT22_PIN            GPIO_Pin_0
#define DHT22_CLK            RCC_APB2Periph_GPIOA

// MQ-2 analog input pin
#define MQ2_ADC_PORT         GPIOA
#define MQ2_ADC_PIN          GPIO_Pin_1
#define MQ2_ADC_CLK          RCC_APB2Periph_GPIOA
#define MQ2_ADC_CHANNEL      ADC_Channel_1

// Active buzzer control pin
#define BUZZER_PORT          GPIOB
#define BUZZER_PIN           GPIO_Pin_0
#define BUZZER_CLK           RCC_APB2Periph_GPIOB

// ESP8266 USART2 extension
#define ESP8266_TX_PORT      GPIOA
#define ESP8266_TX_PIN       GPIO_Pin_2
#define ESP8266_RX_PORT      GPIOA
#define ESP8266_RX_PIN       GPIO_Pin_3
#define ESP8266_GPIO_CLK     RCC_APB2Periph_GPIOA

#define TEMP_THRESHOLD       38.0f
#define GAS_THRESHOLD        2200

#endif`
    },
    {
      path: 'user/main.c',
      language: 'c',
      content: `#include "stm32f10x.h"
#include "pins.h"

typedef struct {
  float temperature;
  float humidity;
} DHT22_Data;

static void GPIO_Configuration(void);
static void I2C_Configuration(void);
static void ADC_Configuration(void);
static void USART2_Configuration(void);
static DHT22_Data DHT22_ReadData(void);
static uint16_t MQ2_ReadValue(void);
static void OLED_ShowEnvironment(float temperature, float humidity, uint16_t gasValue, uint8_t alarm);
static void Buzzer_Set(uint8_t enabled);
static void Delay_ms(uint32_t ms);

int main(void)
{
  SystemInit();
  GPIO_Configuration();
  I2C_Configuration();
  ADC_Configuration();
  USART2_Configuration();

  while (1)
  {
    DHT22_Data env = DHT22_ReadData();
    uint16_t gasValue = MQ2_ReadValue();

    uint8_t alarm = (env.temperature > TEMP_THRESHOLD || gasValue > GAS_THRESHOLD);
    Buzzer_Set(alarm);
    OLED_ShowEnvironment(env.temperature, env.humidity, gasValue, alarm);

    Delay_ms(1000);
  }
}

static void GPIO_Configuration(void)
{
  GPIO_InitTypeDef GPIO_InitStructure;

  RCC_APB2PeriphClockCmd(
    DHT22_CLK |
    BUZZER_CLK |
    OLED_SCL_CLK |
    OLED_SDA_CLK |
    MQ2_ADC_CLK |
    ESP8266_GPIO_CLK |
    RCC_APB2Periph_AFIO,
    ENABLE
  );

  // 教学点 1：蜂鸣器是执行器，配置为推挽输出。
  GPIO_InitStructure.GPIO_Pin = BUZZER_PIN;
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
  GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
  GPIO_Init(BUZZER_PORT, &GPIO_InitStructure);
  GPIO_ResetBits(BUZZER_PORT, BUZZER_PIN);

  // 教学点 2：DHT22 为单总线传感器，空闲状态先作为输入。
  GPIO_InitStructure.GPIO_Pin = DHT22_PIN;
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING;
  GPIO_Init(DHT22_PORT, &GPIO_InitStructure);

  // 教学点 3：MQ-2 的 A0 输出进入 STM32 ADC 引脚。
  GPIO_InitStructure.GPIO_Pin = MQ2_ADC_PIN;
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AIN;
  GPIO_Init(MQ2_ADC_PORT, &GPIO_InitStructure);

  // 教学点 4：ESP8266 拓展模块使用 USART2，PA2 为 TX，PA3 为 RX。
  GPIO_InitStructure.GPIO_Pin = ESP8266_TX_PIN;
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;
  GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
  GPIO_Init(ESP8266_TX_PORT, &GPIO_InitStructure);

  GPIO_InitStructure.GPIO_Pin = ESP8266_RX_PIN;
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING;
  GPIO_Init(ESP8266_RX_PORT, &GPIO_InitStructure);
}

static void I2C_Configuration(void)
{
  I2C_InitTypeDef I2C_InitStructure;

  RCC_APB1PeriphClockCmd(RCC_APB1Periph_I2C1, ENABLE);

  // 教学说明：OLED 使用 I2C1，总线引脚对应 PB6(SCL) 与 PB7(SDA)。
  // 如果课堂使用软件 I2C，也可以保留相同 pins.h 定义，只替换底层驱动。
  I2C_DeInit(I2C1);
  I2C_InitStructure.I2C_Mode = I2C_Mode_I2C;
  I2C_InitStructure.I2C_DutyCycle = I2C_DutyCycle_2;
  I2C_InitStructure.I2C_OwnAddress1 = 0x30;
  I2C_InitStructure.I2C_Ack = I2C_Ack_Enable;
  I2C_InitStructure.I2C_AcknowledgedAddress = I2C_AcknowledgedAddress_7bit;
  I2C_InitStructure.I2C_ClockSpeed = 100000;
  I2C_Init(I2C1, &I2C_InitStructure);
  I2C_Cmd(I2C1, ENABLE);
}

static void ADC_Configuration(void)
{
  ADC_InitTypeDef ADC_InitStructure;

  RCC_APB2PeriphClockCmd(RCC_APB2Periph_ADC1, ENABLE);

  // 教学说明：MQ-2 的 A0 输出接 PA1，通过 ADC_Channel_1 读取模拟量。
  ADC_DeInit(ADC1);
  ADC_InitStructure.ADC_Mode = ADC_Mode_Independent;
  ADC_InitStructure.ADC_ScanConvMode = DISABLE;
  ADC_InitStructure.ADC_ContinuousConvMode = DISABLE;
  ADC_InitStructure.ADC_ExternalTrigConv = ADC_ExternalTrigConv_None;
  ADC_InitStructure.ADC_DataAlign = ADC_DataAlign_Right;
  ADC_InitStructure.ADC_NbrOfChannel = 1;
  ADC_Init(ADC1, &ADC_InitStructure);
  ADC_RegularChannelConfig(ADC1, MQ2_ADC_CHANNEL, 1, ADC_SampleTime_55Cycles5);

  ADC_Cmd(ADC1, ENABLE);
  ADC_ResetCalibration(ADC1);
  while (ADC_GetResetCalibrationStatus(ADC1));
  ADC_StartCalibration(ADC1);
  while (ADC_GetCalibrationStatus(ADC1));
}

static void USART2_Configuration(void)
{
  USART_InitTypeDef USART_InitStructure;

  RCC_APB1PeriphClockCmd(RCC_APB1Periph_USART2, ENABLE);

  // 教学说明：ESP8266 作为联网拓展模块，TX/RX 分别接 PA3/PA2。
  USART_InitStructure.USART_BaudRate = 115200;
  USART_InitStructure.USART_WordLength = USART_WordLength_8b;
  USART_InitStructure.USART_StopBits = USART_StopBits_1;
  USART_InitStructure.USART_Parity = USART_Parity_No;
  USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
  USART_InitStructure.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
  USART_Init(USART2, &USART_InitStructure);
  USART_Cmd(USART2, ENABLE);
}

static DHT22_Data DHT22_ReadData(void)
{
  // 教学说明：实际工程中由 DHT22 驱动完成起始信号、响应检测和 40bit 数据读取。
  // 这里保留模拟数据，便于课堂演示代码结构。
  DHT22_Data data;
  data.temperature = 36.5f;
  data.humidity = 72.0f;
  return data;
}

static uint16_t MQ2_ReadValue(void)
{
  ADC_SoftwareStartConvCmd(ADC1, ENABLE);
  while (ADC_GetFlagStatus(ADC1, ADC_FLAG_EOC) == RESET);
  return ADC_GetConversionValue(ADC1);
}

static void OLED_ShowEnvironment(float temperature, float humidity, uint16_t gasValue, uint8_t alarm)
{
  // 教学说明：此处对应 OLED 环境数据显示。
  // 可显示 Temp、Humidity、Gas 和 Alarm 状态。
  (void)temperature;
  (void)humidity;
  (void)gasValue;
  (void)alarm;
}

static void Buzzer_Set(uint8_t enabled)
{
  if (enabled)
  {
    GPIO_SetBits(BUZZER_PORT, BUZZER_PIN);
  }
  else
  {
    GPIO_ResetBits(BUZZER_PORT, BUZZER_PIN);
  }
}

static void Delay_ms(uint32_t ms)
{
  volatile uint32_t i;
  while (ms--)
  {
    for (i = 0; i < 7200; i++) { }
  }
}`
    },
    {
      path: 'README.md',
      language: 'markdown',
      content: `# STM32智能温室环境监测与报警系统

本工程为参赛课件演示用 STM32 主控示例，适用于 Keil MDK 或标准外设库工程继续完善。

## 学习任务

1. 识别 STM32、DHT22、MQ-2、OLED、蜂鸣器和 ESP8266 的角色。
2. 对照 CAD 接线图理解 pins.h 中的引脚定义。
3. 阅读 main.c，说明 GPIO 初始化、I2C 初始化、ADC 采集和阈值报警之间的关系。
4. 修改 TEMP_THRESHOLD 或 GAS_THRESHOLD，观察报警逻辑变化。

## 安全提示

- 所有模块必须共地。
- MQ-2 与蜂鸣器涉及 5V 工作电压，接入 STM32 时需注意电平兼容。
- 蜂鸣器建议通过三极管或驱动模块控制。`
    }
  ]),
  diagramSvg: JSON.stringify([
    {
      fromPin: "PB7",
      toComponent: "OLED SSD1306显示屏",
      toPin: "SDA",
      signalType: "I2C_SDA",
      color: "#2563eb",
      description: "OLED I2C 数据线"
    },
    {
      fromPin: "PB6",
      toComponent: "OLED SSD1306显示屏",
      toPin: "SCL",
      signalType: "I2C_SCL",
      color: "#059669",
      description: "OLED I2C 时钟线"
    },
    {
      fromPin: "3V3",
      toComponent: "OLED SSD1306显示屏",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "OLED 3.3V 供电"
    },
    {
      fromPin: "GND",
      toComponent: "OLED SSD1306显示屏",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "OLED 接地"
    },
    {
      fromPin: "PA0",
      toComponent: "DHT22 温湿度传感器",
      toPin: "DATA",
      signalType: "GPIO",
      color: "#f59e0b",
      description: "DHT22 单总线数据引脚"
    },
    {
      fromPin: "3V3",
      toComponent: "DHT22 温湿度传感器",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "DHT22 3.3V 供电"
    },
    {
      fromPin: "GND",
      toComponent: "DHT22 温湿度传感器",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "DHT22 接地"
    },
    {
      fromPin: "PA1",
      toComponent: "MQ-2 易燃气体传感器",
      toPin: "A0",
      signalType: "ADC",
      color: "#8b5cf6",
      description: "MQ-2 模拟量输出接入 ADC"
    },
    {
      fromPin: "5V",
      toComponent: "MQ-2 易燃气体传感器",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "MQ-2 5V 供电"
    },
    {
      fromPin: "GND",
      toComponent: "MQ-2 易燃气体传感器",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "MQ-2 接地"
    },
    {
      fromPin: "PB0",
      toComponent: "有源5V蜂鸣器",
      toPin: "I/O",
      signalType: "GPIO",
      color: "#eab308",
      description: "蜂鸣器报警控制引脚"
    },
    {
      fromPin: "5V",
      toComponent: "有源5V蜂鸣器",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "蜂鸣器 5V 供电"
    },
    {
      fromPin: "GND",
      toComponent: "有源5V蜂鸣器",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "蜂鸣器接地"
    },
    {
      fromPin: "PA3",
      toComponent: "ESP8266 WiFi拓展模块",
      toPin: "TX",
      signalType: "UART_RX",
      color: "#0ea5e9",
      description: "STM32 USART2_RX 接 ESP8266 TX"
    },
    {
      fromPin: "PA2",
      toComponent: "ESP8266 WiFi拓展模块",
      toPin: "RX",
      signalType: "UART_TX",
      color: "#06b6d4",
      description: "STM32 USART2_TX 接 ESP8266 RX"
    },
    {
      fromPin: "3V3",
      toComponent: "ESP8266 WiFi拓展模块",
      toPin: "VCC",
      signalType: "VCC",
      color: "#ef4444",
      description: "ESP8266 3.3V 供电"
    },
    {
      fromPin: "GND",
      toComponent: "ESP8266 WiFi拓展模块",
      toPin: "GND",
      signalType: "GND",
      color: "#1e293b",
      description: "ESP8266 接地"
    }
  ])
};

function Dashboard() {
  const { user, profile, signIn, showLoginModal, setShowLoginModal } = useAuth();
  const { t, lang } = useLanguage();
  const [currentTab, setCurrentTab] = useState<string>('input');
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const canViewTeacherFeedback = profile?.role === 'teacher' || isAdmin;
  const canManageClasses = canViewTeacherFeedback;
  const canViewMyClasses = profile?.role === 'user';
  const [preferredClassId, setPreferredClassId] = useState('');
  
  // Real active workspace generating targets
  const [activeProject, setActiveProject] = useState<IoTProject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<GenerationStepLog[]>([]);
  const [generationStatus, setGenerationStatus] = useState<'generating' | 'completed' | 'failed'>('completed');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [componentsList, setComponentsList] = useState<ComponentItem[]>(DEFAULT_COMPONENTS);
  const [mcusList, setMcusList] = useState<MCU[]>(DEFAULT_MCUS);

  useEffect(() => {
    const joinCode = new URLSearchParams(window.location.search).get('joinClass');
    if (!joinCode || !user || canViewTeacherFeedback) return;

    api.classroom.joinClass(joinCode)
      .then(result => {
        const classRoom = result.classRoom;
        if (result.status === 'pending') {
          alert(`已提交加入申请，等待班级管理员审批：${classRoom.name}`);
          return;
        }
        alert(`已加入班级：${classRoom.name}`);
      })
      .then(() => {
        setCurrentTab('myClasses');
      })
      .catch(err => {
        alert(err instanceof Error ? err.message : '加入班级失败。');
      })
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('joinClass');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      });
  }, [user, canViewTeacherFeedback]);

  useEffect(() => {
    async function loadPublicHardware() {
      try {
        const comps = await api.hardware.listComponents();
        if (comps && comps.length > 0) {
          setComponentsList(comps);
        }
      } catch (err) {
        console.warn("Failed to load public components from API, using defaults:", err);
      }
      try {
        const mcus = await api.hardware.listMcus();
        if (mcus && mcus.length > 0) {
          setMcusList(mcus);
        }
      } catch (err) {
        console.warn("Failed to load public MCUs from API, using defaults:", err);
      }
    }
    loadPublicHardware();
  }, [currentTab]);

  const loadDemoProject = () => {
    setActiveProject({
      ...STM32_COMPETITION_DEMO_PROJECT,
      updatedAt: new Date().toISOString()
    });
    setLogs([
      { timestamp: new Date().toLocaleTimeString(), message: lang === 'zh' ? '已加载 STM32 智能温室典型仿真实验。' : 'STM32 greenhouse simulation lab loaded.', status: 'success' },
      { timestamp: new Date().toLocaleTimeString(), message: lang === 'zh' ? '实验链路就绪：需求分析、虚拟接线、安全检测、代码理解。' : 'Simulation flow ready: requirements, wiring, safety check, and code reading.', status: 'success' }
    ]);
    setCurrentTab('preview');
  };

  const renderEmptyState = (tabTitle: string) => {
    return (
      <div className="max-w-xl mx-auto py-12 p-8 border border-dashed border-neutral-200 rounded-3xl bg-white text-center space-y-6 shadow-sm font-sans mt-8">
        <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto border border-neutral-150 text-neutral-800">
          <Cpu className="w-8 h-8 text-neutral-800 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-bold text-base text-neutral-900">
            {t('emptyStateTitle').replace('{tabTitle}', tabTitle)}
          </h3>
          <p className="text-neutral-500 text-xs leading-relaxed max-w-sm mx-auto">
            {t('emptyStateDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setCurrentTab('input')}
            className="p-3 bg-neutral-900 text-white rounded-xl text-xs font-bold transition hover:bg-neutral-800 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {t('emptyStateGoInput')}
          </button>
          <button
            onClick={loadDemoProject}
            className="p-3 border border-neutral-200 hover:border-neutral-800 text-neutral-700 hover:text-neutral-900 rounded-xl text-xs font-bold transition bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center gap-1.5"
          >
            {t('emptyStateLoadDemo')}
          </button>
        </div>
      </div>
    );
  };

  const addLog = (message: string, status: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timeString = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp: timeString, message, status }]);
  };

  const resolveProjectScenario = (project: IoTProject) => {
    if (project.projectId === STM32_COMPETITION_DEMO_PROJECT.projectId) {
      return 'STM32智能温室项目化学习课例';
    }
    return project.recommendedPlatform === 'ESP32' ? '物联网传感器大屏' : 'STM32嵌入式控制课例';
  };

  // Step 1: Prompt optimization logic
  const handleRequirementSubmit = async (rawInput: string, platform: 'ESP32' | 'STM32', provider: 'gemini' | 'deepseek', model?: string) => {
    setIsLoading(true);
    setLogs([]);
    try {
      addLog(`开始分析物联网系统意图 - 所选硬件: ${platform} [编译器: ${provider === 'gemini' ? 'Gemini 3.5' : model || 'DeepSeek V3'}]...`, 'info');
      
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput, platform, provider, model }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || '联接网络发生错误，无法提取特征方案。');
      }

      const result = await response.json();
      
      // Seed temporary outline project object
      const tempProject: IoTProject = {
        projectId: 'proj_' + Math.random().toString(36).substring(2, 11),
        userId: user?.uid || 'anonymous',
        name: result.projectName || '自主开发系统',
        status: 'draft',
        rawInput,
        optimizedPrompt: result.optimizedPrompt,
        recommendedPlatform: result.recommendedPlatform,
        recommendedSensors: result.recommendedSensors,
        recommendedDisplays: result.recommendedDisplays,
        recommendedAlerts: result.recommendedAlerts,
        recommendedNetwork: result.recommendedNetwork,
        recommendedPower: result.recommendedPower,
        selectedProvider: provider,
        selectedModel: model,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActiveProject(tempProject);
      setCurrentTab('optimize');
      setIsLoading(false);

    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : '提取方案故障');
      setIsLoading(false);
    }
  };

  // Step 2: Full schema & program firmware logic generation
  const handleStartGeneration = async () => {
    if (!activeProject) return;
    setCurrentTab('progress');
    setGenerationStatus('generating');
    setLogs([]);
    
    addLog("正在启动云端智能专家编译器...", "info");

    // Dynamic state simulation callbacks for realistic live updates
    const timers: NodeJS.Timeout[] = [];
    const scheduleLog = (msg: string, delay: number, stat: 'info' | 'success' | 'warn' = 'info') => {
      timers.push(setTimeout(() => addLog(msg, stat), delay));
    };

    scheduleLog("已锁定主板硬件总线架构描述符...", 1200, "success");
    scheduleLog("正在匹配外设引脚配置逻辑 (Pin allocation)...", 2800, "info");
    scheduleLog("正在生成电路原理线缆分配表(Connections map)...", 4500, "info");
    scheduleLog("开始编译 firmware/main.cpp 主程序库...", 6800, "info");
    scheduleLog("开始编译 config/pins.h 引脚固件...", 8500, "info");
    scheduleLog("正在生成配属依赖说明文档 README.md...", 11000, "info");
    scheduleLog("正在组装归档 ZIP 数据通道...", 13000, "info");

    try {
      const response = await fetch('/api/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizedPrompt: activeProject.optimizedPrompt,
          recommendedPlatform: activeProject.recommendedPlatform,
          recommendedSensors: activeProject.recommendedSensors,
          recommendedDisplays: activeProject.recommendedDisplays,
          recommendedAlerts: activeProject.recommendedAlerts,
          recommendedNetwork: activeProject.recommendedNetwork,
          recommendedPower: activeProject.recommendedPower,
          provider: activeProject.selectedProvider,
          model: activeProject.selectedModel,
        }),
      });

      // Clear layout logs timers
      timers.forEach(clearTimeout);

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || '生成方案断开连接。请确认 API Key 是否无误。');
      }

      const payload = await response.json();

      addLog("物理与程序包编译全部完成！成果组装成功。", "success");

      // Build updated completed project entity
      const finalProject: IoTProject = {
        ...activeProject,
        status: 'completed',
        name: payload.projectName || activeProject.name,
        // Scenario
        recommendedPlatform: activeProject.recommendedPlatform,
        recommendedSensors: activeProject.recommendedSensors,
        recommendedDisplays: activeProject.recommendedDisplays,
        recommendedAlerts: activeProject.recommendedAlerts,
        recommendedNetwork: activeProject.recommendedNetwork,
        recommendedPower: activeProject.recommendedPower,
        readmeText: payload.readmeText,
        codeFiles: JSON.stringify(payload.files),
        diagramSvg: JSON.stringify(payload.connections), 
        updatedAt: new Date().toISOString(),
      };

      // Save database record securely if user is authenticated (No mock placeholders!)
      if (user) {
        addLog("正在保存项目至本地数据库...", "info");
        try {
          await api.projects.save(finalProject);
          addLog("项目已成功保存至本地数据库。", "success");
        } catch (dbErr) {
          console.error("Local database write failed:", dbErr);
          addLog("保存失败，请检查网络连接或登录状态。", "warn");
        }
      } else {
        addLog("离线游客模式：项目已成功生成。建议上方登录以开启项目本地保存。", "warn");
      }

      setActiveProject(finalProject);
      setGenerationStatus('completed');
      
      // Auto toggle to final CAD layout preview screen
      setTimeout(() => {
        setCurrentTab('preview');
      }, 1500);

    } catch (err) {
      timers.forEach(clearTimeout);
      const msg = err instanceof Error ? err.message : '编译生成通道故障';
      setErrorMessage(msg);
      setGenerationStatus('failed');
      addLog(`生成阻断失败: ${msg}`, 'error');
    }
  };

  // ZIP packaging trigger using JSZip
  const handleDownloadZip = () => {
    if (!activeProject || !activeProject.codeFiles) return;
    try {
      const zip = new JSZip();
      const files: FileEntry[] = JSON.parse(activeProject.codeFiles);
      
      files.forEach(f => {
        zip.file(f.path, f.content);
      });

      zip.generateAsync({ type: 'blob' }).then((content) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${activeProject.name.replace(/\s+/g, '_')}_firmware_pack.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } catch(err) {
      console.error(err);
      alert('打包压缩包遭遇本地中断。');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans select-none antialiased">
      {/* Primary Top Navbar */}
      <TopNavbar />

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Sidebar 
          currentTab={currentTab} 
          onTabChange={setCurrentTab} 
          hasActiveProject={!!activeProject}
          isAdmin={isAdmin}
          canManageClasses={canManageClasses}
          canViewMyClasses={canViewMyClasses}
        />

        {/* Dynamic active workspace screen display */}
        <main className={`flex-1 p-8 overflow-y-auto w-full transition-all duration-200 ${
          currentTab === 'classroom' ? 'max-w-none' : 'max-w-6xl mx-auto'
        }`}>
          
          {currentTab === 'input' && (
            <RequirementInput 
              onSubmit={handleRequirementSubmit} 
              isLoading={isLoading} 
              onLoadDemo={loadDemoProject}
            />
          )}

          {currentTab === 'optimize' && (
            activeProject ? (
              <PromptOptimize
                originalInput={activeProject.rawInput}
                projectName={activeProject.name}
                optimizedPrompt={activeProject.optimizedPrompt}
                recommendedPlatform={activeProject.recommendedPlatform}
                recommendedSensors={activeProject.recommendedSensors}
                recommendedDisplays={activeProject.recommendedDisplays}
                recommendedAlerts={activeProject.recommendedAlerts}
                recommendedNetwork={activeProject.recommendedNetwork}
                recommendedPower={activeProject.recommendedPower}
                onModifyPrompt={(val) => setActiveProject({ ...activeProject, optimizedPrompt: val })}
                onStartGeneration={handleStartGeneration}
                isGenerating={generationStatus === 'generating'}
              />
            ) : renderEmptyState("提示词优化与方案确认")
          )}

          {currentTab === 'progress' && (
            activeProject ? (
              <TaskProgress
                projectName={activeProject.name}
                logs={logs}
                onRetry={handleStartGeneration}
                status={generationStatus}
                errorMessage={errorMessage}
              />
            ) : renderEmptyState("方案流生成进度")
          )}

          {currentTab === 'preview' && (
            activeProject ? (
              <ProjectResults
                key={activeProject.projectId}
                projectName={activeProject.name}
                scenario={resolveProjectScenario(activeProject)}
                platform={activeProject.recommendedPlatform}
                sensors={activeProject.recommendedSensors}
                displays={activeProject.recommendedDisplays}
                alerts={activeProject.recommendedAlerts}
                network={activeProject.recommendedNetwork}
                power={activeProject.recommendedPower}
                connections={activeProject.diagramSvg ? JSON.parse(activeProject.diagramSvg) : []}
                readmeText={activeProject.readmeText || ''}
                onDownloadZip={handleDownloadZip}
                onGoToCodeTab={() => setCurrentTab('code')}
                components={componentsList}
                onUpdateConnections={(newConns) => {
                  if (!activeProject) return;
                  const currentConns = activeProject.diagramSvg ? JSON.parse(activeProject.diagramSvg) : [];
                  const currentFiles = activeProject.codeFiles ? JSON.parse(activeProject.codeFiles) : [];
                  
                  // Run synchronous pin and documentation update across all firmware file entries
                  const updatedFiles = syncFirmwarePins(
                    currentFiles,
                    currentConns,
                    newConns,
                    activeProject.recommendedPlatform,
                    componentsList
                  );

                  const updatedProject: IoTProject = {
                    ...activeProject,
                    diagramSvg: JSON.stringify(newConns),
                    codeFiles: JSON.stringify(updatedFiles),
                    updatedAt: new Date().toISOString()
                  };

                  setActiveProject(updatedProject);

                  // Sync to Firestore without waiting to prevent input lag
                  if (user) {
                    api.projects.save(updatedProject).catch(err => {
                      console.error("Failed to persist updated tuning to local database:", err);
                    });
                  }
                }}
              />
            ) : renderEmptyState("物理接线面包拓扑预览")
          )}

          {currentTab === 'code' && (
            activeProject ? (
              <CodeViewer
                files={activeProject.codeFiles ? JSON.parse(activeProject.codeFiles) : []}
                onDownloadZip={handleDownloadZip}
              />
            ) : renderEmptyState("固件代码包预览")
          )}

          {currentTab === 'history' && (
            <HistoryList
              onSelectProject={(proj) => {
                setActiveProject(proj);
                setCurrentTab('preview');
              }}
            />
          )}

          {currentTab === 'download' && (
            <DownloadCenter
              project={activeProject}
              onDownloadZip={handleDownloadZip}
              onNavigateToTab={setCurrentTab}
              canViewTeacherFeedback={canViewTeacherFeedback}
              preferredClassId={preferredClassId}
            />
          )}

          {currentTab === 'myClasses' && canViewMyClasses && (
            <MyClasses
              onGoToLearning={(classId) => {
                setPreferredClassId(classId);
                setCurrentTab('download');
              }}
            />
          )}

          {currentTab === 'classroom' && canManageClasses && (
            <ClassManagement />
          )}

          {currentTab === 'admin' && isAdmin && (
            <AdminPanel />
          )}

        </main>
      </div>
      
      {/* Local Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Dashboard />
      </LanguageProvider>
    </AuthProvider>
  );
}
