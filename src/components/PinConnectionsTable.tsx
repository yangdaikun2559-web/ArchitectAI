import React from 'react';
import { PinConnection } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { AlertCircle, Zap, Eye, RotateCcw, CheckCircle2, Sliders, HelpCircle, ShieldCheck } from 'lucide-react';

interface PinConnectionsTableProps {
  connections: PinConnection[];
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  lockedIndex: number | null;
  setLockedIndex: (idx: number | null) => void;
  selectedFilter: 'all' | 'power' | 'data';
  setSelectedFilter: (filter: 'all' | 'power' | 'data') => void;
  onUpdateConnections?: (newConnections: PinConnection[]) => void;
  originalConnections?: PinConnection[];
  platform: string;
  onSelectComponent?: (compName: string) => void;
}

export const getHighContrastColor = (rawColor: string | undefined, signalType: string | undefined, toPinName: string | undefined): string => {
  const signal = (signalType || '').toUpperCase().trim();
  const toPin = (toPinName || '').toUpperCase().trim();

  if (signal === 'VCC' || toPin === 'VCC' || toPin === 'VDD' || toPin === '3V3' || toPin === '5V') {
    return '#ef4444'; // Bright Red (VCC Line)
  }
  if (signal === 'GND' || toPin === 'GND' || toPin === 'VSS') {
    return '#94a3b8'; // Silver/Slate Grey (GND Line)
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
      return '#3b82f6'; // Replace black/dark grey with highly visible blue
    }
    return rawColor;
  }
  return '#3b82f6';
};

export interface PinConflict {
  pin: string;
  isConflict: boolean;
  affectedComponents: string[];
  message: string;
}

// Function to detect pin conflicts
export const checkPinConflicts = (connections: PinConnection[]): Record<string, PinConflict> => {
  const pinMap: Record<string, PinConnection[]> = {};
  
  const isPowerOrGnd = (pinName: string) => {
    const p = pinName.toUpperCase().trim();
    return p === 'GND' || p === '3V3' || p === '5V' || p === 'V5' || p === 'VIN' || p === '3V3_R' || p === 'GND_R' || p === 'VBAT';
  };

  connections.forEach((conn) => {
    const pin = conn.fromPin.toUpperCase().trim();
    // Ignore power/gnd connections since they can safely daisy chain on common rails
    if (isPowerOrGnd(pin)) return;
    if (!pinMap[pin]) {
      pinMap[pin] = [];
    }
    pinMap[pin].push(conn);
  });

  const conflicts: Record<string, PinConflict> = {};

  Object.entries(pinMap).forEach(([pin, conns]) => {
    if (conns.length <= 1) return;

    // Check if they are all compatible I2C multi-drop channels
    const allSda = conns.every(c => c.signalType === 'I2C_SDA' || c.toPin.toUpperCase() === 'SDA');
    const allScl = conns.every(c => c.signalType === 'I2C_SCL' || c.toPin.toUpperCase() === 'SCL');

    if (allSda || allScl) {
      // Safe multi-drop bus shared, e.g. multi I2C sensors share same SDA/SCL. Not a conflict.
      return;
    }

    // Otherwise they conflict
    const affectedComponents = conns.map(c => `${c.toComponent}(${c.toPin})`);
    conflicts[pin] = {
      pin,
      isConflict: true,
      affectedComponents,
      message: `${affectedComponents.join(' 与 ')} 同时占用了该硬件引脚，且无法共享同一总线连接。`
    };
  });

  return conflicts;
};

type SafetySeverity = 'pass' | 'warn' | 'error';

interface SafetyCheckCard {
  id: string;
  title: string;
  status: SafetySeverity;
  message: string;
  details: string[];
}

const normalizePinText = (value: string | undefined) => (value || '').toUpperCase().replace(/\s+/g, '').trim();

const isPowerTarget = (pin: string) => {
  const p = normalizePinText(pin);
  return ['VCC', 'VDD', 'VIN', 'VS', '3V3', '3.3V', '5V', 'V5'].includes(p);
};

const isGroundTarget = (pin: string) => {
  const p = normalizePinText(pin);
  return p === 'GND' || p === 'VSS' || p.includes('GND');
};

const isPowerSource = (pin: string) => {
  const p = normalizePinText(pin);
  return ['3V3', '3.3V', '5V', 'V5', 'VIN', 'VBAT'].includes(p);
};

const isGroundSource = (pin: string) => normalizePinText(pin).includes('GND');

