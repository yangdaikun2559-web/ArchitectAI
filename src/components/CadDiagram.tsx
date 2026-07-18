import React, { useState } from 'react';
import { PinConnection, ComponentItem } from '../types';
import { ZoomIn, ZoomOut, Download, Sliders, CheckCircle2, Zap, Eye, Maximize2, Minimize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_COMPONENTS } from '../data/defaultHardware';

interface CadDiagramProps {
  platform: string;
  connections: PinConnection[];
  hoveredIndex?: number | null;
  setHoveredIndex?: (idx: number | null) => void;
  lockedIndex?: number | null;
  setLockedIndex?: (idx: number | null) => void;
  selectedFilter?: 'all' | 'power' | 'data';
  setSelectedFilter?: (filter: 'all' | 'power' | 'data') => void;
  components?: ComponentItem[];
  onSelectComponent?: (compName: string) => void;
}

export const CadDiagram: React.FC<CadDiagramProps> = ({ 
  platform, 
  connections = [],
  hoveredIndex: propHoveredIndex,
  setHoveredIndex: propSetHoveredIndex,
  lockedIndex: propLockedIndex,
  setLockedIndex: propSetLockedIndex,
  selectedFilter: propSelectedFilter,
  setSelectedFilter: propSetSelectedFilter,
  components = DEFAULT_COMPONENTS,
  onSelectComponent,
}) => {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenScale, setFullscreenScale] = useState(1.1);

  const [localHover, setLocalHover] = useState<number | null>(null);
  const [localLock, setLocalLock] = useState<number | null>(null);
  const [localFilter, setLocalFilter] = useState<'all' | 'power' | 'data'>('all');

  const hoveredIndex = propHoveredIndex !== undefined ? propHoveredIndex : localHover;
  const setHoveredIndex = propSetHoveredIndex || setLocalHover;
  const lockedIndex = propLockedIndex !== undefined ? propLockedIndex : localLock;
  const setLockedIndex = propSetLockedIndex || setLocalLock;
  const selectedFilter = propSelectedFilter !== undefined ? propSelectedFilter : localFilter;
  const setSelectedFilter = propSetSelectedFilter || setLocalFilter;

  const isESP32 = platform.toLowerCase().includes('esp32');

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.6));

  // High resolution coordinates for the SVG elements
  const svgWidth = 920;
  let svgHeight = 440;

  // Center MCU Placement Parameters
  const mcuW = isESP32 ? 200 : 155;
  const mcuH = isESP32 ? 290 : 320;
  const mcuX = isESP32 ? 360 : 382;
  const mcuY = isESP32 ? 75 : 60;

  // Multi-model Pin Definition Profile for high accuracy
  const getMcuProfile = () => {
    if (isESP32) {
      return {
        leftPins: ['3V3', 'EN', 'GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', 'GPIO32', 'GPIO33', 'GPIO25', 'GPIO26', 'GPIO27', 'GPIO14', 'GPIO12', 'GPIO13', 'SD2', 'SD3', 'CMD', 'V5'],
        rightPins: ['GND', 'GPIO23', 'GPIO22', 'TXD0', 'RXD0', 'GPIO21', 'GPIO19', 'GPIO18', 'GPIO5', 'GPIO17', 'GPIO16', 'GPIO4', 'GPIO0', 'GPIO2', 'GPIO15', 'SD1', 'SD0', 'CLK', '3V3_R']
      };
    } else {
      // STM32 Blue Pill Pin standard
      return {
        leftPins: ['PB12', 'PB13', 'PB14', 'PB15', 'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7', 'PB8', 'PB9', '5V', 'GND', '3V3'],
        rightPins: ['PB11', 'PB10', 'PB1', 'PB0', 'PA7', 'PA6', 'PA5', 'PA4', 'PA3', 'PA2', 'PA1', 'PA0', 'PC15', 'PC14', 'PC13', 'VBAT', 'GND_R', '3V3_R', 'RST']
      };
    }
  };

  // Helper to resolve specific MCU Pin coordinate and protect against floating/hidden power mapping
  const getMcuPinCoord = (pinName: string): { x: number; y: number; side: 'left' | 'right' } => {
    let pin = pinName.toUpperCase().trim();
    const profile = getMcuProfile();
    
    // Normalize fuzzy or abbreviated power/ground names to their actual MCU pin counterparts
    if (pin === 'VCC' || pin === 'VCC_MCU' || pin === '3.3V' || pin === '3V3_MCU' || pin === 'VCC_3V3' || pin === 'VDD') {
      pin = '3V3';
    } else if (pin === '5V' || pin === '5V_MCU' || pin === 'VIN' || pin === 'VCC_5V') {
      pin = isESP32 ? 'V5' : '5V';
    } else if (pin === 'GND' || pin === 'GND_MCU' || pin === 'VSS') {
      pin = 'GND';
    }

    const normalize = (s: string) => s.toUpperCase().replace(/[\s_\-\/]/g, '');
    const normalizedPin = normalize(pin);
    const findIndex = (arr: string[]) => {
      return arr.findIndex(item => {
        return normalize(item) === normalizedPin;
      });
    };
    
    let leftIndex = findIndex(profile.leftPins);
    let rightIndex = findIndex(profile.rightPins);
    
    if (leftIndex !== -1) {
      const step = mcuH / (profile.leftPins.length + 1);
      return { x: mcuX, y: mcuY + (leftIndex + 1) * step, side: 'left' };
    }
    
    if (rightIndex !== -1) {
      const step = mcuH / (profile.rightPins.length + 1);
      return { x: mcuX + mcuW, y: mcuY + (rightIndex + 1) * step, side: 'right' };
    }
    
    // Explicit Fallbacks for Power/GND to prevent tracing to blank bottom center!
    if (pin.includes('GND')) {
      const backupGndLeft = profile.leftPins.findIndex(p => p.toUpperCase() === 'GND');
      if (backupGndLeft !== -1) {
        const step = mcuH / (profile.leftPins.length + 1);
        return { x: mcuX, y: mcuY + (backupGndLeft + 1) * step, side: 'left' };
      }
      const backupGndRight = profile.rightPins.findIndex(p => p.toUpperCase() === 'GND_R' || p.toUpperCase() === 'GND');
      if (backupGndRight !== -1) {
        const step = mcuH / (profile.rightPins.length + 1);
        return { x: mcuX + mcuW, y: mcuY + (backupGndRight + 1) * step, side: 'right' };
      }
    }
    
    if (pin.includes('3V3') || pin.includes('VCC') || pin.includes('POWER')) {
      const backup3V3Left = profile.leftPins.findIndex(p => p.toUpperCase() === '3V3');
      if (backup3V3Left !== -1) {
        const step = mcuH / (profile.leftPins.length + 1);
        return { x: mcuX, y: mcuY + (backup3V3Left + 1) * step, side: 'left' };
      }
      const backup3V3Right = profile.rightPins.findIndex(p => p.toUpperCase() === '3V3_R');
      if (backup3V3Right !== -1) {
        const step = mcuH / (profile.rightPins.length + 1);
        return { x: mcuX + mcuW, y: mcuY + (backup3V3Right + 1) * step, side: 'right' };
      }
    }

    if (pin.includes('5V') || pin.includes('V5') || pin.includes('VIN')) {
      const backup5VLeft = profile.leftPins.findIndex(p => p.toUpperCase() === '5V' || p.toUpperCase() === 'V5');
      if (backup5VLeft !== -1) {
        const step = mcuH / (profile.leftPins.length + 1);
        return { x: mcuX, y: mcuY + (backup5VLeft + 1) * step, side: 'left' };
      }
    }

    // Default top/bottom interpolation fallback if unknown pins provided
    // Let's fallback to PA0 for STM32, or GPIO2 for ESP32 since those are common pins
    const defaultPin = isESP32 ? 'GPIO2' : 'PA0';
    let defaultLeft = profile.leftPins.findIndex(p => p.toUpperCase() === defaultPin);
    if (defaultLeft !== -1) {
      const step = mcuH / (profile.leftPins.length + 1);
      return { x: mcuX, y: mcuY + (defaultLeft + 1) * step, side: 'left' };
    }
    let defaultRight = profile.rightPins.findIndex(p => p.toUpperCase() === defaultPin);
    if (defaultRight !== -1) {
      const step = mcuH / (profile.rightPins.length + 1);
      return { x: mcuX + mcuW, y: mcuY + (defaultRight + 1) * step, side: 'right' };
    }
    
    return { x: mcuX + mcuW / 2, y: mcuY + mcuH, side: 'right' };
  };

  // Helper to determine target component placement & resolve pin coordinate
  const findRegistryComponent = (compName: string) => {
    const cleanComp = compName.toLowerCase();
    return components.find(c => 
      c.name.toLowerCase().includes(cleanComp) || 
      cleanComp.includes(c.name.toLowerCase()) ||
      (c.macroPrefix && cleanComp.includes(c.macroPrefix.toLowerCase()))
    );
  };

  const getComponentSectorCoords = (category?: string): { devX: number; devY: number } => {
    if (category === 'Sensor') {
      return { devX: 60, devY: 40 };
    }
    if (category === 'Display') {
      return { devX: 700, devY: 40 };
    }
    if (category === 'Alert' || category === 'Actuator') {
      return { devX: 700, devY: 280 };
    }
    return { devX: 60, devY: 280 };
  };

  // Helper to match pin names flexibly and handle aliases (e.g. TXD -> TX, SDA -> MOSI, SCL -> SCK, RES -> RST, A0 -> DC, SS -> CS)
  const matchPins = (regPinName: string, connPinName: string): boolean => {
    // Support slash-separated pin definitions in frontend registry (e.g., "A0/DC")
    const subPins = regPinName.split('/');
    
    for (const subReg of subPins) {
      const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const regC = clean(subReg);
      const connC = clean(connPinName);
      if (regC === connC) return true;
      
      // Normalize common aliases
      const norm = (s: string) => {
        if (s.startsWith('TX') || s.endsWith('TX') || s.includes('TXD')) return 'TX';
        if (s.startsWith('RX') || s.endsWith('RX') || s.includes('RXD')) return 'RX';
        if (s === '5V' || s === '3V3' || s === '33V' || s === 'VIN' || s === 'VDD' || s === 'VCC') return 'VCC';
        if (s === 'GND' || s === 'VSS') return 'GND';
        if (s.includes('SDA') || s.includes('MOSI') || s.includes('SDI') || s.includes('DIN')) return 'SDA_MOSI';
        if (s.includes('SCL') || s.includes('SCK') || s.includes('CLK') || s.includes('SCLK')) return 'SCL_SCK';
        if (s.includes('MISO')) return 'MISO';
        if (s === 'RES' || s === 'RESET' || s === 'RST') return 'RST';
        if (s === 'A0' || s === 'RS' || s === 'DC') return 'DC';
        if (s === 'SS' || s === 'CS') return 'CS';
        return s;
      };
      
      const rNorm = norm(regC);
      const cNorm = norm(connC);
      if (rNorm === cNorm) return true;
      
      // Substring inclusion fallback for generic pins (e.g. TRIG vs TRIG_PIN, ECHO vs ECHO_PIN)
      // Condition relaxed to length >= 2 to catch matches like "TX" inside "TXD0" if it escapes norm
      if (regC.length >= 2 && connC.length >= 2) {
        if (regC.includes(connC) || connC.includes(regC)) return true;
      }
    }
    
    return false;
  };

  // NEW: Pure function to calculate ONLY the internal Y offset of a pin within its component box
  const getPinOffsetY = (componentName: string, pinName: string, regComp: any, compPins: string[]): number => {
    // Check if layout pin exists in registry
    if (regComp?.cadLayout?.pins) {
      const pinObj = regComp.cadLayout.pins.find((p: any) => matchPins(p.name, pinName));
      if (pinObj) {
        return pinObj.offsetY;
      }
    }

    // Generic data-driven fallback if not found in parts library
    const pinNameUpper = pinName.toUpperCase().trim();
    if (pinNameUpper === 'VCC' || pinNameUpper === 'VDD' || pinNameUpper === '3V3' || pinNameUpper === '5V') {
      return 18;
    } else if (pinNameUpper === 'GND') {
      return 36; // Place GND safely below VCC if not registered
    } else {
      // Unmatched signal pin: distribute safely at the bottom
      const unmatchedSignalPins = compPins.filter(p => {
        const u = p.toUpperCase().trim();
        if (['VCC', 'VDD', '3V3', '5V', 'GND'].includes(u)) return false;
        if (regComp?.cadLayout?.pins?.some((regPin: any) => matchPins(regPin.name, p))) return false;
        return true;
      });

      let maxMatchedY = 45;
      if (regComp?.cadLayout?.pins && regComp.cadLayout.pins.length > 0) {
         maxMatchedY = Math.max(...regComp.cadLayout.pins.map((p: any) => p.offsetY));
      } else {
         if (compPins.some(p => ['GND'].includes(p.toUpperCase().trim()))) maxMatchedY = 36;
         else if (compPins.some(p => ['VCC', 'VDD', '3V3', '5V'].includes(p.toUpperCase().trim()))) maxMatchedY = 18;
      }

      const signalIdx = unmatchedSignalPins.indexOf(pinName);
      if (signalIdx !== -1) {
        return maxMatchedY + 15 + signalIdx * 15;
      }
    }
    return 45;
  };

  // NEW: Global registry for assigned coordinates to prevent overlap
  const assignedCoords: Record<string, { devX: number, devY: number, width: number, height: number }> = {};
  let maxOccupiedY = 0;

  // We need a list of unique peripheral names
  const uniqueComps = Array.from(new Set(connections.map(c => c.toComponent).filter(comp => {
    if (!comp) return false;
    const lower = comp.toLowerCase();
    if (lower.includes('devkit') || lower.includes('mcu') || lower.includes('stm32') || lower.includes('esp32')) return false;
    return true;
  })));

  const layoutSide = (category?: ComponentItem['category']) => (
    category === 'Display' || category === 'Alert' || category === 'Actuator' ? 'right' : 'left'
  );

  const layoutPriority = (category?: ComponentItem['category']) => {
    if (category === 'Sensor') return 0;
    if (category === 'Other') return 1;
    if (category === 'Display') return 0;
    if (category === 'Alert') return 1;
    if (category === 'Actuator') return 2;
    return 3;
  };

  const componentLayoutItems = uniqueComps.map((comp, index) => {
    const regComp = findRegistryComponent(comp);
    const width = regComp?.cadLayout?.width || 160;

    // Calculate required height based on all pins
    const compConnections = connections.filter(c => c.toComponent === comp);
    const compPins = Array.from(new Set(compConnections.map(c => c.toPin)));

    let maxOffsetY = regComp?.cadLayout?.height || 90;
    compPins.forEach(p => {
       const offsetY = getPinOffsetY(comp, p, regComp, compPins);
       if (offsetY + 20 > maxOffsetY) maxOffsetY = offsetY + 20;
    });

    return {
      name: comp,
      index,
      category: regComp?.category,
      side: layoutSide(regComp?.category),
      priority: layoutPriority(regComp?.category),
      width,
      height: maxOffsetY,
    };
  });

  const columnCursors = { left: 54, right: 54 };
  const columnX = { left: 60, right: 700 };
  const rowGap = 26;

  componentLayoutItems
    .sort((a, b) => {
      if (a.side !== b.side) return a.side === 'left' ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.index - b.index;
    })
    .forEach((item) => {
      const finalY = columnCursors[item.side];
      assignedCoords[item.name] = {
        devX: columnX[item.side],
        devY: finalY,
        width: item.width,
        height: item.height
      };

      columnCursors[item.side] = finalY + item.height + rowGap;
      if (finalY + item.height > maxOccupiedY) {
        maxOccupiedY = finalY + item.height;
      }
    });

  // Calculate dynamic SVG height to ensure bottom components are never clipped
  svgHeight = Math.max(480, maxOccupiedY + 60);

  // Helper to determine target component placement & resolve pin coordinate
  const getComponentPinCoord = (componentName: string, pinName: string): { x: number; y: number; devX: number; devY: number } => {
    const assigned = assignedCoords[componentName];
    if (!assigned) {
      const regComp = findRegistryComponent(componentName);
      const { devX, devY } = getComponentSectorCoords(regComp?.category);
      return { x: devX, y: devY, devX, devY }; 
    }
    
    const { devX, devY, width } = assigned;
    const isLeftSide = devX < mcuX;
    
    const regComp = findRegistryComponent(componentName);
    const compConnections = connections.filter(c => c.toComponent === componentName);
    const compPins = Array.from(new Set(compConnections.map(c => c.toPin)));
    
    const offsetY = getPinOffsetY(componentName, pinName, regComp, compPins);
    
    const pinX = isLeftSide ? devX + width : devX;
    return { x: pinX, y: devY + offsetY, devX, devY };
  };

  // Convert schema layout pins
  const profile = getMcuProfile();

  // Extract unique peripheral devices and map them to their fixed sectors
  const peripherals = uniqueComps.reduce((acc: { [name: string]: any }, comp) => {
    const assigned = assignedCoords[comp];
    const regComp = findRegistryComponent(comp);
    acc[comp] = {
      name: comp,
      x: assigned.devX,
      y: assigned.devY,
      w: assigned.width,
      h: assigned.height,
      renderType: regComp?.cadLayout?.renderType || 'generic_board'
    };
    return acc;
  }, {});

  const getWireIsPower = (conn: PinConnection) => (
    conn.signalType === 'VCC' ||
    conn.signalType === 'GND' ||
    conn.toPin.toUpperCase().includes('VCC') ||
    conn.toPin.toUpperCase().includes('GND') ||
    conn.fromPin.toUpperCase().includes('3V3') ||
    conn.fromPin.toUpperCase().includes('5V') ||
    conn.fromPin.toUpperCase().includes('GND')
  );

  const wireMatchesFilter = (conn: PinConnection) => {
    const isPower = getWireIsPower(conn);
    return (
      selectedFilter === 'all' ||
      (selectedFilter === 'power' && isPower) ||
      (selectedFilter === 'data' && !isPower)
    );
  };

  // Color mappings ensuring super high visibility on dark theme background (never any black/dark wires)
  const getHighContrastColor = (rawColor: string | undefined, signalType: string | undefined, toPinName: string | undefined): string => {
    const signal = (signalType || '').toUpperCase().trim();
    const toPin = (toPinName || '').toUpperCase().trim();

    if (signal === 'VCC' || toPin === 'VCC' || toPin === 'VDD' || toPin === '3V3' || toPin === '5V') {
      return '#ef4444'; // Bright Red (VCC Line)
    }
    if (signal === 'GND' || toPin === 'GND' || toPin === 'VSS') {
      return '#94a3b8'; // Silver/Slate Grey (GND Line - easily visible, never black or invisible dark grey!)
    }
    if (toPin === 'TX' || toPin === 'TXD' || toPin.includes('TX') || signal.includes('TX') || signal.includes('UART_TX')) {
      return '#f59e0b'; // Amber (UART TX Line)
    }
    if (toPin === 'RX' || toPin === 'RXD' || toPin.includes('RX') || signal.includes('RX') || signal.includes('UART_RX')) {
      return '#ec4899'; // Pink/Magenta (UART RX Line)
    }
    if (signal === 'I2C_SDA' || toPin === 'SDA') {
      return '#a855f7'; // Purple (SDA)
    }
    if (signal === 'I2C_SCL' || toPin === 'SCL') {
      return '#06b6d4'; // Glowing Cyan (SCL Clock)
    }
    if (signal === 'ADC' || toPin.includes('ADC') || toPin.includes('OUT') || toPin.includes('SIG')) {
      return '#10b981'; // Green (Analog/Digital Signals)
    }
    if (signal === 'PWM' || toPin.includes('PWM') || toPin.includes('SERVO')) {
      return '#f59e0b'; // Amber (Servo/PWM)
    }

    if (rawColor) {
      const colorClean = rawColor.toUpperCase().trim();
      if (
        colorClean === '#000000' ||
        colorClean === '#111827' ||
        colorClean === '#1F2937' ||
        colorClean === '#1E293B' ||
        colorClean === '#090D16' ||
        colorClean === '#334155' ||
        colorClean === 'BLACK' ||
        colorClean === 'DARKGREY' ||
        colorClean === '#030712'
      ) {
        return '#3b82f6'; // Replace with visible vibrant blue
      }
      return rawColor;
    }
    return '#3b82f6';
  };

  const getWireGeometry = (conn: PinConnection, idx: number) => {
    const mcuPin = getMcuPinCoord(conn.fromPin);
    const compPin = getComponentPinCoord(conn.toComponent, conn.toPin);
    const isLeftMcu = mcuPin.side === 'left';
    const x1 = mcuPin.x;
    const y1 = mcuPin.y;
    const x2 = compPin.x;
    const y2 = compPin.y;

    // Orthogonal pathways calculated with indexing offsets.
    const trackDist = 9.5;
    const laneIndexOffset = (idx - connections.length / 2) * trackDist;
    const xMid = isLeftMcu ? (x1 - 32 + laneIndexOffset) : (x1 + 32 + laneIndexOffset);

    const pathData = y1 === y2
      ? `M ${x1} ${y1} H ${x2}`
      : `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;

    return { pathData, x1, y1, x2, y2 };
  };

  const activeWireIndices = Array.from(new Set([lockedIndex, hoveredIndex].filter((idx): idx is number => (
    idx !== null && idx >= 0 && idx < connections.length
  ))));

  const renderWire = (conn: PinConnection, idx: number, renderAsTopLayer = false) => {
    if (!wireMatchesFilter(conn)) return null;

    const { pathData, x1, y1, x2, y2 } = getWireGeometry(conn, idx);
    const isHovered = hoveredIndex === idx;
    const isLocked = lockedIndex === idx;
    const isActive = isHovered || isLocked || renderAsTopLayer;
    const hasActiveSelection = hoveredIndex !== null || lockedIndex !== null;

    let opacity = renderAsTopLayer ? 1 : 0.95;
    if (hasActiveSelection && !isActive) {
      opacity = 0.12;
    }

    const strokeColor = getHighContrastColor(conn.color, conn.signalType, conn.toPin);
    const strokeWidth = isActive ? 2.8 : 1.6;

    return (
      <g
        key={renderAsTopLayer ? `wire-active-${idx}` : `wire-${idx}`}
        className="wire cursor-pointer transition-opacity duration-200"
        style={{ opacity }}
        onMouseEnter={() => setHoveredIndex(idx)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => setLockedIndex(isLocked ? null : idx)}
      >
        {/* Outer transparent fat path for forgiving mouse gestures */}
        <path
          d={pathData}
          fill="none"
          stroke="transparent"
          strokeWidth="14"
        />

        {/* Highlighting glow overlay under wire trace */}
        {isActive && (
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth + 5.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.32"
            className="animate-pulse"
          />
        )}

        {/* Physical connection copper wire */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isActive ? 'active-wire' : ''}
          style={{ transition: 'stroke-width 150ms ease' }}
        />

        {/* Electronic signal flow label tooltip overlay */}
        {isActive && (
          <g transform={`translate(${(x1 + x2) / 2}, ${y2 - 12})`} style={{ pointerEvents: 'none' }}>
            <rect x="-44" y="-10" width="88" height="18" fill="#1e293b" rx="4" stroke={strokeColor} strokeWidth="1" filter="drop-shadow(0 4px 6px -1px rgba(0,0,0,0.3))" />
            <text textAnchor="middle" y="2" fontSize="7.5" fill="#f8fafc" className="font-mono font-bold tracking-wider uppercase">{conn.signalType || 'GPIO'} LINK</text>
          </g>
        )}

        {/* Pin contact connection solder dot endpoints */}
        <circle cx={x1} cy={y1} r={isActive ? "4.5" : "2"} fill={strokeColor} />
        <circle cx={x2} cy={y2} r={isActive ? "4.5" : "2"} fill={strokeColor} />
      </g>
    );
  };

  // Generate SVG code for the file download (robust for both fullscreen and standard view)
  const handleExportSvg = () => {
    const svgElement = document.getElementById('iot-cad-svg-fullscreen') || document.getElementById('iot-cad-svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${platform.replace(/\s+/g, '_')}_wiring_diagram.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const svgContents = (
    <>
      {/* Elegant Tech Solder grid background */}
      <defs>
        <pattern id="darkGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#090d16" />
          <circle cx="1" cy="1" r="0.75" fill="#1e293b" opacity="0.6" />
        </pattern>
      </defs>
      <rect width={svgWidth} height={svgHeight} fill="url(#darkGrid)" rx="12" />

            {/* PLATFORM TITLE DECAL */}
            <g opacity="0.12" transform="translate(30, 420)">
              <text fontSize="11" className="font-mono font-bold tracking-widest text-[#94a3b8] uppercase">CORE HARDWARE SCHEMATIC LAYER</text>
            </g>

            {/* Render non-active wiring first; active traces are promoted after boards/devices. */}
            {connections.map((conn, idx) => activeWireIndices.includes(idx) ? null : renderWire(conn, idx))}

            {/* Render center MCU board module */}
            <g className="mcu-board-group cursor-pointer select-none" onClick={() => onSelectComponent?.(isESP32 ? 'esp32' : 'stm32')}>
              {isESP32 ? (
                // 1. HIGH-FIDELITY RENDER: ESP32 DEV MODULE (Charcoal/Gold Premium Design)
                <g>
                  {/* Outer PCB outline */}
                  <rect x={mcuX} y={mcuY} width={mcuW} height={mcuH} fill="#111827" stroke="#1d293b" strokeWidth="2" rx="10" />
                  <rect x={mcuX+2} y={mcuY+2} width={mcuW-4} height={mcuH-4} fill="none" stroke="#2c3e50" strokeWidth="1" rx="8" />
                  
                  {/* Gold Plated track bezel lines */}
                  <rect x={mcuX+12} y={mcuY+10} width={mcuW-24} height={mcuH-20} fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.25" rx="6" />

                  {/* Micro USB connector block */}
                  <g>
                    <rect x={mcuX + mcuW / 2 - 15} y={mcuY + mcuH - 8} width="30" height="15" fill="#64748b" rx="2" stroke="#475569" strokeWidth="1" />
                    <rect x={mcuX + mcuW / 2 - 11} y={mcuY + mcuH - 5} width="22" height="11" fill="#475569" rx="1" />
                    {/* Metal solder pads */}
                    <rect x={mcuX + mcuW / 2 - 17} y={mcuY + mcuH - 10} width="4" height="6" fill="#f59e0b" opacity="0.7"/>
                    <rect x={mcuX + mcuW / 2 + 13} y={mcuY + mcuH - 10} width="4" height="6" fill="#f59e0b" opacity="0.7"/>
                  </g>

                  {/* Wi-Fi SoC Metallic Antishield Module (ESP-WROOM-32) */}
                  <g transform={`translate(${mcuX + 40}, ${mcuY + 30})`}>
                    <rect x="0" y="0" width="120" height="96" fill="#cbd5e1" stroke="#94a3b8" rx="4" />
                    {/* Dark Antenna PCB area */}
                    <rect x="5" y="4" width="110" height="18" fill="#1e293b" rx="1" />
                    {/* Gold Snake antenna traces */}
                    <path d="M 12 12 H 24 V 8 H 32 V 12 H 44 V 8 H 52 V 12 H 64 V 8 H 72 V 12 H 84 V 8 H 92 V 12 H 108" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.8"/>
                    {/* Label */}
                    <text x="60" y="48" textAnchor="middle" fontSize="10" className="font-display font-black" fill="#334155" tracking-tighter="true">ESP32-WROOM-32</text>
                    <text x="60" y="58" textAnchor="middle" fontSize="7" className="font-mono" fill="#64748b">FCC ID: 2AC7Z-ESPWROOM32</text>
                    <circle cx="15" cy="80" r="4.5" fill="#94a3b8" />
                    <circle cx="15" cy="80" r="1.5" fill="#334155" />
                  </g>

                  {/* Silicon IC chips (Silicon labs CP2102 USB Bridge & Flash chip) */}
                  <rect x={mcuX + 85} y={mcuY + 160} width="30" height="30" fill="#1e293b" rx="3" stroke="#334155" />
                  <circle cx={mcuX + 91} cy={mcuY + 166} r="2" fill="#030712" />
                  <text x={mcuX + 100} y={mcuY + 179} textAnchor="middle" fontSize="6.5" className="font-mono" fill="#94a3b8">CP2102</text>
                  
                  {/* AMS1117 LDO Voltage Regulator */}
                  <rect x={mcuX + 45} y={mcuY + 170} width="22" height="16" fill="#1e293b" rx="1" />
                  <rect x={mcuX + 51} y={mcuY + 164} width="10" height="6" fill="#94a3b8" />
                  <text x={mcuX + 56} y={mcuY + 181} textAnchor="middle" fontSize="5" className="font-mono text-neutral-400" fill="#cbd5e1">AMS1117</text>

                  {/* Red Power LED & Blue Pin-2 LED */}
                  <circle cx={mcuX + 55} cy={mcuY + 220} r="3" fill="#ef4444" />
                  <text x={mcuX + 55} y={mcuY + 214} textAnchor="middle" fontSize="6" className="font-mono font-bold" fill="#ef4444">PWR</text>

                  <circle cx={mcuX + 145} cy={mcuY + 220} r="3" fill="#3b82f6" />
                  <text x={mcuX + 145} y={mcuY + 214} textAnchor="middle" fontSize="6" className="font-mono font-bold" fill="#3b82f6">IO2</text>

                  {/* Dual Tactile Control Buttons EN and BOOT */}
                  <g>
                    {/* EN */}
                    <rect x={mcuX + 35} y={mcuY + mcuH - 42} width="24" height="20" fill="#334155" rx="2" stroke="#475569" strokeWidth="1" />
                    <circle cx={mcuX + 47} cy={mcuY + mcuH - 32} r="5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
                    <text x={mcuX + 47} y={mcuY + mcuH - 46} textAnchor="middle" fontSize="7" className="font-mono font-bold" fill="#cbd5e1">EN</text>

                    {/* BOOT */}
                    <rect x={mcuX + mcuW - 59} y={mcuY + mcuH - 42} width="24" height="20" fill="#334155" rx="2" stroke="#475569" strokeWidth="1" />
                    <circle cx={mcuX + mcuW - 47} cy={mcuY + mcuH - 32} r="5" fill="#64748b" stroke="#334155" strokeWidth="1" />
                    <text x={mcuX + mcuW - 47} y={mcuY + mcuH - 46} textAnchor="middle" fontSize="7" className="font-mono font-bold" fill="#cbd5e1">BOOT</text>
                  </g>
                </g>
              ) : (
                // 2. HIGH-FIDELITY RENDER: STM32 BLUE PILL (Deep Blue Dual-Sided Visual PCB)
                <g>
                  {/* Outer PCB outline */}
                  <rect x={mcuX} y={mcuY} width={mcuW} height={mcuH} fill="#0d2c52" stroke="#1d4ed8" strokeWidth="2.5" rx="8" />
                  <rect x={mcuX+2} y={mcuY+2} width={mcuW-4} height={mcuH-4} fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.3" rx="6" />

                  {/* Yellow jumper terminals at the top (BOOT0, BOOT1 caps) */}
                  <g transform={`translate(${mcuX + 40}, ${mcuY + 36})`}>
                    <rect x="0" y="0" width="75" height="22" fill="#1e293b" rx="2" stroke="#475569" strokeWidth="1" />
                    {/* Header pins (6 solder points) */}
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <circle key={i} cx={10 + i * 11} cy={11} r="2.2" fill="#fbbf24" stroke="#000000" strokeWidth="0.5" />
                    ))}
                    {/* Jumper cap overlays on coordinates */}
                    <rect x="6" y="5" width="8" height="12" fill="#fbbf24" rx="1" stroke="#b45309" strokeWidth="1" />
                    <rect x="28" y="5" width="8" height="12" fill="#fbbf24" rx="1" stroke="#b45309" strokeWidth="1" />
                    <text x="37" y="32" textAnchor="middle" fontSize="7" className="font-mono font-semibold" fill="#ef4444">BOOT 0/1</text>
                  </g>

                  {/* Micro-USB Port Block at top edge */}
                  <g>
                    <rect x={mcuX + mcuW / 2 - 16} y={mcuY - 10} width="32" height="15" fill="#94a3b8" rx="2" stroke="#475569" strokeWidth="1" strokeLinejoin="miter" />
                    <rect x={mcuX + mcuW / 2 - 12} y={mcuY - 7} width="24" height="10" fill="#475569" rx="1" />
                  </g>

                  {/* ARM Cortex-M3 Main Processor Module (Classic rotated black chip) */}
                  <g transform={`translate(${mcuX + mcuW / 2}, ${mcuY + 145})`}>
                    {/* Quadrant rotated board */}
                    <rect x="-30" y="-30" width="60" height="60" fill="#262626" rx="4" stroke="#374151" strokeWidth="1.5" transform="rotate(45)" />
                    {/* Engravings */}
                    <text x="0" y="-8" textAnchor="middle" fontSize="7.5" className="font-sans font-extrabold" fill="#d1d5db" tracking-wide="true">ST® ARM</text>
                    <text x="0" y="2" textAnchor="middle" fontSize="6.5" className="font-mono font-black" fill="#cbd5e1">STM32F103</text>
                    <text x="0" y="11" textAnchor="middle" fontSize="6" className="font-mono font-semibold" fill="#94a3b8">C8T6</text>
                    {/* Chip circular mark */}
                    <circle cx="-16" cy="-16" r="1.5" fill="#0f172a" />
                  </g>

                  {/* Metal-cased crystal oscillator tube */}
                  <g transform={`translate(${mcuX + mcuW / 2 - 8}, ${mcuY + 225})`}>
                    <rect x="0" y="0" width="16" height="34" fill="#cbd5e1" rx="8" stroke="#94a3b8" strokeWidth="1" />
                    <line x1="8" y1="-3" x2="8" y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
                    <text x="8" y="21" textAnchor="middle" fontSize="6.5" className="font-mono font-bold" fill="#64748b">8.00M</text>
                  </g>

                  {/* Reset Red Tactile core button */}
                  <g transform={`translate(${mcuX + 22}, ${mcuY + 280})`}>
                    <rect x="0" y="0" width="18" height="18" fill="#475569" stroke="#334155" rx="1" />
                    <circle cx="9" cy="9" r="4.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
                    <text x="9" y="-4" textAnchor="middle" fontSize="6.5" className="font-mono font-bold" fill="#cbd5e1">RST</text>
                  </g>

                  {/* Power status led and PC13 user programmable led */}
                  <circle cx={mcuX + 125} cy={mcuY + 280} r="3" fill="#ea580c" />
                  <text x={mcuX + 117} y={mcuY + 283} textAnchor="end" fontSize="6.5" className="font-mono font-bold" fill="#ea580c">PWR</text>
                  
                  <circle cx={mcuX + 125} cy={mcuY + 295} r="3" fill="#22c55e" />
                  <text x={mcuX + 117} y={mcuY + 298} textAnchor="end" fontSize="6.5" className="font-mono font-bold" fill="#22c55e">PC13</text>
                </g>
              )}

              {/* MCU Pins Visual Solder Eyelet Arrays */}
              {/* Left-side pins output */}
              {profile.leftPins.map((p, idx) => {
                const step = mcuH / (profile.leftPins.length + 1);
                const y = mcuY + (idx + 1) * step;
                const pinName = p.endsWith('_L') ? p.slice(0, -2) : p;
                
                // Track if connected to light-up golden pads!
                const isPinConnected = connections.some(c => c.fromPin.toUpperCase() === p.toUpperCase());
                
                return (
                  <g key={`l-${p}-${idx}`} className="group/pin select-none">
                    {/* PCB trace copper ring pad */}
                    <rect x={mcuX - 8} y={y - 6} width="16" height="12" fill={isPinConnected ? "#fbbf24" : "#475569"} rx="1.5" stroke="#111827" strokeWidth="0.8" />
                    <circle cx={mcuX} cy={y} r="2.8" fill="#090d16" stroke="#94a3b8" strokeWidth="0.6" />
                    {/* Golden Solder ring pad inside hole */}
                    {isPinConnected && <circle cx={mcuX} cy={y} r="1.5" fill="#fbbf24" />}
                    {/* Clear typography label tag */}
                    <text x={mcuX + 11} y={y + 3.2} fontSize="7.8" className="font-mono font-black select-none" fill="#f8fafc">{pinName}</text>
                  </g>
                );
              })}

              {/* Right-side pins output */}
              {profile.rightPins.map((p, idx) => {
                const step = mcuH / (profile.rightPins.length + 1);
                const y = mcuY + (idx + 1) * step;
                const pinName = p.endsWith('_R') ? p.slice(0, -2) : p;
                
                const isPinConnected = connections.some(c => c.fromPin.toUpperCase() === p.toUpperCase());
                
                return (
                  <g key={`r-${p}-${idx}`} className="group/pin select-none">
                    {/* PCB trace copper ring pad */}
                    <rect x={mcuX + mcuW - 8} y={y - 6} width="16" height="12" fill={isPinConnected ? "#fbbf24" : "#475569"} rx="1.5" stroke="#111827" strokeWidth="0.8" />
                    <circle cx={mcuX + mcuW} cy={y} r="2.8" fill="#090d16" stroke="#94a3b8" strokeWidth="0.6" />
                    {isPinConnected && <circle cx={mcuX + mcuW} cy={y} r="1.5" fill="#fbbf24" />}
                    {/* Clear typography label tag */}
                    <text x={mcuX + mcuW - 11} y={y + 3.2} textAnchor="end" fontSize="7.8" className="font-mono font-black select-none" fill="#f8fafc">{pinName}</text>
                  </g>
                );
              })}
            </g>

            {/* Render peripheral hardware modules with highly realistic vector structures */}
            {Object.values(peripherals).map((comp: any) => {
              const isDisplay = comp.renderType === 'oled_style';
              const isSensor = comp.renderType === 'sensor_style';
              const isAcoustic = comp.renderType === 'buzzer_style';
              const isRelay = comp.renderType === 'relay_style';
              
              let headerColor = '#1e293b';
              let textColor = '#cbd5e1';
              if (isSensor) { headerColor = '#1e40af'; textColor = '#93c5fd'; }
              else if (isDisplay) { headerColor = '#581c87'; textColor = '#e879f9'; }
              else if (isAcoustic) { headerColor = '#7c2d12'; textColor = '#fdba74'; }
              else if (isRelay) { headerColor = '#065f46'; textColor = '#6ee7b7'; }

              const isLeftSide = comp.x < mcuX;

              // Filter all active connections associated with this peripheral device
              const compConnections = connections.filter(c => c.toComponent === comp.name);
              // Deduplicate wired list
              const compPins = Array.from(new Set(compConnections.map(c => c.toPin)));

              return (
                <g key={comp.name} className="peripheral-group cursor-pointer select-none" onClick={() => onSelectComponent?.(comp.name)}>
                  {/* Subtle outer tech frame for component cards */}
                  <rect 
                    x={comp.x} 
                    y={comp.y} 
                    width={comp.w} 
                    height={comp.h} 
                    fill="#151d2e" 
                    stroke="#1e293b" 
                    strokeWidth="1.5" 
                    rx="8" 
                  />
                  {/* Outer border highlight */}
                  <rect 
                    x={comp.x+1.5} 
                    y={comp.y+1.5} 
                    width={comp.w-3} 
                    height={comp.h-3} 
                    fill="none" 
                    stroke={headerColor} 
                    strokeWidth="1" 
                    opacity="0.3"
                    rx="6.5" 
                  />
                  {/* Top card banner strip */}
                  <rect 
                    x={comp.x + 1.5} 
                    y={comp.y + 1.5} 
                    width={comp.w - 3} 
                    height={22} 
                    fill={headerColor} 
                    rx="6" 
                  />
                  <rect 
                    x={comp.x + 1.5} 
                    y={comp.y + 11} 
                    width={comp.w - 3} 
                    height={12} 
                    fill={headerColor} 
                  />
                  <text 
                    x={comp.x + comp.w / 2} 
                    y={comp.y + 14} 
                    textAnchor="middle" 
                    fontSize="9.5" 
                    className="font-display font-black tracking-wide uppercase font-mono"
                    fill={textColor}
                  >
                    {comp.name}
                  </text>

                  {/* CUSTOM GRAPHICS ILLUSTRATING PERIPHERAL WORKINGS */}
                  {isDisplay && (
                    <g>
                      {/* Dark display screen board glass mask */}
                      <rect x={comp.x + 12} y={comp.y + 28} width={comp.w - 24} height={54} fill="#020617" rx="3" stroke="#2e1065" strokeWidth="1" />
                      {/* Glow screen pixels (gorgeous active telemetry mockup!) */}
                      <rect x={comp.x + 15} y={comp.y + 31} width={comp.w - 30} height={48} fill="#030712" rx="2" />
                      <text x={comp.x + 22} y={comp.y + 42} fontSize="7" className="font-mono text-cyan-400 font-extrabold" fill="#22d3ee">▶ READINGS OK</text>
                      <text x={comp.x + 22} y={comp.y + 54} fontSize="7.5" className="font-mono text-yellow-500 font-extrabold" fill="#eae112">• TEMP: 26.8 °C</text>
                      <text x={comp.x + 22} y={comp.y + 66} fontSize="7.5" className="font-mono text-cyan-400 font-extrabold" fill="#22d3ee">• HUMI: 56.4 %</text>
                      {/* Small corner screws */}
                      <circle cx={comp.x + 6} cy={comp.y + 28} r="1.5" fill="#64748b" />
                      <circle cx={comp.x + comp.w - 6} cy={comp.y + 28} r="1.5" fill="#64748b" />
                      <circle cx={comp.x + 6} cy={comp.y + comp.h - 6} r="1.5" fill="#64748b" />
                      <circle cx={comp.x + comp.w - 6} cy={comp.y + comp.h - 6} r="1.5" fill="#64748b" />
                    </g>
                  )}
                  
                  {isSensor && (
                    <g>
                      {/* Sensor cooling chassis grid */}
                      <rect x={comp.x + comp.w / 2 - 20} y={comp.y + 28} width="40" height="52" fill="#3b82f6" rx="4" stroke="#1d4ed8" strokeWidth="1" />
                      {/* Cooling grooves line mesh */}
                      {[0, 1, 2, 3, 4].map(idx => (
                        <line 
                          key={idx}
                          x1={comp.x + comp.w / 2 - 15} 
                          y1={comp.y + 36 + idx * 8} 
                          x2={comp.x + comp.w / 2 + 15} 
                          y2={comp.y + 36 + idx * 8} 
                          stroke="#1d4ed8" 
                          strokeWidth="2.5" 
                          strokeDasharray="2, 4"
                          opacity="0.8"
                        />
                      ))}
                      {/* Central sensor moisture-intake vent circle */}
                      <circle cx={comp.x + comp.w / 2} cy={comp.y + 44} r="5.5" fill="#cbd5e1" stroke="#1d4ed8" strokeWidth="1"/>
                    </g>
                  )}

                  {isAcoustic && (
                    <g>
                      {/* Radial speaker cylinder structure */}
                      <circle cx={comp.x + comp.w / 2} cy={comp.y + 54} r="25" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                      <circle cx={comp.x + comp.w / 2} cy={comp.y + 54} r="20" fill="none" stroke="#4b5563" strokeWidth="0.8" />
                      <circle cx={comp.x + comp.w / 2} cy={comp.y + 54} r="6" fill="#030712" />
                      <text x={comp.x + comp.w / 2 + 12} y={comp.y + 44} fontSize="9" className="font-mono font-black" fill="#94a3b8">+</text>
                    </g>
                  )}

                  {isRelay && (
                    <g>
                      {/* Optocoupler / Blue relay protective box */}
                      <rect x={comp.x + 12} y={comp.y + 28} width="85" height="52" fill="#1e3a8a" rx="4" stroke="#1e40af" strokeWidth="1" />
                      <text x={comp.x + 54} y={comp.y + 52} textAnchor="middle" fontSize="8.5" className="font-mono font-black tracking-wide" fill="#cbd5e1">RELAY BOX</text>
                      <text x={comp.x + 54} y={comp.y + 63} textAnchor="middle" fontSize="6.5" className="font-mono text-neutral-400" fill="#93c5fd">VCC 05VDC</text>
                      {/* Connecting brass terminals box block */}
                      <rect x={comp.x + comp.w - 32} y={comp.y + 28} width="22" height="52" fill="#047857" rx="2" stroke="#065f46" />
                      {/* Brass screw terminal eyes */}
                      {[0, 1].map((n) => (
                        <circle key={n} cx={comp.x + comp.w - 21} cy={comp.y + 38 + n * 30} r="4.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
                      ))}
                    </g>
                  )}

                  {!isDisplay && !isSensor && !isAcoustic && !isRelay && (
                    <g>
                      {/* SMT integrated visual board with copper circuit traces */}
                      <rect x={comp.x + 25} y={comp.y + 29} width={comp.w - 50} height={50} fill="#020617" rx="4" stroke="#1e293b" />
                      <circle cx={comp.x + comp.w / 2} cy={comp.y + 54} r="15" fill="#1e293b" />
                      <line x1={comp.x + 35} y1={comp.y + 54} x2={comp.x + comp.w - 35} y2={comp.y + 54} stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1={comp.x + comp.w / 2} y1={comp.y + 38} x2={comp.x + comp.w / 2} y2={comp.y + 70} stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" />
                    </g>
                  )}

                  {/* Render Board Edge Terminals dynamically exactly aligned with Wiring Paths */}
                  {compPins.map((pinName) => {
                    // Pull identical pixel coords
                    const coords = getComponentPinCoord(comp.name, pinName);
                    const pinX = coords.x;
                    const pinY = coords.y;

                    // Match if trace connection hovered either inside SVG or table rows
                    const originalConnIdx = connections.findIndex(c => c.toComponent === comp.name && c.toPin === pinName);
                    const isPinWiredHovered = originalConnIdx !== -1 && (hoveredIndex === originalConnIdx || lockedIndex === originalConnIdx);

                    return (
                      <g key={`${comp.name}-${pinName}`} className="peripheral-pin flex items-center justify-center">
                        {/* Brass terminal ring eyelet */}
                        <circle 
                          cx={pinX} 
                          cy={pinY} 
                          r="5.5" 
                          fill={isPinWiredHovered ? "#fbbf24" : "#242f41"} 
                          stroke="#111827" 
                          strokeWidth="1" 
                        />
                        <circle 
                          cx={pinX} 
                          cy={pinY} 
                          r="2.2" 
                          fill="#090d16" 
                          stroke={isPinWiredHovered ? "#fbbf24" : "#94a3b8"}
                          strokeWidth="0.5"
                        />
                        {/* Hover ring pulse highlight */}
                        {isPinWiredHovered && (
                          <circle 
                            cx={pinX} 
                            cy={pinY} 
                            r="9" 
                            fill="none" 
                            stroke="#fbbf24" 
                            strokeWidth="1" 
                            opacity="0.5"
                            className="animate-ping"
                          />
                        )}
                        {/* Pin label text positioned outwards cleanly */}
                        <text 
                          x={isLeftSide ? pinX - 9 : pinX + 9} 
                          y={pinY + 3} 
                          textAnchor={isLeftSide ? "end" : "start"} 
                          fontSize="8.4" 
                          className="font-mono font-extrabold tracking-tight" 
                          fill="#94a3b8"
                        >
                          {pinName}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Selected/hovered traces are rendered last so they visually sit above boards and modules. */}
            {activeWireIndices.map((idx) => renderWire(connections[idx], idx, true))}

    </>
  );

  return (
    <div className="border border-neutral-100 rounded-2xl bg-white p-6 shadow-sm flex flex-col h-full bg-linear-to-b from-white to-neutral-50/20">
      {/* Dynamic Animated Stylesheet embedded safely */}
      <style>{`
        @keyframes flowForward {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .active-wire {
          animation: flowForward 0.8s linear infinite !important;
          stroke-dasharray: 6, 4 !important;
        }
        .peripheral-group rect, .mcu-board-group rect {
          transition: stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease;
        }
        .peripheral-group:hover rect:first-of-type {
          stroke: #f59e0b !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.4));
        }
        .mcu-board-group:hover rect:first-of-type {
          stroke: #f59e0b !important;
          stroke-width: 2.5px !important;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.5));
        }
      `}</style>

      {/* CAD Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-neutral-800 animate-pulse" />
            <h3 className="font-display font-bold text-neutral-900 text-sm tracking-tight">智能引脚排线与仿真CAD版图</h3>
          </div>
          <p className="text-neutral-400 text-[10px] font-medium tracking-wide block uppercase font-sans">
            配合双脑编译器自动分配：智能渲染无冲突的物理引脚走线
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Signal / Power Line selection tabs */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/40 text-[11px] font-sans shrink-0">
            <button
              onClick={() => { setSelectedFilter('all'); setLockedIndex(null); }}
              className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${selectedFilter === 'all' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              全部排线
            </button>
            <button
              onClick={() => { setSelectedFilter('power'); setLockedIndex(null); }}
              className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer ${selectedFilter === 'power' ? 'bg-white shadow-xs text-red-600' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Zap className="w-3 h-3 fill-current" />
              供电轨道
            </button>
            <button
              onClick={() => { setSelectedFilter('data'); setLockedIndex(null); }}
              className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer ${selectedFilter === 'data' ? 'bg-white shadow-xs text-blue-600' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Eye className="w-3 h-3" />
              数据/信号
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 hidden sm:block" />

          {/* Zoom controls and export */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/30">
              <button 
                onClick={handleZoomOut}
                className="p-1 px-2 hover:bg-white rounded transition active:scale-95 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-neutral-600 font-bold px-1.5 text-[10px] min-w-[34px] text-center">{Math.round(scale * 100)}%</span>
              <button 
                onClick={handleZoomIn}
                className="p-1 px-2 hover:bg-white rounded transition active:scale-95 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button 
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 px-3 border border-neutral-200 hover:border-neutral-900 rounded-lg active:scale-95 transition font-semibold flex items-center gap-1 cursor-pointer hover:bg-neutral-50 text-[11px]"
              title="放大预览窗口"
            >
              <Maximize2 className="w-3.5 h-3.5 text-neutral-655" />
              <span>等比放大</span>
            </button>

            <button 
              onClick={handleExportSvg}
              className="p-1.5 px-3.5 bg-neutral-950 border border-neutral-950 hover:bg-neutral-800 text-white rounded-lg active:scale-95 transition font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              导出 Vector
            </button>
          </div>
        </div>
      </div>

      {/* SVG Container Stage */}
      <div className="flex-1 w-full overflow-auto bg-neutral-950 rounded-2xl border border-neutral-900/80 relative flex items-center justify-center p-6 min-h-[380px] shadow-inner select-none">
        <div 
          style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
          className="transition-transform duration-200 ease-out"
        >
          <svg 
            id="iot-cad-svg"
            width={svgWidth} 
            height={svgHeight} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="max-w-full"
          >
            {svgContents}
          </svg>
        </div>
      </div>

      {/* Floating full-screen zoom preview with transition modal */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreen(false)}
              className="absolute inset-0 bg-neutral-950/85 backdrop-blur-lg cursor-zoom-out"
            />

            {/* Main Lightbox Board modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="relative bg-neutral-900 border border-neutral-800/80 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10"
            >
              {/* Modal Toolbar Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-b border-neutral-800 bg-neutral-900 gap-4">
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
                  <div>
                    <h3 className="font-display font-black text-white text-sm tracking-tight">智能引脚排线与仿真CAD版图</h3>
                    <p className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">High Fidelity Offline Circuit Simulation Grid</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Zoom inside modal */}
                  <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700/50">
                    <button 
                      onClick={() => setFullscreenScale(prev => Math.max(prev - 0.1, 0.7))}
                      className="p-1 px-2.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-750 transition active:scale-95"
                      title="缩小"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-neutral-300 font-bold px-2 text-xs min-w-[38px] text-center">{Math.round(fullscreenScale * 100)}%</span>
                    <button 
                      onClick={() => setFullscreenScale(prev => Math.min(prev + 0.1, 2.5))}
                      className="p-1 px-2.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-750 transition active:scale-95"
                      title="放大"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={handleExportSvg}
                    className="p-1.5 px-3 bg-neutral-800 border border-neutral-700 text-neutral-200 hover:bg-neutral-755 hover:text-white rounded-lg transition font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出 SVG Vector
                  </button>

                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-850 hover:bg-red-950 hover:border-red-800 border border-neutral-700 rounded-lg transition active:scale-95 flex items-center gap-1.5 text-xs font-bold font-sans cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    关闭预览
                  </button>
                </div>
              </div>

              {/* Scrollable large viewport */}
              <div className="flex-1 overflow-auto bg-neutral-950 p-6 flex items-center justify-center relative select-none">
                <div 
                  style={{ transform: `scale(${fullscreenScale})`, transformOrigin: 'center' }}
                  className="transition-transform duration-200 ease-out flex items-center justify-center min-w-[950px] min-h-[460px]"
                >
                  <svg 
                    id="iot-cad-svg-fullscreen"
                    width={svgWidth} 
                    height={svgHeight} 
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="shadow-2xl rounded-2xl"
                  >
                    {svgContents}
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
