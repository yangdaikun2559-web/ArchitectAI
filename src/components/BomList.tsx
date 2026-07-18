import React from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { PinConnection, ComponentItem } from '../types';
import { Download, Copy, ExternalLink, ShoppingCart, Info, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BomListProps {
  platform: string;
  connections: PinConnection[];
  components?: ComponentItem[];
  onSelectComponent?: (compName: string) => void;
}

interface BomItem {
  id: string;
  name: string;
  cNumber: string;
  spec: string;
  qty: number;
  price: number;
  category: 'mcu' | 'sensor' | 'display' | 'alert' | 'actuator' | 'other';
  designator: string;
}

export const BomList: React.FC<BomListProps> = ({ platform, connections = [], components = [], onSelectComponent }) => {
  const { lang, t } = useLanguage();

  // Mapping dict of LCSC part numbers (C numbers), specifications, and approximate unit prices in CNY
  const LCSC_MAPPING: Record<string, { cNumber: string; spec: string; price: number; category: BomItem['category'] }> = {
    'ESP32': { cNumber: 'C701342', spec: 'ESP32-WROOM-32E (4MB)', price: 15.20, category: 'mcu' },
    'STM32': { cNumber: 'C22396880', spec: '立创开发板 LCKFB-DKX-STM32F103C8T6 开发板', price: 11.46, category: 'mcu' },
    'DHT22': { cNumber: 'C168349', spec: 'DHT22 温湿度传感器 (单总线)', price: 11.80, category: 'sensor' },
    'DHT11': { cNumber: 'C276685', spec: 'DHT11 温湿度传感器', price: 4.80, category: 'sensor' },
    'SGP30': { cNumber: 'C181261', spec: 'SGP30 TVOC/eCO2 气体传感器', price: 38.00, category: 'sensor' },
    'SSD1306': { cNumber: 'C2843075', spec: 'OLED 128x64 0.96寸 I2C 蓝屏', price: 8.50, category: 'display' },
    'OLED': { cNumber: 'C2843075', spec: 'OLED 128x64 0.96寸 I2C 蓝屏', price: 8.50, category: 'display' },
    'LCD1602': { cNumber: 'C348123', spec: '1602 LCD 字符液晶屏 (带I2C转接板)', price: 9.80, category: 'display' },
    'BUZZER': { cNumber: 'C96556', spec: '有源蜂鸣器 5V 9.5*5.5', price: 0.80, category: 'alert' },
    'RELAY': { cNumber: 'C31950', spec: '5V 单路电磁继电器 SRD-05VDC-SL-C', price: 2.80, category: 'actuator' },
    'MPU6050': { cNumber: 'C24112', spec: 'MPU-6050 六轴陀螺仪加速度计', price: 6.50, category: 'sensor' },
    'ESP8266': { cNumber: 'C82899', spec: 'ESP8266 Wi-Fi 芯片 ESP-01S', price: 6.20, category: 'other' },
    'MQ-2': { cNumber: 'C78819', spec: 'MQ-2 气体烟雾传感器', price: 5.80, category: 'sensor' },
    'MQ2': { cNumber: 'C78819', spec: 'MQ-2 气体烟雾传感器', price: 5.80, category: 'sensor' },
    'BH1750': { cNumber: 'C78832', spec: 'BH1750FVI 数字光照强度传感器', price: 4.50, category: 'sensor' },
    'BME280': { cNumber: 'C94951', spec: 'BME280 温度/湿度/气压传感器', price: 15.00, category: 'sensor' },
    'DS18B20': { cNumber: 'C2860641', spec: 'DS18B20 18B20 TO-92 温度传感器', price: 6.00, category: 'sensor' },
    'HC-SR04': { cNumber: 'C19857336', spec: 'HC-SR04 超声波测距传感器模块', price: 33.98, category: 'sensor' },
    'ULTRASONIC': { cNumber: 'C19857336', spec: 'HC-SR04 超声波测距传感器模块', price: 33.98, category: 'sensor' },
    'HC-SR501': { cNumber: 'C144211', spec: 'HC-SR501 人体红外感应模块', price: 4.00, category: 'sensor' },
    'PIR': { cNumber: 'C144211', spec: 'HC-SR501 人体红外感应模块', price: 4.00, category: 'sensor' },
    'YL-69': { cNumber: 'C78822', spec: 'YL-69 土壤湿度检测传感器模块', price: 3.00, category: 'sensor' },
    'SOIL': { cNumber: 'C78822', spec: 'YL-69 土壤湿度检测传感器模块', price: 3.00, category: 'sensor' },
    'RC522': { cNumber: 'C85834', spec: 'RC522 RFID 射频卡读卡器模块', price: 8.50, category: 'sensor' },
    'ST7735': { cNumber: 'C5329581', spec: 'ST7735 1.77寸彩色 TFT 液晶屏模块', price: 14.00, category: 'display' },
    'TM1637': { cNumber: 'C48632', spec: 'TM1637 四位数码管显示模块', price: 3.50, category: 'display' },
    'MAX7219': { cNumber: 'C91949', spec: 'MAX7219 8x8 LED点阵模块', price: 5.50, category: 'display' },
    'WS2812B': { cNumber: 'C114586', spec: 'WS2812B 幻彩 LED 灯珠', price: 6.00, category: 'actuator' },
    'L298N': { cNumber: 'C91949', spec: 'L298N 双路直流电机驱动板', price: 7.50, category: 'actuator' },
    'ULN2003': { cNumber: 'C276685', spec: 'ULN2003 步进电机驱动板', price: 3.00, category: 'actuator' },
    'SG90': { cNumber: '-', spec: 'SG90 舵机模块 (立创无现货，建议前往淘宝/拼多多采购)', price: 4.50, category: 'actuator' },
    'HC-05': { cNumber: '-', spec: 'HC-05 蓝牙串口透传模块 (立创无现货，建议前往淘宝/拼多多采购)', price: 12.00, category: 'other' },
  };

  const getKeywordMatch = (name: string) => {
    const cleanName = name.toUpperCase().replace(/[\s_\-\/\"]/g, '');
    for (const key in LCSC_MAPPING) {
      const cleanKey = key.toUpperCase().replace(/[\s_\-\/\"]/g, '');
      if (cleanName.includes(cleanKey)) {
        return LCSC_MAPPING[key];
      }
    }
    return null;
  };

  // 1. Resolve MCU Platform BOM item
  const bomItems: BomItem[] = [];
  const normalizedPlatform = platform.toUpperCase();
  let mcuItem: BomItem | null = null;

  if (normalizedPlatform.includes('ESP32')) {
    mcuItem = {
      id: 'mcu',
      name: 'ESP32 开发芯片',
      cNumber: LCSC_MAPPING['ESP32'].cNumber,
      spec: LCSC_MAPPING['ESP32'].spec,
      qty: 1,
      price: LCSC_MAPPING['ESP32'].price,
      category: 'mcu',
      designator: 'U1',
    };
  } else if (normalizedPlatform.includes('STM32')) {
    mcuItem = {
      id: 'mcu',
      name: 'STM32F103 开发板',
      cNumber: LCSC_MAPPING['STM32'].cNumber,
      spec: LCSC_MAPPING['STM32'].spec,
      qty: 1,
      price: LCSC_MAPPING['STM32'].price,
      category: 'mcu',
      designator: 'U1',
    };
  } else {
    // Default fallback MCU
    mcuItem = {
      id: 'mcu',
      name: platform,
      cNumber: '',
      spec: `${platform} 核心主控板`,
      qty: 1,
      price: 10.00,
      category: 'mcu',
      designator: 'U1',
    };
  }

  if (mcuItem) bomItems.push(mcuItem);

  // 2. Resolve Peripherals from connections
  const uniquePeripherals = new Set<string>();
  connections.forEach(conn => {
    const comp = conn.toComponent;
    if (!comp) return;
    const compUpper = comp.toUpperCase();
    // Skip MCU board references in connections
    if (
      compUpper.includes('DEVKIT') ||
      compUpper.includes('MCU') ||
      compUpper.includes('STM32') ||
      compUpper.includes('ESP32') ||
      compUpper === '主芯片' ||
      compUpper === 'BLUEPILL'
    ) {
      return;
    }
    uniquePeripherals.add(comp);
  });

  let designatorIndex = 1;
  uniquePeripherals.forEach(comp => {
    const match = getKeywordMatch(comp);
    const registryComp = components.find(c => c.name.toLowerCase().includes(comp.toLowerCase()));
    
    // Auto designator prefix based on category
    let prefix = 'SEN';
    if (registryComp?.category === 'Display') prefix = 'DISP';
    else if (registryComp?.category === 'Alert') prefix = 'AL';
    else if (registryComp?.category === 'Actuator') prefix = 'ACT';
    
    const designator = `${prefix}${designatorIndex++}`;

    if (match) {
      bomItems.push({
        id: `comp_${comp}`,
        name: comp,
        cNumber: match.cNumber,
        spec: match.spec,
        qty: 1,
        price: match.price,
        category: match.category,
        designator,
      });
    } else {
      // Unmapped generic component
      let category: BomItem['category'] = 'other';
      if (registryComp?.category === 'Sensor') category = 'sensor';
      else if (registryComp?.category === 'Display') category = 'display';
      else if (registryComp?.category === 'Alert') category = 'alert';
      else if (registryComp?.category === 'Actuator') category = 'actuator';

      bomItems.push({
        id: `comp_${comp}`,
        name: comp,
        cNumber: '-',
        spec: (registryComp?.description || '通用外设模块') + ' (立创商城无现货，请直接前往淘宝/拼多多采购模块)',
        qty: 1,
        price: 5.00,
        category,
        designator,
      });
    }
  });

  const totalCost = bomItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  // 3. Export Jialichuang compliant CSV
  const handleExportCsv = () => {
    // Columns formatted for SZLCSC BOM Import tool
    const headers = ['立创商品编号', '器件名称', '规格型号', '数量', '设计位号'];
    const rows = bomItems.map(item => [
      item.cNumber || '',
      item.name,
      item.spec,
      item.qty,
      item.designator,
    ]);

    // Use BOM standard BOM character set (utf-8 with BOM signature for Excel auto-formatting)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${platform.replace(/\s+/g, '_')}_LCSC_BOM.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Copy Shopping List text helper
  const handleCopyList = () => {
    let text = `【立创商城元器件采购清单 - ${platform} 项目】\n`;
    text += `生成时间: ${new Date().toLocaleDateString()}\n`;
    text += `估算总价: ¥${totalCost.toFixed(2)}\n`;
    text += `-------------------------------------------\n`;
    
    bomItems.forEach((item, idx) => {
      const cStr = item.cNumber ? ` (立创编号: ${item.cNumber})` : ' (请自行在立创搜索型号)';
      text += `${idx + 1}. ${item.name} | 规格: ${item.spec}${cStr} | 数量: ${item.qty} | 估算价: ¥${item.price.toFixed(2)}\n`;
    });
    
    text += `-------------------------------------------\n`;
    text += `请下载 BOM CSV 并上传到立创商城 (https://bom.szlcsc.com/) 打包购买。`;

    navigator.clipboard.writeText(text);
    alert(t('bomCopySuccess'));
  };

  const getCategoryLabel = (category: BomItem['category']) => {
    if (lang === 'zh') {
      switch (category) {
        case 'mcu': return '核心芯片/开发板';
        case 'sensor': return '传感器模块';
        case 'display': return '显示模组';
        case 'alert': return '报警执行设备';
        case 'actuator': return '电控执行模块';
        default: return '外设配件';
      }
    } else {
      switch (category) {
        case 'mcu': return 'MCU Board';
        case 'sensor': return 'Sensor';
        case 'display': return 'Display';
        case 'alert': return 'Alert';
        case 'actuator': return 'Actuator';
        default: return 'Others';
      }
    }
  };

  if (bomItems.length === 0) return null;

  return (
    <div className="border border-neutral-100 rounded-2xl bg-white p-6 shadow-sm flex flex-col h-full bg-linear-to-b from-white to-neutral-50/20 mt-6">
      
      {/* Header and description */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-neutral-100 pb-5 mb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-neutral-800" />
            <h3 className="font-display font-bold text-neutral-900 text-sm tracking-tight">
              {t('bomTabTitle')}
            </h3>
          </div>
          <p className="text-neutral-500 text-[11px] leading-relaxed font-sans max-w-2xl">
            {t('bomTabDesc')}
          </p>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleCopyList}
            className="p-2 px-3 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-800 rounded-xl transition flex items-center gap-1.5 font-bold cursor-pointer bg-white"
          >
            <Copy className="w-3.5 h-3.5" />
            {t('bomCopyBtn')}
          </button>
          
          <button
            onClick={handleExportCsv}
            className="p-2 px-3.5 bg-neutral-950 border border-neutral-950 hover:bg-neutral-800 text-white rounded-xl active:scale-95 transition font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t('bomExportBtn')}
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto border border-neutral-200/50 rounded-xl">
        <table className="min-w-full divide-y divide-neutral-150 text-[11px] font-sans">
          <thead className="bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left w-12">#</th>
              <th scope="col" className="px-4 py-3 text-left">{t('bomItemName')}</th>
              <th scope="col" className="px-4 py-3 text-left">{t('bomCNumber')}</th>
              <th scope="col" className="px-4 py-3 text-left">规格描述 / 型号</th>
              <th scope="col" className="px-4 py-3 text-center w-20">{t('bomQuantity')}</th>
              <th scope="col" className="px-4 py-3 text-right w-24">{t('bomPrice')}</th>
              <th scope="col" className="px-4 py-3 text-center w-24">{t('bomAction')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100 text-neutral-800">
            {bomItems.map((item, idx) => (
              <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                <td className="px-4 py-3.5 font-mono text-neutral-400">{item.designator}</td>
                <td className="px-4 py-3.5">
                  <div 
                    onClick={() => onSelectComponent?.(item.name)}
                    className="font-semibold text-neutral-850 cursor-pointer hover:text-blue-600 hover:underline inline-flex items-center gap-1.5 transition-colors"
                    title={lang === 'zh' ? '点击查看该元器件百科科普' : 'Click to view component wiki'}
                  >
                    {item.name}
                    <Info className="w-3.5 h-3.5 text-neutral-400 hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-[9px] text-neutral-400 uppercase font-mono mt-0.5 block">{getCategoryLabel(item.category)}</span>
                </td>
                <td className="px-4 py-3.5 font-mono">
                  {item.cNumber && item.cNumber !== '-' ? (
                    <span className="bg-blue-50 text-blue-800 text-[10px] px-1.5 py-0.5 rounded border border-blue-150 font-bold">
                      {item.cNumber}
                    </span>
                  ) : item.cNumber === '-' ? (
                    <span className="bg-orange-50 text-orange-800 text-[10px] px-1.5 py-0.5 rounded border border-orange-200 font-bold inline-flex items-center gap-1 shadow-sm">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {lang === 'zh' ? '无现货：建议淘宝' : 'Buy Locally'}
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-150 font-medium inline-flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {lang === 'zh' ? '立创未匹配' : 'Unmatched'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-neutral-500 font-medium">{item.spec}</td>
                <td className="px-4 py-3.5 font-mono text-center font-bold text-neutral-900">{item.qty}</td>
                <td className="px-4 py-3.5 font-mono text-right font-bold text-neutral-850">
                  ¥{(item.price * item.qty).toFixed(2)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  {item.cNumber && item.cNumber !== '-' ? (
                    <a
                      href={`https://search.szlcsc.com/search?keyword=${item.cNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition font-semibold flex items-center justify-center gap-1 cursor-pointer mx-auto border border-blue-200/50 text-[10px] w-fit"
                    >
                      <span>立创直达</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : item.cNumber === '-' ? (
                    <span className="p-1 px-2.5 bg-neutral-50 text-neutral-400 rounded-md font-semibold flex items-center justify-center gap-1 mx-auto border border-neutral-200 text-[10px] w-fit">
                      自行采购
                    </span>
                  ) : (
                    <a
                      href={`https://search.szlcsc.com/search?keyword=${encodeURIComponent(item.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md transition font-semibold flex items-center justify-center gap-1 cursor-pointer mx-auto border border-neutral-300/50 text-[10px] w-fit"
                    >
                      <span>立创搜索</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {/* Total Budget Summary Row */}
            <tr className="bg-neutral-50/50">
              <td colSpan={5} className="px-4 py-4 text-right font-bold text-neutral-700 uppercase tracking-wide">
                {lang === 'zh' ? '预计元器件总花费 (不含运费)：' : 'Est. Components Subtotal (Excl. Shipping):'}
              </td>
              <td className="px-4 py-4 text-right font-mono font-black text-xs text-neutral-900 border-t border-neutral-200">
                ¥{totalCost.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* LCSC online BOM tool helper guide */}
      <div className="mt-4 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-neutral-600 text-[10.5px] font-sans leading-relaxed">
          <div className="font-bold text-emerald-800 text-[11px]">
            {lang === 'zh' ? '立创在线一键配单指南 (One-click BOM procurement)' : 'JLCPCB/LCSC BOM Procurement Guide'}
          </div>
          <div>
            {lang === 'zh' ? (
              <>
                本 BOM 单已针对立创商城在线工具进行优化。打包采购流程：
                <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-neutral-500 text-[10px]">
                  <li>点击上方按钮 <b className="text-neutral-700">【导出立创 BOM (CSV)】</b> 保存文件。</li>
                  <li>点击前往 <a href="https://bom.szlcsc.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-900 underline font-bold inline-flex items-center gap-0.5">立创在线 BOM 配单工具平台 <ExternalLink className="w-3 h-3" /></a>。</li>
                  <li>在立创页面点击 <b className="text-neutral-700">“导入BOM/上传文件”</b>，选中刚刚下载的 CSV 文件。</li>
                  <li>立创配单系统会根据 C商品编号 100% 自动精确配齐，您可以一键打包全部加入购物车合并结账。</li>
                </ol>
              </>
            ) : (
              <>
                The exported CSV is fully optimized for Jialichuang online BOM import:
                <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-neutral-500 text-[10px]">
                  <li>Click <b className="text-neutral-700">【Export LCSC BOM (CSV)】</b> to download the BOM file.</li>
                  <li>Visit the <a href="https://bom.szlcsc.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-900 underline font-bold inline-flex items-center gap-0.5">LCSC Online BOM Importer <ExternalLink className="w-3 h-3" /></a>.</li>
                  <li>Click <b className="text-neutral-700">"Upload File / Import BOM"</b> and select the downloaded CSV file.</li>
                  <li>LCSC will match components automatically by LCSC Part Number. Add all to cart with a single click.</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
