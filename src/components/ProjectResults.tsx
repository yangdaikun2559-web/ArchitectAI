import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { CadDiagram } from './CadDiagram';
import { PinConnectionsTable } from './PinConnectionsTable';
import { BomList } from './BomList';
import { PinConnection, ComponentItem } from '../types';
import { CheckCircle2, Copy, Download, Code, ArrowRight, LayoutDashboard, X, BookOpen, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { componentWiki } from '../data/componentWiki';

interface ProjectResultsProps {
  projectName: string;
  scenario: string;
  platform: string;
  sensors: string;
  displays: string;
  alerts: string;
  network: string;
  power: string;
  connections: PinConnection[];
  readmeText: string;
  onDownloadZip: () => void;
  onGoToCodeTab: () => void;
  onUpdateConnections?: (newConnections: PinConnection[]) => void;
  components?: ComponentItem[];
}

const resolveWikiKey = (fullName: string | null, components?: ComponentItem[]): string => {
  if (!fullName) return '';
  const nameLower = fullName.toLowerCase();

  // 1. Try registry-based matching
  if (components && components.length > 0) {
    const regComp = components.find(c => {
      const cleanComp = fullName.toLowerCase();
      return (
        c.name.toLowerCase().includes(cleanComp) ||
        cleanComp.includes(c.name.toLowerCase()) ||
        (c.macroPrefix && cleanComp.includes(c.macroPrefix.toLowerCase()))
      );
    });

    if (regComp) {
      const id = regComp.id;
      const macro = (regComp.macroPrefix || '').toUpperCase().trim();

      if (id === 'comp_1' || macro === 'DHT') return 'dht22';
      if (id === 'comp_2' || macro === 'MQ2') return 'mq2';
      if (id === 'comp_3' || macro === 'OLED') return 'ssd1306';
      if (id === 'comp_4' || macro === 'LCD') return 'lcd1602';
      if (id === 'comp_5' || macro === 'SERVO') return 'sg90';
      if (id === 'comp_6' || macro === 'BUZZER') return 'buzzer';
      if (id === 'comp_7' || macro === 'MAX6675') return 'max6675';
      if (id === 'comp_8' || macro === 'ESP8266') return 'esp8266';
      if (id === 'comp_9' || macro === 'MAX30102') return 'max30102';
      if (id === 'comp_10' || macro === 'DS18B20') return 'ds18b20';
      if (id === 'comp_11' || macro === 'ULTRASONIC') return 'hcsr04';
      if (id === 'comp_12' || macro === 'MPU6050') return 'mpu6050';
      if (id === 'comp_13' || macro === 'BME280') return 'bme280';
      if (id === 'comp_14' || macro === 'BH1750') return 'bh1750';
      if (id === 'comp_15' || macro === 'PIR') return 'hcsr501';
      if (id === 'comp_16' || macro === 'SOIL') return 'yl69';
      if (id === 'comp_17' || macro === 'RC522') return 'mfrc522';
      if (id === 'comp_18' || macro === 'SGP30') return 'sgp30';
      if (id === 'comp_19' || macro === 'TFT') return 'st7735';
      if (id === 'comp_20' || macro === 'SEG') return 'tm1637';
      if (id === 'comp_21' || macro === 'MATRIX') return 'max7219';
      if (id === 'comp_22' || macro === 'RELAY') return 'relay';
      if (id === 'comp_23' || macro === 'LED_STRIP') return 'ws2812b';
      if (id === 'comp_24' || macro === 'MOTOR') return 'l298n';
      if (id === 'comp_25' || macro === 'STEPPER') return 'uln2003';
      if (id === 'comp_26' || macro === 'GPS') return 'neo6m';
      if (id === 'comp_27' || macro === 'BT') return 'hc05';
      if (id === 'comp_28' || macro === 'RF24') return 'nrf24l01';
    }
  }

  // 2. Fallback to name-based matching
  if (nameLower.includes('dht22') || nameLower.includes('am2302')) return 'dht22';
  if (nameLower.includes('dht11')) return 'dht11';
  if (nameLower.includes('aht20')) return 'aht20';
  if (nameLower.includes('sgp30')) return 'sgp30';
  if (nameLower.includes('mq-2') || nameLower.includes('mq2')) return 'mq2';
  if (nameLower.includes('ssd1306') || nameLower.includes('oled')) return 'ssd1306';
  if (nameLower.includes('1602') || nameLower.includes('lcd')) return 'lcd1602';
  if (nameLower.includes('sg90') || nameLower.includes('servo') || nameLower.includes('舵机')) return 'sg90';
  if (nameLower.includes('蜂鸣器') || nameLower.includes('buzzer')) return 'buzzer';
  if (nameLower.includes('光敏') || nameLower.includes('ldr') || nameLower.includes('photoresistor')) return 'ldr';
  if (nameLower.includes('max6675')) return 'max6675';
  if (nameLower.includes('esp8266') || nameLower.includes('esp-01s')) return 'esp8266';
  if (nameLower.includes('max30102')) return 'max30102';
  if (nameLower.includes('ds18b20')) return 'ds18b20';
  if (nameLower.includes('hc-sr04') || nameLower.includes('hcsr04')) return 'hcsr04';
  if (nameLower.includes('mpu6050')) return 'mpu6050';
  if (nameLower.includes('bme280')) return 'bme280';
  if (nameLower.includes('bh1750')) return 'bh1750';
  if (nameLower.includes('hc-sr501') || nameLower.includes('hcsr501')) return 'hcsr501';
  if (nameLower.includes('yl-69') || nameLower.includes('yl69')) return 'yl69';
  if (nameLower.includes('mfrc522')) return 'mfrc522';
  if (nameLower.includes('arduino') || nameLower.includes('nano')) return 'arduino';
  if (nameLower.includes('pico')) return 'pico';
  if (nameLower.includes('st7735') || nameLower.includes('tft')) return 'st7735';
  if (nameLower.includes('tm1637') || nameLower.includes('seg') || nameLower.includes('数码管')) return 'tm1637';
  if (nameLower.includes('max7219') || nameLower.includes('matrix') || nameLower.includes('点阵')) return 'max7219';
  if (nameLower.includes('relay') || nameLower.includes('继电器')) return 'relay';
  if (nameLower.includes('ws2812b') || nameLower.includes('led_strip') || nameLower.includes('灯条')) return 'ws2812b';
  if (nameLower.includes('l298n') || nameLower.includes('motor') || nameLower.includes('电机驱动')) return 'l298n';
  if (nameLower.includes('uln2003') || nameLower.includes('stepper') || nameLower.includes('步进电机')) return 'uln2003';
  if (nameLower.includes('neo-6m') || nameLower.includes('neo6m') || nameLower.includes('gps')) return 'neo6m';
  if (nameLower.includes('hc-05') || nameLower.includes('hc05') || nameLower.includes('bt') || nameLower.includes('蓝牙')) return 'hc05';
  if (nameLower.includes('nrf24l01') || nameLower.includes('rf24') || nameLower.includes('无线通信')) return 'nrf24l01';
  if (nameLower.includes('nodemcu')) return 'nodemcu';
  if (nameLower.includes('esp32')) return 'esp32';
  if (nameLower.includes('stm32')) return 'stm32';

  return '';
};

const renderComponentIllustration = (fullName: string | null, components?: ComponentItem[]) => {
  if (!fullName) return null;
  const key = resolveWikiKey(fullName, components);
  if (!key) return null;

  const gridPattern = (
    <defs>
      <pattern id="schematicGrid" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="0.5" fill="#0284c7" opacity="0.15"/>
      </pattern>
    </defs>
  );

  switch (key) {
    case 'dht22':
    case 'dht11':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['VCC', 'DATA', 'NC', 'GND'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U1</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">{key.toUpperCase()}</text>
        </svg>
      );
    case 'aht20':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['VDD', 'SDA', 'GND', 'SCL'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U2</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">AHT20</text>
        </svg>
      );
    case 'mq2':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[32, 47, 62, 77, 92].map((y, i) => {
            const labels = ['VCC', 'GND', 'D0', 'A0', 'NC'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U3</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MQ-2 SENSOR</text>
        </svg>
      );
    case 'sgp30':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['VDD', 'GND', 'SCL', 'SDA'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U4</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">SGP30</text>
        </svg>
      );
    case 'ssd1306':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="65" y="25" width="70" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['GND', 'VCC', 'SCL', 'SDA'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="65" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="40" cy={y} r="1.5" fill="#0284c7"/>
                <text x="70" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="59" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS1</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">OLED SSD1306</text>
        </svg>
      );
    case 'lcd1602':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="60" y="25" width="80" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['GND', 'VCC', 'SDA', 'SCL'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="35" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="35" cy={y} r="1.5" fill="#0284c7"/>
                <text x="65" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="54" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS2</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LCD1602 I2C</text>
        </svg>
      );
    case 'sg90':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="75" y="30" width="55" height="60" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Motor symbol circle */}
          <circle cx="102" cy="60" r="14" stroke="#0f172a" strokeWidth="1" strokeDasharray="2,2"/>
          <text x="102" y="63" fill="#0f172a" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">M</text>
          
          {/* Pins */}
          {[45, 60, 75].map((y, i) => {
            const labels = ['PWM', 'VCC', 'GND'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="50" y1={y} x2="75" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="50" cy={y} r="1.5" fill="#0284c7"/>
                <text x="80" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="69" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* Designator Labels */}
          <text x="102" y="22" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">M1</text>
          <text x="102" y="105" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">SERVO MOTOR</text>
        </svg>
      );
    case 'buzzer':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Standard schematic symbol for Piezo Buzzer */}
          <line x1="50" y1="50" x2="80" y2="50" stroke="#0284c7" strokeWidth="1.2"/>
          <line x1="50" y1="70" x2="80" y2="70" stroke="#0284c7" strokeWidth="1.2"/>
          <circle cx="50" cy="50" r="1.5" fill="#0284c7"/>
          <circle cx="50" cy="70" r="1.5" fill="#0284c7"/>
          
          <line x1="80" y1="50" x2="105" y2="50" stroke="#0f172a" strokeWidth="1.5"/>
          <line x1="80" y1="70" x2="105" y2="70" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Plate */}
          <rect x="105" y="35" width="4" height="50" fill="#0f172a" stroke="#0f172a" strokeWidth="0.5"/>
          <rect x="112" y="42" width="3" height="36" fill="#ffffff" stroke="#0f172a" strokeWidth="1"/>
          
          {/* Funnel horn shape */}
          <path d="M 115,42 L 135,22 L 135,98 L 115,78 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Labels & Pins */}
          <text x="72" y="46" fontSize="4.5" fill="#ef4444" fontFamily="monospace">1</text>
          <text x="72" y="66" fontSize="4.5" fill="#ef4444" fontFamily="monospace">2</text>
          <text x="70" y="40" fontSize="7.5" fill="#ef4444" fontWeight="bold">+</text>
          
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LS1</text>
          <text x="100" y="108" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ACTIVE BUZZER</text>
        </svg>
      );
    case 'max6675':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 45, 60, 75, 90].map((y, i) => {
            const labels = ['VCC', 'GND', 'SCK', 'CS', 'SO'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U5</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MAX6675</text>
        </svg>
      );
    case 'esp8266':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="65" y="15" width="70" height="90" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[25, 38, 51, 64, 77, 90].map((y, i) => {
            const labels = ['VCC', 'GND', 'TXD', 'RXD', 'CH_PD', 'RST'];
            const pinNums = ['1', '2', '3', '4', '5', '6'];
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="65" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="40" cy={y} r="1.5" fill="#0284c7"/>
                <text x="70" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="59" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="11" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U6</text>
          <text x="100" y="113" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ESP-01S</text>
        </svg>
      );
    case 'max30102':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[32, 47, 62, 77, 92].map((y, i) => {
            const labels = ['VIN', 'GND', 'SCL', 'SDA', 'INT'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U7</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MAX30102</text>
        </svg>
      );
    case 'ds18b20':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="75" y="25" width="50" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 60, 80].map((y, i) => {
            const labels = ['VCC', 'DATA', 'GND'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="50" y1={y} x2="75" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="50" cy={y} r="1.5" fill="#0284c7"/>
                <text x="80" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="69" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U8</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS18B20</text>
        </svg>
      );
    case 'hcsr04':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['VCC', 'TRIG', 'ECHO', 'GND'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U9</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">HC-SR04</text>
        </svg>
      );
    case 'mpu6050':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="65" y="10" width="70" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[18, 30, 42, 54, 66, 78, 90, 102].map((y, i) => {
            const labels = ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'];
            const pinNums = ['1', '2', '3', '4', '5', '6', '7', '8'];
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="65" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="40" cy={y} r="1.5" fill="#0284c7"/>
                <text x="70" y={y + 2} fontSize="5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="59" y={y - 2.5} fontSize="4" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U10</text>
          <text x="100" y="115" fill="#64748b" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MPU6050</text>
        </svg>
      );
    case 'bme280':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const labels = ['VCC', 'GND', 'SCL', 'SDA', 'CSB', 'SDO'];
            const pinNums = ['1', '2', '3', '4', '5', '6'];
            const actualY = 24 + i * 14;
            return (
              <g key={i}>
                <line x1="45" y1={actualY} x2="70" y2={actualY} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={actualY} r="1.5" fill="#0284c7"/>
                <text x="75" y={actualY + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={actualY - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U11</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">BME280</text>
        </svg>
      );
    case 'bh1750':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[32, 47, 62, 77, 92].map((y, i) => {
            const labels = ['VCC', 'GND', 'SCL', 'SDA', 'ADDR'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U12</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">BH1750</text>
        </svg>
      );
    case 'hcsr501':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="75" y="25" width="50" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 60, 80].map((y, i) => {
            const labels = ['VCC', 'OUT', 'GND'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="50" y1={y} x2="75" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="50" cy={y} r="1.5" fill="#0284c7"/>
                <text x="80" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="69" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U13</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">HC-SR501</text>
        </svg>
      );
    case 'yl69':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 55, 70, 85].map((y, i) => {
            const labels = ['VCC', 'GND', 'A0', 'D0'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U14</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">YL-69</text>
        </svg>
      );
    case 'mfrc522':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="65" y="15" width="70" height="90" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 34, 46, 58, 70, 82, 94].map((y, i) => {
            const labels = ['3.3V', 'RST', 'GND', 'MISO', 'MOSI', 'SCK', 'SDA'];
            const pinNums = ['1', '2', '3', '4', '5', '6', '7'];
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="65" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="40" cy={y} r="1.5" fill="#0284c7"/>
                <text x="70" y={y + 2} fontSize="5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="59" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="11" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U15</text>
          <text x="100" y="113" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MFRC522</text>
        </svg>
      );
    case 'arduino':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 38, 54, 70, 86].map((y, i) => {
            const pinNames = ['5V', '3V3', 'GND', 'VIN', 'RST'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="5.5" fill="#475569" fontFamily="monospace">{pinNames[i]}</text>
              </g>
            );
          })}
          {[22, 38, 54, 70, 86].map((y, i) => {
            const pinNames = ['A4', 'A5', 'D2', 'D3', 'D4'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="5.5" fill="#475569" fontFamily="monospace" textAnchor="end">{pinNames[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U_MCU3</text>
          <text x="100" y="55" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ARDUINO</text>
          <text x="100" y="65" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">NANO V3.0</text>
        </svg>
      );
    case 'pico':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 34, 46, 58, 70, 82, 94].map((y, i) => {
            const pinNames = ['3V3', 'GND', 'VSYS', 'VBUS', 'GP4', 'GP5', 'GP0'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace">{pinNames[i]}</text>
              </g>
            );
          })}
          {[22, 34, 46, 58, 70, 82, 94].map((y, i) => {
            const pinNames = ['GP1', 'GP2', 'GP3', 'GP6', 'GP7', 'GP8', 'GP9'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace" textAnchor="end">{pinNames[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U_MCU4</text>
          <text x="100" y="55" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">RPI PICO</text>
          <text x="100" y="65" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">PICO W</text>
        </svg>
      );
    case 'st7735':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="15" width="60" height="90" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[24, 35, 46, 57, 68, 79, 90].map((y, i) => {
            const labels = ['VCC', 'GND', 'CS', 'RST', 'DC', 'MOSI', 'SCK'];
            const pinNums = ['1', '2', '3', '4', '5', '6', '7'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="11" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS3</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ST7735 TFT</text>
        </svg>
      );
    case 'tm1637':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 47, 64, 81].map((y, i) => {
            const labels = ['GND', 'VCC', 'DIO', 'CLK'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS4</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">TM1637</text>
        </svg>
      );
    case 'max7219':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 44, 58, 72, 86].map((y, i) => {
            const labels = ['VCC', 'GND', 'DIN', 'CS', 'CLK'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DS5</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">MAX7219</text>
        </svg>
      );
    case 'relay':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="75" y="25" width="50" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 60, 80].map((y, i) => {
            const labels = ['VCC', 'GND', 'IN'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="50" y1={y} x2="75" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="50" cy={y} r="1.5" fill="#0284c7"/>
                <text x="80" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="69" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">K1</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">5V RELAY</text>
        </svg>
      );
    case 'ws2812b':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="75" y="25" width="50" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[40, 60, 80].map((y, i) => {
            const labels = ['5V', 'DIN', 'GND'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="50" y1={y} x2="75" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="50" cy={y} r="1.5" fill="#0284c7"/>
                <text x="80" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="69" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LED1</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">WS2812B</text>
        </svg>
      );
    case 'l298n':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 125" fill="none">
          {gridPattern}
          <rect width="200" height="125" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="125" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="105" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[18, 30, 42, 54, 66, 78, 90, 102].map((y, i) => {
            const labels = ['VS', 'VCC', 'GND', 'IN1', 'IN2', 'IN3', 'IN4', 'GND'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="4.5" fill="#475569" fontFamily="monospace">{labels[i]}</text>
              </g>
            );
          })}
          {[40, 80].map((y, i) => {
            const labels = ['ENA', 'ENB'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="4.5" fill="#475569" fontFamily="monospace" textAnchor="end">{labels[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U16</text>
          <text x="100" y="60" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">L298N</text>
        </svg>
      );
    case 'uln2003':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 45, 60, 75, 90].map((y, i) => {
            const labels = ['IN1', 'IN2', 'IN3', 'IN4', 'GND'];
            const pinNums = ['1', '2', '3', '4', '5'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U17</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ULN2003</text>
        </svg>
      );
    case 'neo6m':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 50, 70, 90].map((y, i) => {
            const labels = ['VCC', 'RX', 'TX', 'GND'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U18</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">NEO-6M</text>
        </svg>
      );
    case 'hc05':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="70" y="20" width="60" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[30, 50, 70, 90].map((y, i) => {
            const labels = ['VCC', 'GND', 'TX', 'RX'];
            const pinNums = ['1', '2', '3', '4'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="15" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U19</text>
          <text x="100" y="112" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">HC-05</text>
        </svg>
      );
    case 'nrf24l01':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="65" y="15" width="70" height="90" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 34, 46, 58, 70, 82, 94].map((y, i) => {
            const labels = ['VCC', 'GND', 'CSN', 'CE', 'MOSI', 'MISO', 'SCK'];
            const pinNums = ['1', '2', '3', '4', '5', '6', '7'];
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="65" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="40" cy={y} r="1.5" fill="#0284c7"/>
                <text x="70" y={y + 2} fontSize="5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="59" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          <text x="100" y="11" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U20</text>
          <text x="100" y="113" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">nRF24L01</text>
        </svg>
      );
    case 'nodemcu':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[20, 32, 44, 56, 68, 80, 92, 104].map((y, i) => {
            const pinNames = ['3V3', 'GND', 'TX', 'RX', 'D0', 'D1', 'D2', 'D3'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="4.5" fill="#475569" fontFamily="monospace">{pinNames[i]}</text>
              </g>
            );
          })}
          {[20, 32, 44, 56, 68, 80, 92, 104].map((y, i) => {
            const pinNames = ['D4', 'D5', 'D6', 'D7', 'D8', 'RX2', 'TX2', '5V'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="4.5" fill="#475569" fontFamily="monospace" textAnchor="end">{pinNames[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U_MCU5</text>
          <text x="100" y="55" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">NodeMCU</text>
          <text x="100" y="65" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">ESP8266 V3</text>
        </svg>
      );
    case 'esp32':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 34, 46, 58, 70, 82, 94, 106].map((y, i) => {
            const pinNames = ['3V3', 'EN', 'IO36', 'IO39', 'IO34', 'IO35', 'IO32', 'IO33'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace">{pinNames[i]}</text>
              </g>
            );
          })}
          {[22, 34, 46, 58, 70, 82, 94, 106].map((y, i) => {
            const pinNames = ['GND', 'IO23', 'IO22', 'TXD0', 'RXD0', 'IO21', 'IO19', 'IO18'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace" textAnchor="end">{pinNames[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U_MCU1</text>
          <text x="100" y="55" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ESP32</text>
          <text x="100" y="65" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">WROOM-32E</text>
        </svg>
      );
    case 'stm32':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          <rect x="60" y="10" width="80" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          {[22, 34, 46, 58, 70, 82, 94, 106].map((y, i) => {
            const pinNames = ['3V3', 'GND', 'PB12', 'PB13', 'PB14', 'PB15', 'PA8', 'PA9'];
            return (
              <g key={`l-${i}`}>
                <line x1="45" y1={y} x2="60" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="45" cy={y} r="1.2" fill="#0284c7"/>
                <text x="63" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace">{pinNames[i]}</text>
              </g>
            );
          })}
          {[22, 34, 46, 58, 70, 82, 94, 106].map((y, i) => {
            const pinNames = ['5V', 'PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6'];
            return (
              <g key={`r-${i}`}>
                <line x1="140" y1={y} x2="155" y2={y} stroke="#0284c7" strokeWidth="1"/>
                <circle cx="155" cy={y} r="1.2" fill="#0284c7"/>
                <text x="137" y={y + 1.8} fontSize="5" fill="#475569" fontFamily="monospace" textAnchor="end">{pinNames[i]}</text>
              </g>
            );
          })}
          <text x="100" y="8" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">U_MCU2</text>
          <text x="100" y="55" fill="#0f172a" fontSize="7" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">STM32</text>
          <text x="100" y="65" fill="#64748b" fontSize="5.5" fontFamily="monospace" textAnchor="middle">BLUE PILL</text>
        </svg>
      );
    case 'ldr':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 120" fill="none">
          {gridPattern}
          <rect width="200" height="120" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
          <rect width="200" height="120" rx="8" fill="url(#schematicGrid)"/>
          
          {/* Schematic box */}
          <rect x="70" y="25" width="60" height="70" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5"/>
          
          {/* Pins */}
          {[40, 55, 70].map((y, i) => {
            const labels = ['VCC', 'GND', 'OUT'];
            const pinNums = ['1', '2', '3'];
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="70" y2={y} stroke="#0284c7" strokeWidth="1.2"/>
                <circle cx="45" cy={y} r="1.5" fill="#0284c7"/>
                <text x="75" y={y + 2} fontSize="5.5" fill="#4b5563" fontFamily="monospace">{labels[i]}</text>
                <text x="64" y={y - 2.5} fontSize="4.5" fill="#ef4444" fontFamily="monospace">{pinNums[i]}</text>
              </g>
            );
          })}
          
          {/* LDR Symbol Drawing inside the schematic box */}
          <circle cx="100" cy="60" r="12" fill="none" stroke="#0f172a" strokeWidth="1.2"/>
          {/* Resistor body inside circle */}
          <rect x="91" y="55" width="18" height="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1"/>
          {/* Two arrows for light */}
          <line x1="86" y1="43" x2="94" y2="51" stroke="#0f172a" strokeWidth="1" />
          <polygon points="94,51 93,47 90,50" fill="#0f172a"/>
          
          <line x1="91" y1="40" x2="99" y2="48" stroke="#0f172a" strokeWidth="1" />
          <polygon points="99,48 98,44 95,47" fill="#0f172a"/>

          {/* Designator Labels */}
          <text x="100" y="20" fill="#0f172a" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">R_LDR1</text>
          <text x="100" y="106" fill="#64748b" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">LDR SENSOR</text>
        </svg>
      );
  }
  return null;
};

export const ProjectResults: React.FC<ProjectResultsProps> = ({
  projectName,
  scenario,
  platform,
  sensors,
  displays,
  alerts,
  network,
  power,
  connections = [],
  readmeText,
  onDownloadZip,
  onGoToCodeTab,
  onUpdateConnections,
  components,
}) => {
  const { lang, t } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'power' | 'data'>('all');
  const [selectedWikiComp, setSelectedWikiComp] = useState<string | null>(null);

  // Esc key listener to close wiki drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedWikiComp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getWikiEntry = (fullName: string | null) => {
    const key = resolveWikiKey(fullName, components);
    if (key) {
      return componentWiki[key];
    }
    return null;
  };

  const wikiEntry = getWikiEntry(selectedWikiComp);
  const [originalConnections] = useState<PinConnection[]>(() => connections);

  const handleCopyScheme = () => {
    const summary = `
     Project Name: ${projectName}
     Scenario: ${scenario}
     MCU Platform: ${platform}
     Sensors: ${sensors}
     Displays: ${displays}
     Alerts: ${alerts}
     Network: ${network}
     Power: ${power}
    `;
    navigator.clipboard.writeText(summary);
    alert(t('copysuccess'));
  };

  return (
    <div className="space-y-6">
      {/* Title Completed block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-5 gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('buildSuccess')}</h2>
              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-mono font-bold tracking-wide border border-emerald-200 uppercase px-2 py-0.5 rounded">
                {lang === 'zh' ? '已完成' : 'COMPLETED'}
              </span>
            </div>
            <p className="text-neutral-500 text-xs mt-1">
              {lang === 'zh' ? `项目名: ${projectName} • 应用场景: ${scenario} • 系统版本 v1.0.0` : `Project: ${projectName} • Scenario: ${scenario} • Version v1.0.0`}
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={handleCopyScheme}
            className="p-2 px-3 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-800 rounded-xl transition flex items-center gap-1.5 font-bold"
          >
            <Copy className="w-4 h-4" />
            {t('copyBtn')}
          </button>
          
          <button 
            onClick={onDownloadZip}
            className="p-2 px-3 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-800 rounded-xl transition flex items-center gap-1.5 font-bold"
          >
            <Download className="w-4 h-4" />
            {t('downloadBtn')}
          </button>

          <button 
            onClick={onGoToCodeTab}
            className="p-2.5 px-4 bg-neutral-900 text-white rounded-xl shadow-md hover:bg-neutral-800 transition flex items-center gap-1.5 font-bold"
          >
            <Code className="w-4 h-4" />
            {t('viewCodeBtn')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Overview, Right CAD Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Scheme Block Card */}
        <div className="border border-neutral-200/50 rounded-2xl bg-white p-5 shadow-sm space-y-5 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-50">
            <LayoutDashboard className="w-4 h-4 text-neutral-900" />
            <h4 className="font-display font-semibold text-xs text-neutral-900 uppercase">{t('schemeTable')}</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertyMcu')}</span>
              <p className="text-xs font-semibold text-neutral-850">{platform}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertySensor')}</span>
              <p className="text-xs font-semibold text-neutral-850">{sensors || "无"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertyDisplay')}</span>
              <p className="text-xs font-semibold text-neutral-850">{displays || "无"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertyAlert')}</span>
              <p className="text-xs font-semibold text-neutral-850">{alerts || "无"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertyNetwork')}</span>
              <p className="text-xs font-semibold text-neutral-850">{network}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">{t('propertyPower')}</span>
              <p className="text-xs font-semibold text-neutral-850">{power}</p>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-[10px] leading-normal text-neutral-500 font-medium font-sans">
            {lang === 'zh' 
              ? '提示：您可以前往左下方的【历史生成项目】查阅此方案。方案已上传至云数据库安全通道，可长期保存并在后续控制台复原。' 
              : 'Tip: You can visit the "History Projects" panel to review this scheme. It is securely saved in the cloud.'}
          </div>
        </div>

        {/* Right CAD Scheme block */}
        <div className="lg:col-span-2">
          <CadDiagram 
            platform={platform} 
            connections={connections} 
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            lockedIndex={lockedIndex}
            setLockedIndex={setLockedIndex}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            components={components}
            onSelectComponent={setSelectedWikiComp}
          />
        </div>
      </div>

      {/* Pin Connection table component placed below */}
      <PinConnectionsTable
        connections={connections}
        hoveredIndex={hoveredIndex}
        setHoveredIndex={setHoveredIndex}
        lockedIndex={lockedIndex}
        setLockedIndex={setLockedIndex}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        onUpdateConnections={onUpdateConnections}
        originalConnections={originalConnections}
        platform={platform}
        onSelectComponent={setSelectedWikiComp}
      />

      {/* Bill of Materials (BOM) Component */}
      <BomList
        platform={platform}
        connections={connections}
        components={components}
        onSelectComponent={setSelectedWikiComp}
      />

      <AnimatePresence>
        {selectedWikiComp && wikiEntry && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWikiComp(null)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 cursor-pointer"
            />

            {/* Wiki Drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[450px] bg-white border-l border-neutral-100 shadow-2xl z-50 flex flex-col font-sans select-none overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-neutral-900 leading-tight">
                      {lang === 'zh' ? '元器件百科科普' : 'Component Encyclopedia'}
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                      {lang === 'zh' ? wikiEntry.categoryZh : wikiEntry.categoryEn} • WIKI REFERENCE
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedWikiComp(null)}
                  className="p-1.5 hover:bg-neutral-150 text-neutral-400 hover:text-neutral-950 rounded-xl transition cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Component Illustration */}
                <div className="w-full h-48 flex items-center justify-center bg-neutral-50 rounded-2xl border border-neutral-100 p-2 overflow-hidden shadow-2xs">
                  {renderComponentIllustration(selectedWikiComp, components)}
                </div>

                {/* Component Name Header */}
                <div className="space-y-1">
                  <h4 className="font-display font-black text-xl text-neutral-900 tracking-tight">
                    {lang === 'zh' ? wikiEntry.nameZh : wikiEntry.nameEn}
                  </h4>
                  <div className="w-12 h-1 bg-yellow-500 rounded-full" />
                </div>

                {/* Working Principle */}
                <div className="space-y-2">
                  <h5 className="font-display font-extrabold text-xs text-neutral-900 uppercase tracking-wide">
                    💡 {lang === 'zh' ? '科学工作原理' : 'Working Principle'}
                  </h5>
                  <p className="text-neutral-600 text-xs leading-relaxed font-sans font-medium text-justify">
                    {lang === 'zh' ? wikiEntry.principleZh : wikiEntry.principleEn}
                  </p>
                </div>

                {/* Pin Functions */}
                {wikiEntry.pinFunctions && wikiEntry.pinFunctions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-display font-extrabold text-xs text-neutral-900 uppercase tracking-wide">
                      🔌 {lang === 'zh' ? '物理引脚定义' : 'Physical Pinout'}
                    </h5>
                    <div className="border border-neutral-150 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50/80 border-b border-neutral-150 text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest">
                            <th className="py-2.5 px-3.5 w-1/3">{lang === 'zh' ? '引脚名称' : 'Pin Name'}</th>
                            <th className="py-2.5 px-3.5">{lang === 'zh' ? '功能描述' : 'Function'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-[11px] font-medium font-sans">
                          {wikiEntry.pinFunctions.map((pinInfo, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-700 bg-indigo-50/30">
                                {pinInfo.pin}
                              </td>
                              <td className="py-2.5 px-3.5 text-neutral-600 leading-normal">
                                {lang === 'zh' ? pinInfo.descZh : pinInfo.descEn}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Voltage & Safety Warning */}
                {wikiEntry.voltageWarningZh && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-150 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-xs select-none">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{lang === 'zh' ? '电气安全与兼容规范' : 'Electrical Safety & Spec'}</span>
                    </div>
                    <p className="text-amber-900/80 text-[11px] font-semibold leading-relaxed">
                      {lang === 'zh' ? wikiEntry.voltageWarningZh : wikiEntry.voltageWarningEn}
                    </p>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-center">
                <p className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">
                  © 2026 TEACHER DIGITAL LITERACY ACTIVITY
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