const expectedBusPins = (platform: string) => {
  const p = platform.toUpperCase();
  if (p.includes('STM32')) {
    return { sda: 'PB7', scl: 'PB6', adc: ['PA0', 'PA1', 'PB0', 'PB1'] };
  }
  if (p.includes('ESP32')) {
    return { sda: 'GPIO21', scl: 'GPIO22', adc: ['GPIO32', 'GPIO33', 'GPIO34', 'GPIO35', 'GPIO36', 'GPIO39'] };
  }
  return { sda: 'A4', scl: 'A5', adc: ['A0', 'A1', 'A2', 'A3'] };
};

export const buildWiringSafetyReport = (connections: PinConnection[], platform: string): SafetyCheckCard[] => {
  const busPins = expectedBusPins(platform);
  const powerErrors: string[] = [];
  const groundErrors: string[] = [];
  const signalErrors: string[] = [];
  const signalWarnings: string[] = [];
  const conflictMap = checkPinConflicts(connections);
  const conflictDetails = Object.values(conflictMap).map(conf => `${conf.pin}: ${conf.affectedComponents.join(' / ')}`);

  connections.forEach((conn) => {
    const fromPin = normalizePinText(conn.fromPin);
    const toPin = normalizePinText(conn.toPin);
    const signal = normalizePinText(conn.signalType);
    const label = `${conn.toComponent}:${conn.toPin} -> ${conn.fromPin}`;

    if (isPowerTarget(toPin)) {
      if (isGroundSource(fromPin)) {
        powerErrors.push(`${label}，电源端被接到了 GND，存在电源接反风险。`);
      } else if (!isPowerSource(fromPin) || signal !== 'VCC') {
        powerErrors.push(`${label}，电源端必须连接 3V3/5V/VIN 等电源引脚。`);
      }
    }

    if (isGroundTarget(toPin)) {
      if (isPowerSource(fromPin)) {
        powerErrors.push(`${label}，GND 被接到了电源端，存在电源接反风险。`);
      } else if (!isGroundSource(fromPin) || signal !== 'GND') {
        groundErrors.push(`${label}，地线端必须连接主控 GND。`);
      }
    }

    if (!isPowerTarget(toPin) && !isGroundTarget(toPin)) {
      if (toPin === 'SDA' && (signal !== 'I2C_SDA' || fromPin !== busPins.sda)) {
        signalErrors.push(`${label}，SDA 应连接到 ${busPins.sda} 并标记为 I2C_SDA。`);
      }
      if (toPin === 'SCL' && (signal !== 'I2C_SCL' || fromPin !== busPins.scl)) {
        signalErrors.push(`${label}，SCL 应连接到 ${busPins.scl} 并标记为 I2C_SCL。`);
      }
      if ((toPin === 'TX' || toPin === 'TXD') && signal !== 'UART_RX') {
        signalErrors.push(`${label}，外设 TX 应接主控 RX，信号类型应为 UART_RX。`);
      }
      if ((toPin === 'RX' || toPin === 'RXD') && signal !== 'UART_TX') {
        signalErrors.push(`${label}，外设 RX 应接主控 TX，信号类型应为 UART_TX。`);
      }
      if ((toPin === 'A0' || toPin.includes('ADC')) && (signal !== 'ADC' || !busPins.adc.includes(fromPin))) {
        signalWarnings.push(`${label}，模拟量建议接入 ADC 引脚：${busPins.adc.join('、')}。`);
      }
    }
  });

  const components = Array.from(new Set(connections.map(c => c.toComponent).filter(Boolean)));
  components.forEach((component) => {
    const hasGround = connections.some(conn => conn.toComponent === component && isGroundTarget(conn.toPin) && isGroundSource(conn.fromPin));
    if (!hasGround) {
      groundErrors.push(`${component} 缺少有效 GND 连接，可能没有与主控共地。`);
    }
  });

  return [
    {
      id: 'power',
      title: '电源极性',
      status: powerErrors.length > 0 ? 'error' : 'pass',
      message: powerErrors.length > 0 ? '发现 VCC/GND 接反或电源端接错。' : 'VCC/VDD/5V 与 GND 极性检查通过。',
      details: powerErrors,
    },
    {
      id: 'ground',
      title: '共地完整性',
      status: groundErrors.length > 0 ? 'error' : 'pass',
      message: groundErrors.length > 0 ? '存在外设缺少有效 GND 或地线接错。' : '所有外设均检测到有效 GND，共地关系完整。',
      details: groundErrors,
    },
    {
      id: 'signal',
      title: '信号线匹配',
      status: signalErrors.length > 0 ? 'error' : signalWarnings.length > 0 ? 'warn' : 'pass',
      message: signalErrors.length > 0 ? '发现总线或信号语义接错。' : signalWarnings.length > 0 ? '信号线可用，但存在教学提醒。' : 'SDA/SCL、UART、ADC 等信号类型匹配通过。',
      details: [...signalErrors, ...signalWarnings],
    },
    {
      id: 'conflict',
      title: '引脚冲突',
      status: conflictDetails.length > 0 ? 'error' : 'pass',
      message: conflictDetails.length > 0 ? '发现多个非总线信号占用同一 MCU 引脚。' : '未发现非总线引脚冲突，I2C 共享规则已放行。',
      details: conflictDetails,
    },
  ];
};

