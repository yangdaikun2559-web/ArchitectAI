import type { PinConnection, ComponentItem } from '../types';

export interface ResolveComponentsInput {
  allComps: ComponentItem[];
  ragComps?: ComponentItem[];
  optimizedPrompt?: string;
  recommendedSensors?: string;
  recommendedDisplays?: string;
  recommendedAlerts?: string;
  recommendedNetwork?: string;
  recommendedPower?: string;
}

export interface RequiredComponentGap {
  component: ComponentItem;
  reason: string;
}

const ALIASES: Record<string, string[]> = {
  DHT: ['dht22', 'dht 22', 'am2302', '温湿度', '温度湿度', '湿度传感器', 'temperature humidity'],
  MQ2: ['mq2', 'mq-2', 'mq 2', '烟雾', '气体', '燃气', '空气质量', 'gas sensor', 'smoke'],
  OLED: ['oled', 'ssd1306', '0.96寸', '0.96', '显示屏', '屏幕', '液晶屏', 'display'],
  BUZZER: ['buzzer', '蜂鸣器', '报警器', '声光报警', '报警'],
  ESP8266: ['esp8266', 'esp-01s', 'esp01s', 'wifi模块', 'wi-fi模块', 'wifi 模块', '联网', 'mqtt', '远程查看', '无线网络'],
  SGP30: ['sgp30', 'tvoc', 'eco2', '挥发性有机物'],
  LCD: ['lcd1602', '1602', 'lcd'],
};

export function normalizeHardwareText(value: string | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[\s_\-\/\\（）()，,。:：+·"'`]/g, '');
}

function componentTerms(comp: ComponentItem): string[] {
  const terms = [comp.name, comp.macroPrefix || ''];
  const prefix = (comp.macroPrefix || '').toUpperCase();
  if (prefix && ALIASES[prefix]) {
    terms.push(...ALIASES[prefix]);
  }
  return terms.map(normalizeHardwareText).filter(Boolean);
}

function roleTextFor(comp: ComponentItem, input: ResolveComponentsInput): string {
  if (comp.category === 'Sensor') {
    return [input.recommendedSensors, input.optimizedPrompt].filter(Boolean).join(' ');
  }
  if (comp.category === 'Display') {
    return [input.recommendedDisplays, input.optimizedPrompt].filter(Boolean).join(' ');
  }
  if (comp.category === 'Alert' || comp.category === 'Actuator') {
    return [input.recommendedAlerts, input.optimizedPrompt].filter(Boolean).join(' ');
  }
  if (comp.category === 'Other') {
    return [input.recommendedNetwork, input.optimizedPrompt].filter(Boolean).join(' ');
  }
  return [input.recommendedPower, input.optimizedPrompt].filter(Boolean).join(' ');
}

function isMentionedInText(comp: ComponentItem, text: string): boolean {
  const normalizedText = normalizeHardwareText(text);
  if (!normalizedText) return false;
  return componentTerms(comp).some(term => normalizedText.includes(term));
}

export function resolveComponentsFromFullCatalog(input: ResolveComponentsInput): ComponentItem[] {
  const selected = new Map<string, ComponentItem>();

  for (const comp of input.allComps) {
    if (!comp.active) continue;
    if (isMentionedInText(comp, roleTextFor(comp, input))) {
      selected.set(comp.id, comp);
    }
  }

  return [...selected.values()];
}

export function mergeRagAndResolvedComponents(ragComps: ComponentItem[] = [], resolvedComps: ComponentItem[] = []): ComponentItem[] {
  const merged = new Map<string, ComponentItem>();
  for (const comp of ragComps) {
    if (comp.active) merged.set(comp.id, comp);
  }
  for (const comp of resolvedComps) {
    if (comp.active) merged.set(comp.id, comp);
  }
  return [...merged.values()];
}

export function findMissingRequiredComponents(
  selectedComps: ComponentItem[],
  connections: PinConnection[] = []
): RequiredComponentGap[] {
  const connectedNames = connections.map(conn => normalizeHardwareText(conn.toComponent)).filter(Boolean);

  return selectedComps
    .filter(comp => comp.cadLayout?.pins?.length)
    .filter(comp => {
      const terms = componentTerms(comp);
      return !terms.some(term => connectedNames.some(name => name.includes(term) || term.includes(name)));
    })
    .map(component => ({
      component,
      reason: `推荐器件 "${component.name}" 未出现在接线图 connections 中。`
    }));
}