export const PinConnectionsTable: React.FC<PinConnectionsTableProps> = ({
  connections = [],
  hoveredIndex,
  setHoveredIndex,
  lockedIndex,
  setLockedIndex,
  selectedFilter,
  onUpdateConnections,
  originalConnections,
  platform,
  onSelectComponent,
}) => {
  const { lang, t } = useLanguage();
  const isESP32 = platform.toUpperCase().includes('ESP32');

  // Standard selectable physical IO lists in order of layout
  const ESP32_PINS = [
    'GPIO21', 'GPIO22', 'GPIO23', 'GPIO4', 'GPIO2', 'GPIO15', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO16', 'GPIO17', 'GPIO18', 'GPIO19', 'GPIO25', 'GPIO26', 'GPIO27', 'GPIO32', 'GPIO33', 'GPIO34', 'GPIO35', 'GPIO36', 'GPIO39',
    '3V3', 'GND', 'V5'
  ];

  const STM32_PINS = [
    'PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7', 'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15',
    'PB0', 'PB1', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7', 'PB8', 'PB9', 'PB10', 'PB11', 'PB12', 'PB13', 'PB14', 'PB15',
    'PC13', 'PC14', 'PC15',
    '3V3', 'GND', '5V'
  ];

  const availablePins = isESP32 ? ESP32_PINS : STM32_PINS;

  // Run validation
  const conflicts = checkPinConflicts(connections);
  const conflictCount = Object.keys(conflicts).length;
  const safetyReport = buildWiringSafetyReport(connections, platform);
  const safetyErrorCount = safetyReport.filter(item => item.status === 'error').length;
  const safetyWarnCount = safetyReport.filter(item => item.status === 'warn').length;
  const safetyPassed = safetyErrorCount === 0 && safetyWarnCount === 0;

  const handlePinChange = (indexToUpdate: number, newPin: string) => {
    if (!onUpdateConnections) return;
    const updated = connections.map((c, idx) => {
      if (idx === indexToUpdate) {
        return { ...c, fromPin: newPin };
      }
      return c;
    });
    onUpdateConnections(updated);
  };

  const hasEdits = originalConnections && 
    JSON.stringify(connections.map(c => c.fromPin)) !== JSON.stringify(originalConnections.map(c => c.fromPin));

  return (
    <div className="border border-neutral-200/60 rounded-2xl bg-white p-6 shadow-sm mt-6 relative select-none">
      <style>{`
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.1); }
          50% { border-color: rgba(239, 68, 68, 0.9); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.25); }
        }
        .conflict-glow-red {
          animation: borderPulse 1.6s infinite ease-in-out;
        }
      `}</style>

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4 mb-4 gap-3">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${safetyErrorCount > 0 ? 'bg-red-500 animate-ping' : safetyWarnCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-blue-600 animate-pulse'}`} />
            {t('tuningTable')}
          </h3>
          <p className="text-[10px] text-neutral-450 font-medium">{t('tuningDesc')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasEdits && (
            <button
              onClick={() => onUpdateConnections?.(originalConnections)}
              className="px-3 py-1.5 text-xs font-black text-blue-600 hover:text-blue-755 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title={lang === 'zh' ? '复原到由 AI 智能生成时的初始电路' : 'Restore original schematic generated by AI'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('restoreBtn')}</span>
            </button>
          )}

          <span className="text-neutral-400 font-mono text-[9px] font-bold uppercase tracking-widest hidden md:inline bg-neutral-50 px-2 py-1 rounded-md border">
            {lang === 'zh' ? '严格冲突检测激活' : 'STRICT CONFLICT CHECK ACTIVE'}
          </span>
        </div>
      </div>

      {/* Wiring safety report for classroom demonstration and screenshot evidence */}
      <div className={`mb-4 rounded-xl border p-4 shadow-inner ${
        safetyErrorCount > 0
          ? 'bg-red-50/80 border-red-200 ring-4 ring-red-50/50'
          : safetyWarnCount > 0
            ? 'bg-amber-50/80 border-amber-200 ring-4 ring-amber-50/50'
            : 'bg-emerald-50/70 border-emerald-200 ring-4 ring-emerald-50/40'
      }`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
          <div className="flex items-center gap-2">
            {safetyPassed ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className={`w-5 h-5 shrink-0 ${safetyErrorCount > 0 ? 'text-red-600 animate-bounce' : 'text-amber-600'}`} />
            )}
            <div>
              <div className={`text-sm font-black tracking-tight ${safetyPassed ? 'text-emerald-800' : safetyErrorCount > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                接线安全体检：{safetyPassed ? '全部通过' : safetyErrorCount > 0 ? `发现 ${safetyErrorCount} 类错误` : `发现 ${safetyWarnCount} 类提醒`}
              </div>
              <div className={`text-[11px] font-medium ${safetyPassed ? 'text-emerald-700' : safetyErrorCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                覆盖电源接反、没有共地、信号线接错和引脚冲突四类课堂常见错误。
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
            safetyPassed ? 'bg-white/80 text-emerald-700 border-emerald-200' : safetyErrorCount > 0 ? 'bg-white/80 text-red-700 border-red-200' : 'bg-white/80 text-amber-700 border-amber-200'
          }`}>
            LIVE WIRING CHECK
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {safetyReport.map((item) => {
            const colorClass = item.status === 'error'
              ? 'border-red-200 bg-white text-red-700'
              : item.status === 'warn'
                ? 'border-amber-200 bg-white text-amber-700'
                : 'border-emerald-200 bg-white text-emerald-700';
            return (
              <div key={item.id} className={`rounded-lg border p-3 min-h-[108px] ${colorClass}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {item.status === 'pass' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : item.status === 'warn' ? (
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="text-xs font-black">{item.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed font-semibold text-neutral-700">{item.message}</p>
                {item.details.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[10px] leading-relaxed font-mono text-neutral-600">
                    {item.details.slice(0, 2).map((detail, idx) => (
                      <li key={idx} className="rounded bg-neutral-50 border border-neutral-100 p-1.5">{detail}</li>
                    ))}
                    {item.details.length > 2 && (
                      <li className="text-neutral-400 font-bold">还有 {item.details.length - 2} 条...</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active High-Contrast Red Warning Banner */}
      {conflictCount > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-red-50/80 border border-red-200/60 text-red-700 text-xs flex flex-col gap-2 shadow-inner ring-4 ring-red-50/40">
          <div className="flex items-center gap-2 font-bold select-none">
            <AlertCircle className="w-5 h-5 text-red-500 animate-bounce shrink-0" />
            <span className="font-extrabold text-[12.5px] uppercase tracking-wide">⚠️ {t('conflictWarn')}</span>
          </div>
          <div className="text-red-650 leading-relaxed font-semibold pl-1">
            {t('conflictDesc')}
          </div>
          <ul className="list-disc list-inside space-y-1 pl-2 text-red-650 font-mono text-[11px] leading-relaxed">
            {Object.entries(conflicts).map(([pin, conf], idx) => (
              <li key={idx} className="bg-white/80 p-2 rounded-lg border border-red-200/40 shadow-2xs">
                {lang === 'zh' ? `【引脚 ${pin}】: ${conf.message}` : `[Pin ${pin}]: ${conf.message}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Connection mapper table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-150">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-neutral-200/50 text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest bg-neutral-50/70">
              <th className="py-3 pl-4 w-[160px]">{t('mcuPin')}</th>
              <th className="py-3">{t('peripheral')}</th>
              <th className="py-3 w-[120px]">{t('peripheralPin')}</th>
              <th className="py-3 w-[110px]">{t('signalType')}</th>
              <th className="py-3 w-[140px]">{t('wireColor')}</th>
              <th className="py-3 pr-4">{t('collisionTuning')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs">
            {connections.map((conn, index) => {
              const matchesFilter = (() => {
                const isPower = conn.signalType === 'VCC' || conn.signalType === 'GND' || conn.toPin.toUpperCase().includes('VCC') || conn.toPin.toUpperCase().includes('GND') || conn.fromPin.toUpperCase().includes('3V3') || conn.fromPin.toUpperCase().includes('5V') || conn.fromPin.toUpperCase().includes('GND');
                if (selectedFilter === 'power') return isPower;
                if (selectedFilter === 'data') return !isPower;
                return true;
              })();

              if (!matchesFilter) return null;

              const isHovered = hoveredIndex === index;
              const isLocked = lockedIndex === index;
              const resolvedColor = getHighContrastColor(conn.color, conn.signalType, conn.toPin);
              
              const currentPinUpper = conn.fromPin.toUpperCase().trim();
              const isConflict = !!conflicts[currentPinUpper];
              const conflictDetail = conflicts[currentPinUpper];

              let rowBorderColor = 'transparent';
              if (isHovered || isLocked) {
                rowBorderColor = resolvedColor;
              }

              // Ensure the select option list includes the active selection in case it's custom
              const pinsForSelect = Array.from(new Set([conn.fromPin, ...availablePins]));

              return (
                <tr 
                  key={index} 
                  className={`hover:bg-neutral-50/60 transition-colors cursor-pointer ${
                    isHovered || isLocked ? 'bg-neutral-50 font-medium' : ''
                  } ${isConflict ? 'bg-red-50/30' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setLockedIndex(isLocked ? null : index)}
                >
                  {/* Select dropdown element cell */}
                  <td className="py-3 pl-4 border-l-3" style={{ borderLeftColor: rowBorderColor }}>
                    <div className="flex items-center">
                      <select
                        value={conn.fromPin}
                        onChange={(e) => {
                          e.stopPropagation();
                          handlePinChange(index, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`font-mono font-bold text-xs rounded px-2.5 py-1.5 border transition-all cursor-pointer outline-none ${
                          isConflict 
                            ? 'conflict-glow-red text-red-700 bg-red-50 border-red-500' 
                            : 'border-neutral-250 bg-neutral-50/80 text-neutral-800 hover:border-neutral-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                        title={lang === 'zh' ? '点击展开选择其他的物理引脚物理映射' : 'Click to select physical pins mapping'}
                      >
                        {pinsForSelect.map(pinOption => (
                          <option key={pinOption} value={pinOption}>
                            {pinOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  
                  <td className="py-2.5 text-slate-700 font-bold tracking-tight">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComponent?.(conn.toComponent);
                      }}
                      className="cursor-pointer hover:text-blue-600 hover:underline inline-flex items-center gap-1.5 transition-colors"
                      title={lang === 'zh' ? '点击查看该元器件百科科普' : 'Click to view component wiki'}
                    >
                      {conn.toComponent}
                      <HelpCircle className="w-3.5 h-3.5 text-neutral-400 hover:text-blue-500 transition-colors" />
                    </span>
                  </td>
                  
                  <td className="py-2.5">
                    <span className="font-mono text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md shadow-sm">
                      {conn.toPin}
                    </span>
                  </td>
                  
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      conn.signalType === 'VCC' ? 'bg-red-50 text-red-700 border border-red-100' :
                      conn.signalType === 'GND' ? 'bg-neutral-100 text-neutral-800 border border-neutral-200' :
                      (conn.signalType && conn.signalType.includes('I2C')) ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      conn.signalType === 'ADC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {conn.signalType || 'GPIO'}
                    </span>
                  </td>
                  
                  <td className="py-2.5 font-mono text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-xs shrink-0" style={{ backgroundColor: resolvedColor }} />
                      <span className="text-neutral-500 font-bold">{resolvedColor}</span>
                    </div>
                  </td>

                  {/* Physical Description with specific detailed live warning */}
                  <td className="py-2.5 pr-4 text-neutral-500 text-xs font-normal">
                    {isConflict ? (
                      <div className="flex items-start gap-1 text-red-600 bg-red-50/50 p-2 rounded border border-red-150 animate-pulse-slow font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span>{t('conflictMessage')} </span>
                          <span className="underline font-mono font-bold text-red-700">
                            {conflictDetail?.affectedComponents.filter(c => !c.includes(conn.toPin)).join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span>{conn.description || `${t('defaultPinDesc')} (MCU ${conn.fromPin} ➔ ${conn.toComponent}:${conn.toPin})`}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
