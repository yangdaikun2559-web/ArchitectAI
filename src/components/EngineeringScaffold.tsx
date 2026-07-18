import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, MessageSquareText, Send, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { ClassRoom, IoTProject, LearningQuestion, LearningSubmission } from '../types';

type StepId =
  | 'requirement'
  | 'components'
  | 'interfaces'
  | 'wiring'
  | 'safety'
  | 'code'
  | 'export'
  | 'reflection';

interface LearningStep {
  id: StepId;
  index: string;
  title: string;
  task: string;
  prompts: string[];
  rubric: string;
  teacherFocus: string;
}

interface StepAnswer {
  responses: string[];
  completed: boolean;
  updatedAt?: string;
}

interface StepSubmissionContent {
  stepId: StepId;
  index: string;
  title: string;
  task: string;
  prompts: string[];
  questions: LearningQuestion[];
  responses: string[];
  objectiveSummary: {
    total: number;
    correct: number;
  };
  rubric: string;
  completed: boolean;
}

interface EngineeringScaffoldProps {
  canViewTeacherFeedback: boolean;
  project?: IoTProject | null;
  preferredClassId?: string;
}

const createInitialAnswers = (): Record<StepId, StepAnswer> => ({
  requirement: { responses: [], completed: false },
  components: { responses: [], completed: false },
  interfaces: { responses: [], completed: false },
  wiring: { responses: [], completed: false },
  safety: { responses: [], completed: false },
  code: { responses: [], completed: false },
  export: { responses: [], completed: false },
  reflection: { responses: [], completed: false },
});

const stepQuestionBank: Record<'zh' | 'en', Record<StepId, LearningQuestion[]>> = {
  zh: {
    requirement: [
      {
        type: 'choice',
        prompt: '如果“智能温室”既要监测温湿度，又要在高温时报警并远程查看数据，下列哪组需求描述最完整？',
        options: [
          '采集温湿度；超过阈值本地报警；OLED 显示；通过 Wi-Fi 上传关键数据',
          '使用 DHT22、OLED、蜂鸣器和 ESP8266，代码能运行即可',
          '只要能显示温度，就已经覆盖环境监测、报警和通信需求',
          '先确定 STM32 型号，再根据剩余引脚决定系统场景',
        ],
        answer: '采集温湿度；超过阈值本地报警；OLED 显示；通过 Wi-Fi 上传关键数据',
        explanation: '完整需求应同时包含输入、处理规则、输出方式和应用场景。',
      },
      {
        type: 'judge',
        prompt: '在需求分析阶段，报警阈值、显示位置和通信方式可以先作为可调参数记录，而不是直接写死在唯一方案中。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: '可调参数能支持后续仿真实验对比和工程迭代。',
      },
      {
        type: 'short',
        prompt: '请把当前系统需求写成“输入-处理-输出-约束”四要素，并说明其中一个约束来自真实部署还是课堂仿真。',
      },
    ],
    components: [
      {
        type: 'choice',
        prompt: '温室方案中同时包含 DHT22、MQ-2、OLED、蜂鸣器、ESP8266 时，下列角色划分最合理的是哪一项？',
        options: [
          'DHT22/MQ-2 负责感知，OLED 负责可视化，蜂鸣器负责执行报警，ESP8266 负责通信',
          'DHT22/OLED 负责通信，MQ-2/蜂鸣器负责显示，ESP8266 负责供电',
          '所有外设都属于传感器，因为它们都接在主控板上',
          '只要主控板性能足够，外设角色划分对程序设计没有影响',
        ],
        answer: 'DHT22/MQ-2 负责感知，OLED 负责可视化，蜂鸣器负责执行报警，ESP8266 负责通信',
        explanation: '器件角色会影响接口选择、程序模块划分和评价维度。',
      },
      {
        type: 'judge',
        prompt: '选择 ESP32 作为主控时，若系统已经需要 Wi-Fi，通常可以减少额外 ESP8266 串口通信模块的必要性。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: 'ESP32 自带 Wi-Fi，能降低接线复杂度和串口资源占用。',
      },
      {
        type: 'short',
        prompt: '请比较 STM32 + ESP8266 与 ESP32 单板两种方案的一个优势和一个风险。',
      },
    ],
    interfaces: [
      {
        type: 'choice',
        prompt: '若 DHT22、MQ-2、OLED、蜂鸣器和 ESP8266 同时接入 STM32，下列接口匹配最合理的是哪一组？',
        options: [
          'DHT22 单总线/GPIO，MQ-2 ADC，OLED I2C，蜂鸣器 GPIO/PWM，ESP8266 UART',
          'DHT22 I2C，MQ-2 UART，OLED ADC，蜂鸣器 I2C，ESP8266 GPIO',
          '所有模块统一接 I2C，便于总线共享',
          '所有模块统一接 ADC，便于读取连续数值',
        ],
        answer: 'DHT22 单总线/GPIO，MQ-2 ADC，OLED I2C，蜂鸣器 GPIO/PWM，ESP8266 UART',
        explanation: '接口类型应由模块通信协议和信号性质决定。',
      },
      {
        type: 'judge',
        prompt: '如果一个模块输出的是随浓度变化的模拟电压，主控应优先使用 ADC 读取，而不是普通数字 GPIO 直接判断全部状态。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: 'ADC 能保留连续变化信息，便于阈值判断和趋势分析。',
      },
      {
        type: 'short',
        prompt: '任选两个模块，说明它们为什么不能简单地共用同一个普通 GPIO 引脚。',
      },
    ],
    wiring: [
      {
        type: 'choice',
        prompt: '检查虚拟接线时，发现 OLED 的 SDA/SCL 与代码 pins.h 中定义相反，最可能导致什么问题？',
        options: [
          'I2C 初始化可能成功但显示无法正常通信或无显示',
          '只会影响 OLED 字体大小，不影响通信',
          '蜂鸣器报警阈值会自动降低',
          'MQ-2 会从模拟量变成数字量输出',
        ],
        answer: 'I2C 初始化可能成功但显示无法正常通信或无显示',
        explanation: '引脚定义与接线不一致会造成外设通信失败。',
      },
      {
        type: 'judge',
        prompt: '虚拟接线图中只要 VCC 接对，GND 是否共地对传感器读数影响不大。',
        options: ['正确', '错误'],
        answer: '错误',
        explanation: '没有共同参考地，信号电平无法被主控可靠识别。',
      },
      {
        type: 'short',
        prompt: '请指出一处“接线图-引脚表-代码宏定义”需要三方一致的地方，并说明不一致会出现什么现象。',
      },
    ],
    safety: [
      {
        type: 'choice',
        prompt: 'STM32F103C8T6 接入可能为 5V 输出的 MQ-2 数字信号时，下列处理最稳妥的是哪一项？',
        options: [
          '确认模块输出电平，并必要时使用分压/电平转换后再接入 GPIO',
          '直接接入任意 GPIO，因为 STM32 所有引脚都天然耐受 5V',
          '只接 VCC，不接 GND，可以避免电平风险',
          '把数字信号改接到 OLED 的 SCL 线上共用',
        ],
        answer: '确认模块输出电平，并必要时使用分压/电平转换后再接入 GPIO',
        explanation: '3.3V 主控接 5V 信号要关注耐压、电平转换和共地。',
      },
      {
        type: 'judge',
        prompt: '蜂鸣器、继电器或电机这类执行器即使能在仿真中点亮，也应在真实迁移时考虑三极管/MOS 管驱动和续流保护。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: '仿真通过不等于真实电流、反向电动势和器件保护都安全。',
      },
      {
        type: 'short',
        prompt: '请从电平兼容、驱动电流、共地、保护器件中任选两项，说明当前方案真实迁移时的风险和改法。',
      },
    ],
    code: [
      {
        type: 'choice',
        prompt: '如果仿真数据显示温度超过阈值但蜂鸣器没有动作，最合理的排查顺序是哪一项？',
        options: [
          '确认传感器读数 -> 检查阈值判断 -> 检查蜂鸣器引脚宏定义 -> 对照接线图',
          '先删除 OLED 显示代码，再更换所有传感器',
          '直接把所有 GPIO 都置高，观察是否报警',
          '只修改 README，不需要检查程序和接线',
        ],
        answer: '确认传感器读数 -> 检查阈值判断 -> 检查蜂鸣器引脚宏定义 -> 对照接线图',
        explanation: '排查应沿数据流和控制流逐步定位。',
      },
      {
        type: 'judge',
        prompt: '当代码中的阈值判断与需求描述不一致时，即使接线正确，系统行为也可能不符合实验目标。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: '功能正确性同时依赖需求、算法逻辑和硬件连接。',
      },
      {
        type: 'short',
        prompt: '请结合 main 和 pins 的分工，说明一次“采集-判断-输出”的代码链路。',
      },
    ],
    export: [
      {
        type: 'choice',
        prompt: '把虚拟仿真实验迁移到真实开发环境时，工程包中最需要被交叉核对的是哪一组内容？',
        options: [
          'README 操作说明、pins 引脚映射、main 程序逻辑和依赖库',
          '页面截图、按钮颜色、文件夹图标和浏览器缓存',
          '只核对压缩包名称是否规范',
          '只看 main 文件，不需要检查依赖库和引脚说明',
        ],
        answer: 'README 操作说明、pins 引脚映射、main 程序逻辑和依赖库',
        explanation: '真实迁移需要同时关注环境、依赖、引脚和核心逻辑。',
      },
      {
        type: 'judge',
        prompt: '如果导出的工程缺少依赖库说明，代码即使逻辑正确，也可能在 Arduino/PlatformIO/Keil 中无法复现。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: '依赖库和环境说明是工程可复现性的关键。',
      },
      {
        type: 'short',
        prompt: '请说明工程包如何证明“仿真实验结果可以迁移到真实硬件开发”。',
      },
    ],
    reflection: [
      {
        type: 'choice',
        prompt: '若要把温室监测从“能报警”提升为“可用于长期管理”，最有价值的拓展组合是哪一项？',
        options: [
          '历史数据记录、阈值可配置、远程查看和异常日志',
          '只提高蜂鸣器音量，其他功能不变',
          '删除显示模块，减少学生观察内容',
          '把所有阈值固定在代码里，避免学生修改',
        ],
        answer: '历史数据记录、阈值可配置、远程查看和异常日志',
        explanation: '长期管理强调数据追踪、参数调整、远程可见和故障诊断。',
      },
      {
        type: 'judge',
        prompt: '一个好的优化建议应说明改进目标、影响模块、可能风险和验证办法，而不仅是增加功能名称。',
        options: ['正确', '错误'],
        answer: '正确',
        explanation: '工程迭代要能解释为什么改、改哪里、怎么验证。',
      },
      {
        type: 'short',
        prompt: '请提出一个进阶改进，并写清楚它会影响哪些硬件/代码模块，以及如何在仿真中验证。',
      },
    ],
  },
  en: {
    requirement: [
      { type: 'choice', prompt: 'Which requirement statement is most complete for a smart greenhouse that monitors temperature/humidity, alarms on overheating, and supports remote viewing?', options: ['Collect temperature/humidity, compare thresholds, show data locally, alarm locally, and upload key data through Wi-Fi', 'Use DHT22, OLED, buzzer, and ESP8266 as long as the code runs', 'Temperature display alone covers monitoring, alarm, and communication requirements', 'Choose the STM32 model first, then decide the scenario from remaining pins'], answer: 'Collect temperature/humidity, compare thresholds, show data locally, alarm locally, and upload key data through Wi-Fi' },
      { type: 'judge', prompt: 'Thresholds, display location, and communication mode can be recorded as adjustable parameters instead of being hardcoded as the only solution.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Write the current requirement as input-process-output-constraint, and explain whether one constraint comes from real deployment or classroom simulation.' },
    ],
    components: [
      { type: 'choice', prompt: 'Which role mapping is most reasonable for DHT22, MQ-2, OLED, buzzer, and ESP8266?', options: ['DHT22/MQ-2 sense, OLED visualizes, buzzer executes alarms, ESP8266 communicates', 'DHT22/OLED communicate, MQ-2/buzzer display, ESP8266 powers the system', 'All peripherals are sensors because they connect to the controller', 'If the controller is powerful enough, peripheral roles do not affect program design'], answer: 'DHT22/MQ-2 sense, OLED visualizes, buzzer executes alarms, ESP8266 communicates' },
      { type: 'judge', prompt: 'When ESP32 is selected and Wi-Fi is already required, an extra ESP8266 UART module is often less necessary.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Compare one advantage and one risk of STM32 + ESP8266 versus a single ESP32 board.' },
    ],
    interfaces: [
      { type: 'choice', prompt: 'Which interface mapping is most reasonable for DHT22, MQ-2, OLED, buzzer, and ESP8266 on STM32?', options: ['DHT22 one-wire/GPIO, MQ-2 ADC, OLED I2C, buzzer GPIO/PWM, ESP8266 UART', 'DHT22 I2C, MQ-2 UART, OLED ADC, buzzer I2C, ESP8266 GPIO', 'Put every module on I2C for bus sharing', 'Put every module on ADC for continuous readings'], answer: 'DHT22 one-wire/GPIO, MQ-2 ADC, OLED I2C, buzzer GPIO/PWM, ESP8266 UART' },
      { type: 'judge', prompt: 'For a module that outputs analog voltage varying with concentration, ADC is preferred over a plain digital GPIO when trend and threshold analysis matter.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Choose two modules and explain why they cannot simply share the same ordinary GPIO pin.' },
    ],
    wiring: [
      { type: 'choice', prompt: 'If OLED SDA/SCL wiring is reversed compared with pins.h, what is the most likely issue?', options: ['I2C communication or display output may fail', 'Only font size is affected', 'The buzzer threshold automatically decreases', 'MQ-2 changes from analog to digital output'], answer: 'I2C communication or display output may fail' },
      { type: 'judge', prompt: 'As long as VCC is correct, common GND has little effect on sensor readings.', options: ['True', 'False'], answer: 'False' },
      { type: 'short', prompt: 'Identify one place where wiring diagram, pin table, and code macros must agree, and describe the failure symptom if they do not.' },
    ],
    safety: [
      { type: 'choice', prompt: 'For STM32F103C8T6 receiving a possible 5V digital signal from MQ-2, which treatment is safest?', options: ['Verify output level and use divider/level shifting before GPIO if needed', 'Connect directly to any GPIO because all STM32 pins tolerate 5V', 'Connect VCC only and omit GND to avoid level risk', 'Share the signal with OLED SCL'], answer: 'Verify output level and use divider/level shifting before GPIO if needed' },
      { type: 'judge', prompt: 'Even if an actuator works in simulation, real migration should consider transistor/MOSFET driving and flyback or protection circuits.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Choose two of level compatibility, drive current, common ground, and protection components; explain the migration risk and fix.' },
    ],
    code: [
      { type: 'choice', prompt: 'If simulated temperature exceeds the threshold but the buzzer does not activate, which debugging order is most reasonable?', options: ['Confirm sensor reading -> inspect threshold logic -> check buzzer pin macro -> compare wiring diagram', 'Delete OLED code first, then replace all sensors', 'Set all GPIO high and observe', 'Only edit README without checking program or wiring'], answer: 'Confirm sensor reading -> inspect threshold logic -> check buzzer pin macro -> compare wiring diagram' },
      { type: 'judge', prompt: 'If threshold logic conflicts with the requirement, correct wiring alone may still produce behavior that fails the lab goal.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Using the roles of main and pins, explain one collect-check-output code chain.' },
    ],
    export: [
      { type: 'choice', prompt: 'Which files/content should be cross-checked first when migrating the virtual lab to a real development environment?', options: ['README instructions, pins mapping, main logic, and dependency libraries', 'Screenshots, button colors, folder icons, and browser cache', 'Only the zip filename', 'Only main, without dependency or pin documentation'], answer: 'README instructions, pins mapping, main logic, and dependency libraries' },
      { type: 'judge', prompt: 'If exported code lacks dependency instructions, correct logic may still fail to reproduce in Arduino, PlatformIO, or Keil.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Explain how the project package proves that simulation results can migrate to real hardware development.' },
    ],
    reflection: [
      { type: 'choice', prompt: 'Which extension best upgrades greenhouse monitoring from "can alarm" to "usable for long-term management"?', options: ['History logging, configurable thresholds, remote viewing, and abnormal event logs', 'Only make the buzzer louder', 'Remove display to reduce observation', 'Hardcode all thresholds to avoid student changes'], answer: 'History logging, configurable thresholds, remote viewing, and abnormal event logs' },
      { type: 'judge', prompt: 'A good improvement proposal should state goal, affected modules, possible risks, and validation method, not only a feature name.', options: ['True', 'False'], answer: 'True' },
      { type: 'short', prompt: 'Propose one advanced improvement, identify affected hardware/code modules, and explain how to validate it in simulation.' },
    ],
  },
};

const extraObjectiveQuestions: Record<'zh' | 'en', Record<StepId, LearningQuestion[]>> = {
  zh: {
    requirement: [
      {
        type: 'choice',
        prompt: '如果温室项目要形成可评价的仿真实验任务，下面哪一项最适合作为“可验证指标”？',
        options: ['温度超过阈值时蜂鸣器触发且 OLED 显示异常状态', '界面看起来更丰富', '代码文件数量更多', '主控板名称更专业'],
        answer: '温度超过阈值时蜂鸣器触发且 OLED 显示异常状态',
      },
      {
        type: 'judge',
        prompt: '需求描述中同时写清“传感器输入、阈值规则、显示/报警输出”，比单纯罗列器件更适合后续 AI 生成和评价。',
        options: ['正确', '错误'],
        answer: '正确',
      },
    ],
    components: [
      {
        type: 'choice',
        prompt: '如果学生把 OLED 当成传感器，会主要影响哪一类理解？',
        options: ['系统输入/输出角色划分', '压缩包命名', '页面布局风格', '登录权限'],
        answer: '系统输入/输出角色划分',
      },
      {
        type: 'choice',
        prompt: '在器件选型中，蜂鸣器最适合作为哪类模块？',
        options: ['执行/报警模块', '模拟量传感器', '无线通信模块', '总线扩展芯片'],
        answer: '执行/报警模块',
      },
    ],
    interfaces: [
      {
        type: 'choice',
        prompt: '若 ESP8266 与 STM32 通信，最需要避免的问题是哪一项？',
        options: ['TX/RX 接反或串口电平不匹配', 'OLED 字体大小不一致', 'README 标题过短', '蜂鸣器图标颜色错误'],
        answer: 'TX/RX 接反或串口电平不匹配',
      },
      {
        type: 'choice',
        prompt: 'ADC 与普通数字 GPIO 的关键区别更接近哪一项？',
        options: ['ADC 读取连续电压变化，GPIO 主要读取高低电平', 'ADC 只能驱动蜂鸣器，GPIO 只能显示文字', 'ADC 不需要共地，GPIO 需要共地', '二者在传感器读取中没有区别'],
        answer: 'ADC 读取连续电压变化，GPIO 主要读取高低电平',
      },
    ],
    wiring: [
      {
        type: 'choice',
        prompt: '发现代码中蜂鸣器定义为 PB0，但接线图接到 PA1，最应该先做什么？',
        options: ['统一接线图和 pins.h 的引脚定义', '提高报警阈值', '删除传感器初始化', '把 OLED 改为串口屏'],
        answer: '统一接线图和 pins.h 的引脚定义',
      },
      {
        type: 'judge',
        prompt: '同一条 I2C 总线可以挂多个设备，但不能因此忽略设备地址冲突和上拉电阻问题。',
        options: ['正确', '错误'],
        answer: '正确',
      },
    ],
    safety: [
      {
        type: 'choice',
        prompt: '从仿真迁移到实物时，下列哪项最能体现安全审查意识？',
        options: ['核对 3.3V/5V、电流驱动、共地和保护电路', '只确认页面能够显示结果', '只保留代码不看接线', '把所有外设都接到同一个电源口'],
        answer: '核对 3.3V/5V、电流驱动、共地和保护电路',
      },
      {
        type: 'choice',
        prompt: '继电器或电机类负载接入主控时，为什么常需要驱动电路？',
        options: ['GPIO 输出电流有限且负载可能产生反向冲击', '为了让代码文件更多', '为了减少传感器数量', '因为 I2C 总线不能显示中文'],
        answer: 'GPIO 输出电流有限且负载可能产生反向冲击',
      },
    ],
    code: [
      {
        type: 'choice',
        prompt: '如果 OLED 正常显示，但报警从不触发，最可能优先检查哪部分代码？',
        options: ['阈值判断条件和蜂鸣器控制语句', '登录页面样式', 'ZIP 文件名', '班级邀请码'],
        answer: '阈值判断条件和蜂鸣器控制语句',
      },
      {
        type: 'judge',
        prompt: '在代码理解任务中，能把“传感器读数变量”追踪到“显示/报警输出”，比只说代码能运行更有评价价值。',
        options: ['正确', '错误'],
        answer: '正确',
      },
    ],
    export: [
      {
        type: 'choice',
        prompt: '工程导出后，哪个证据最能说明学生理解了“虚拟仿真到真实开发”的迁移？',
        options: ['能说明 README、依赖库、pins 映射和 main 逻辑如何配合', '只知道压缩包大小', '只会点击下载按钮', '只记住文件数量'],
        answer: '能说明 README、依赖库、pins 映射和 main 逻辑如何配合',
      },
      {
        type: 'judge',
        prompt: '工程资源包中的 README 不只是说明文档，也可以作为学生复现实验步骤和教师评价的依据。',
        options: ['正确', '错误'],
        answer: '正确',
      },
    ],
    reflection: [
      {
        type: 'choice',
        prompt: '如果要提升系统稳定性，下列哪项比“增加更多传感器”更优先？',
        options: ['增加异常数据处理和报警状态记录', '把页面标题变长', '删除阈值判断', '取消共地检查'],
        answer: '增加异常数据处理和报警状态记录',
      },
      {
        type: 'judge',
        prompt: '反思改进可以从“更安全、更稳定、更容易迁移、更方便观察数据”几个角度选择一个切入。',
        options: ['正确', '错误'],
        answer: '正确',
      },
    ],
  },
  en: {
    requirement: [
      { type: 'choice', prompt: 'Which item is the best verifiable indicator for a greenhouse simulation task?', options: ['When temperature exceeds the threshold, buzzer activates and OLED shows abnormal status', 'The interface looks richer', 'There are more code files', 'The board name sounds professional'], answer: 'When temperature exceeds the threshold, buzzer activates and OLED shows abnormal status' },
      { type: 'judge', prompt: 'A requirement with sensor input, threshold rule, display/alarm output is better for AI generation and assessment than a plain component list.', options: ['True', 'False'], answer: 'True' },
    ],
    components: [
      { type: 'choice', prompt: 'If a student treats OLED as a sensor, what understanding is most affected?', options: ['Input/output role classification', 'Zip filename', 'Page layout style', 'Login permission'], answer: 'Input/output role classification' },
      { type: 'choice', prompt: 'What module role best describes a buzzer?', options: ['Actuator/alarm module', 'Analog sensor', 'Wireless module', 'Bus expansion chip'], answer: 'Actuator/alarm module' },
    ],
    interfaces: [
      { type: 'choice', prompt: 'When ESP8266 communicates with STM32, what issue should be avoided first?', options: ['Reversed TX/RX or mismatched serial level', 'OLED font size', 'README title length', 'Buzzer icon color'], answer: 'Reversed TX/RX or mismatched serial level' },
      { type: 'choice', prompt: 'What is the key difference between ADC and ordinary digital GPIO?', options: ['ADC reads continuous voltage; GPIO mainly reads high/low level', 'ADC only drives buzzers; GPIO only displays text', 'ADC needs no common ground; GPIO needs ground', 'There is no difference for sensors'], answer: 'ADC reads continuous voltage; GPIO mainly reads high/low level' },
    ],
    wiring: [
      { type: 'choice', prompt: 'If code defines buzzer on PB0 but the wiring diagram connects PA1, what should be done first?', options: ['Align wiring diagram and pins.h definition', 'Raise alarm threshold', 'Delete sensor initialization', 'Change OLED to serial display'], answer: 'Align wiring diagram and pins.h definition' },
      { type: 'judge', prompt: 'Multiple I2C devices can share a bus, but address conflicts and pull-up resistors still matter.', options: ['True', 'False'], answer: 'True' },
    ],
    safety: [
      { type: 'choice', prompt: 'Which item best shows safety review when moving from simulation to real hardware?', options: ['Check 3.3V/5V, drive current, common ground, and protection circuits', 'Only confirm the page displays results', 'Keep code and ignore wiring', 'Connect every peripheral to the same power pin'], answer: 'Check 3.3V/5V, drive current, common ground, and protection circuits' },
      { type: 'choice', prompt: 'Why do relays or motors often need driver circuits?', options: ['GPIO current is limited and loads may create reverse spikes', 'To create more code files', 'To reduce sensor count', 'Because I2C cannot display Chinese'], answer: 'GPIO current is limited and loads may create reverse spikes' },
    ],
    code: [
      { type: 'choice', prompt: 'If OLED displays normally but alarm never triggers, what code should be checked first?', options: ['Threshold condition and buzzer control statement', 'Login page style', 'Zip filename', 'Class join code'], answer: 'Threshold condition and buzzer control statement' },
      { type: 'judge', prompt: 'Tracing a sensor reading variable to display/alarm output is more valuable than only saying the code runs.', options: ['True', 'False'], answer: 'True' },
    ],
    export: [
      { type: 'choice', prompt: 'Which evidence best proves understanding of migration from simulation to real development?', options: ['Explaining how README, dependencies, pins mapping, and main logic work together', 'Only knowing zip size', 'Only clicking download', 'Only remembering file count'], answer: 'Explaining how README, dependencies, pins mapping, and main logic work together' },
      { type: 'judge', prompt: 'README in the project pack can be evidence for reproducing lab steps and teacher assessment, not just documentation.', options: ['True', 'False'], answer: 'True' },
    ],
    reflection: [
      { type: 'choice', prompt: 'For improving system stability, which is more important than adding more sensors?', options: ['Add abnormal data handling and alarm state logging', 'Make page titles longer', 'Delete threshold checks', 'Cancel common-ground checks'], answer: 'Add abnormal data handling and alarm state logging' },
      { type: 'judge', prompt: 'Reflection can start from one angle: safer, more stable, easier to migrate, or easier to observe data.', options: ['True', 'False'], answer: 'True' },
    ],
  },
};

const onlyShortQuestion: Record<'zh' | 'en', LearningQuestion> = {
  zh: {
    type: 'short',
    prompt: '请用一句话写出你本次仿真实验中最想改进的一个地方。',
  },
  en: {
    type: 'short',
    prompt: 'Write one sentence about the part you most want to improve in this simulation lab.',
  },
};

const getStepQuestions = (language: 'zh' | 'en', stepId: StepId): LearningQuestion[] => {
  const objectiveBase = stepQuestionBank[language][stepId].filter(question => question.type !== 'short');
  const questions = [...objectiveBase, ...extraObjectiveQuestions[language][stepId]].slice(0, 4);
  if (stepId !== 'reflection') return questions;
  return [...questions.slice(0, 3), onlyShortQuestion[language]];
};

const getObjectiveSummary = (questions: LearningQuestion[], responses: string[]) => {
  const objectiveQuestions = questions.filter(question => question.type !== 'short' && question.answer);
  const correctCount = objectiveQuestions.filter(question => {
    const index = questions.indexOf(question);
    return responses[index] === question.answer;
  }).length;
  return {
    total: objectiveQuestions.length,
    correct: correctCount,
  };
};

export const EngineeringScaffold: React.FC<EngineeringScaffoldProps> = ({ canViewTeacherFeedback, project, preferredClassId }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [activeStepId, setActiveStepId] = useState<StepId>('requirement');
  const [answers, setAnswers] = useState<Record<StepId, StepAnswer>>(createInitialAnswers);
  const [teacherNote, setTeacherNote] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [studentClasses, setStudentClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [joinClassCode, setJoinClassCode] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [lastAiReview, setLastAiReview] = useState<LearningSubmission | null>(null);

  const learningSteps: LearningStep[] = useMemo(() => lang === 'zh'
    ? [
      {
        id: 'requirement',
        index: '01',
        title: '需求分析',
        task: '说清这个物联网系统要解决的真实问题，写出系统输入、输出、报警条件和应用场景。',
        prompts: ['系统需要监测哪些环境数据？', '数据异常时要做什么？', '结果需要在哪里显示？', '这个系统用于什么真实场景？'],
        rubric: '能准确描述应用场景，提取核心功能需求，并说清输入、处理、输出关系。',
        teacherFocus: '关注学生是否把真实问题转化为清晰的功能需求。',
      },
      {
        id: 'components',
        index: '02',
        title: '器件选型',
        task: '说明主控板、传感器、显示器、报警器、通信模块分别承担什么角色。',
        prompts: ['为什么选择 STM32 或 ESP32？', 'DHT22、MQ-2、OLED、蜂鸣器、ESP8266 分别解决什么问题？', '哪些是传感器、执行器、显示模块或通信模块？'],
        rubric: '器件分类正确，功能解释准确，器件选择能匹配项目需求。',
        teacherFocus: '关注学生是否理解每个器件在系统中的工程角色。',
      },
      {
        id: 'interfaces',
        index: '03',
        title: '接口识别',
        task: '判断每个模块使用的接口类型，并把接口类型和引脚连接对应起来。',
        prompts: ['DHT22 是什么通信方式？', 'MQ-2 是数字量还是模拟量？', 'OLED 使用什么总线？', '蜂鸣器使用 GPIO 还是 PWM？', 'ESP8266 使用什么通信方式？'],
        rubric: '能区分单总线、ADC、I2C、GPIO、UART 等接口，并能说明原因。',
        teacherFocus: '关注学生是否能从模块功能过渡到接口类型判断。',
      },
      {
        id: 'wiring',
        index: '04',
        title: '虚拟接线',
        task: '根据接线图和引脚表解释主控板与外设之间的连接关系。',
        prompts: ['PA0、PA1、PB6、PB7、PB0、PA2、PA3 分别接到哪个模块？', '哪些线路可以共用？哪些线路不能共用？', 'I2C 为什么可以挂多个设备？'],
        rubric: '能读懂 CAD 接线图，根据引脚表解释连接关系，并理解总线共享和独占引脚。',
        teacherFocus: '关注学生是否能把图形接线、表格引脚和工程代码关联起来。',
      },
      {
        id: 'safety',
        index: '05',
        title: '安全判断',
        task: '找出硬件连接中可能存在的安全风险，并提出改进方案。',
        prompts: ['哪些模块可能使用 5V？', 'STM32/ESP32 的 GPIO 是否能直接承受 5V？', '蜂鸣器、电机、继电器是否能直接由 GPIO 驱动？', '为什么所有模块需要共地？'],
        rubric: '能识别 5V/3.3V 电平风险、GPIO 驱动电流风险、共地要求和电平转换措施。',
        teacherFocus: '重点看学生是否发现 MQ-2、蜂鸣器等器件的电平和驱动风险。',
      },
      {
        id: 'code',
        index: '06',
        title: '代码理解',
        task: '阅读生成代码，说明数据采集、显示、判断、报警的程序流程。',
        prompts: ['程序在哪里初始化传感器？', '主循环中先采集什么？', '阈值判断在哪里发生？', '蜂鸣器如何被触发？', '引脚定义和接线图是否一致？'],
        rubric: '能说明主程序流程，找到关键代码位置，并把代码逻辑和硬件功能对应起来。',
        teacherFocus: '关注学生是否能对照 pins.h 和 main.c/main.cpp 解释工程逻辑。',
      },
      {
        id: 'export',
        index: '07',
        title: '工程导出',
        task: '下载工程资源包，确认文件结构，并说明每个关键文件的作用。',
        prompts: ['main.c 或 main.cpp 负责什么？', 'pins.h 负责什么？', 'README 说明了哪些内容？', '如何把工程导入 PlatformIO、Keil 或 Arduino？'],
        rubric: '能识别工程文件结构，说明关键文件作用，并具备工程交付意识。',
        teacherFocus: '关注学生是否能从课件操作过渡到真实工程文件理解。',
      },
      {
        id: 'reflection',
        index: '08',
        title: '反思改进',
        task: '对当前方案提出优化或扩展建议，体现工程迭代思维。',
        prompts: ['如何增加远程监控？', '如何保存历史数据？', '如何让报警阈值可配置？', '如何让系统更安全、更稳定？', '如果真实部署，还需要补充什么？'],
        rubric: '能提出合理改进，体现工程迭代思维和创新应用意识。',
        teacherFocus: '关注学生是否能从完成任务走向优化设计和迁移应用。',
      },
    ]
    : [
      {
        id: 'requirement',
        index: '01',
        title: 'Requirement',
        task: 'Explain the real problem this IoT system solves, including inputs, outputs, alarm conditions, and scenarios.',
        prompts: ['What environmental data should be monitored?', 'What happens when data is abnormal?', 'Where should results be displayed?', 'What real scenario is this for?'],
        rubric: 'Describes the scenario, extracts core requirements, and explains input-process-output relationships.',
        teacherFocus: 'Check whether the student translates a real problem into clear functional requirements.',
      },
      {
        id: 'components',
        index: '02',
        title: 'Components',
        task: 'Explain the roles of the controller, sensors, display, alarm module, and communication module.',
        prompts: ['Why choose STM32 or ESP32?', 'What problem does each module solve?', 'Which modules are sensors, actuators, displays, or communication modules?'],
        rubric: 'Classifies components correctly and connects component choices to project needs.',
        teacherFocus: 'Check whether the student understands each component role in the system.',
      },
      {
        id: 'interfaces',
        index: '03',
        title: 'Interfaces',
        task: 'Identify the interface type used by each module and connect it to pin routing.',
        prompts: ['What interface does DHT22 use?', 'Is MQ-2 digital or analog?', 'What bus does OLED use?', 'Does the buzzer use GPIO or PWM?', 'What interface does ESP8266 use?'],
        rubric: 'Distinguishes one-wire, ADC, I2C, GPIO, and UART interfaces with reasons.',
        teacherFocus: 'Check whether the student moves from component function to interface reasoning.',
      },
      {
        id: 'wiring',
        index: '04',
        title: 'Wiring',
        task: 'Explain the relationship between the controller and peripherals using the wiring diagram and pin table.',
        prompts: ['Which module is connected to each MCU pin?', 'Which lines can be shared?', 'Which lines must be exclusive?', 'Why can I2C host multiple devices?'],
        rubric: 'Reads the CAD diagram, explains pin connections, and understands shared buses and exclusive pins.',
        teacherFocus: 'Check whether the student connects diagram, table, and code.',
      },
      {
        id: 'safety',
        index: '05',
        title: 'Safety',
        task: 'Find possible hardware safety risks and suggest improvements.',
        prompts: ['Which modules may use 5V?', 'Can MCU GPIO tolerate 5V directly?', 'Can actuators be driven directly by GPIO?', 'Why do modules need a common ground?'],
        rubric: 'Identifies voltage, current, common-ground, and level-shifting risks.',
        teacherFocus: 'Focus on whether the student catches voltage and driving risks.',
      },
      {
        id: 'code',
        index: '06',
        title: 'Code Reading',
        task: 'Read generated code and explain data collection, display, threshold judgment, and alarm flow.',
        prompts: ['Where are sensors initialized?', 'What is collected first in the loop?', 'Where does threshold logic happen?', 'How is the buzzer triggered?', 'Do pin definitions match the wiring?'],
        rubric: 'Explains main flow, locates key code, and maps code to hardware behavior.',
        teacherFocus: 'Check whether the student explains pins.h and main logic together.',
      },
      {
        id: 'export',
        index: '07',
        title: 'Export',
        task: 'Download the resource package, inspect the structure, and explain key files.',
        prompts: ['What does main.c/main.cpp do?', 'What does pins.h do?', 'What does README explain?', 'How can the project be imported into an IDE?'],
        rubric: 'Identifies project structure, explains key files, and shows delivery awareness.',
        teacherFocus: 'Check whether the student understands real engineering files.',
      },
      {
        id: 'reflection',
        index: '08',
        title: 'Reflection',
        task: 'Propose improvements or extensions for the solution.',
        prompts: ['How can remote monitoring be added?', 'How can data history be stored?', 'How can thresholds be configurable?', 'How can the system be safer or more stable?'],
        rubric: 'Proposes reasonable improvements and shows iterative engineering thinking.',
        teacherFocus: 'Check whether the student moves from completion to optimization.',
      },
    ], [lang]);

  const activeStepIndex = Math.max(0, learningSteps.findIndex(step => step.id === activeStepId));
  const activeStep = learningSteps[activeStepIndex] || learningSteps[0];
  const activeQuestions = useMemo(() => getStepQuestions(lang, activeStepId), [activeStepId, lang]);
  const canGoPrevious = activeStepIndex > 0;
  const canGoNext = activeStepIndex < learningSteps.length - 1;
  const isStepAnswered = (step: LearningStep) => {
    const questions = getStepQuestions(lang, step.id);
    const stepResponses = answers[step.id]?.responses || [];
    return questions.every((_, index) => stepResponses[index]?.trim());
  };
  const completedCount = learningSteps.filter(isStepAnswered).length;
  const progressPercent = Math.round((completedCount / learningSteps.length) * 100);
  const missingSteps = learningSteps.filter(step => !isStepAnswered(step));
  const canSubmitToClass = !!user && !canViewTeacherFeedback;

  const feedbackSuggestion = useMemo(() => {
    if (lang === 'zh') {
      if (completedCount < 4) {
        return '建议先完成需求分析、器件选型和接口识别，建立系统整体认识。';
      }
      if (missingSteps.some(step => step.id === 'safety')) {
        return '建议补充 5V/3.3V 电平兼容、共地和执行器驱动电流风险分析。';
      }
      if (missingSteps.some(step => step.id === 'code')) {
        return '建议对照 pins.h 和 main.c/main.cpp，说明采集、显示、阈值判断、报警的流程。';
      }
      if (missingSteps.some(step => step.id === 'reflection')) {
        return '建议继续补充远程监控、数据记录和阈值可配置等拓展方案。';
      }
      return '整体学习流程较完整，可引导学生把方案优化点整理为展示汇报。';
    }

    if (completedCount < 4) {
      return 'Start with requirement analysis, component selection, and interface recognition to build system-level understanding.';
    }
    if (missingSteps.some(step => step.id === 'safety')) {
      return 'Add analysis of 5V/3.3V compatibility, common ground, and actuator driving-current risks.';
    }
    if (missingSteps.some(step => step.id === 'code')) {
      return 'Compare pins.h with main.c/main.cpp and explain collection, display, threshold judgment, and alarm flow.';
    }
    if (missingSteps.some(step => step.id === 'reflection')) {
      return 'Extend the design with remote monitoring, data logging, or configurable thresholds.';
    }
    return 'The learning flow is complete. Guide students to turn optimization ideas into a presentation.';
  }, [completedCount, lang, missingSteps]);

  const updatePromptAnswer = (promptIndex: number, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [activeStepId]: (() => {
        const responses = activeQuestions.map((_, index) => (
          index === promptIndex ? text : prev[activeStepId].responses[index] || ''
        ));
        return {
          ...prev[activeStepId],
          responses,
          completed: activeQuestions.every((_, index) => responses[index]?.trim()),
          updatedAt: new Date().toISOString(),
        };
      })(),
    }));
  };

  const saveCurrentStep = (completed?: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [activeStepId]: {
        ...prev[activeStepId],
        completed: completed ?? prev[activeStepId].completed,
        updatedAt: new Date().toISOString(),
      },
    }));
    setSavedNotice(lang === 'zh' ? '已保存当前步骤记录。' : 'Current step saved.');
    window.setTimeout(() => setSavedNotice(''), 1800);
  };

  const goToPreviousStep = () => {
    if (!canGoPrevious) return;
    setActiveStepId(learningSteps[activeStepIndex - 1].id);
  };

  const goToNextStep = () => {
    if (!canGoNext) return;
    setActiveStepId(learningSteps[activeStepIndex + 1].id);
  };

  useEffect(() => {
    if (!canSubmitToClass) {
      setStudentClasses([]);
      setSelectedClassId('');
      return;
    }

    api.classroom.listStudentClasses()
      .then(classes => {
        setStudentClasses(classes);
        setSelectedClassId(current => {
          if (preferredClassId && classes.some(classRoom => classRoom.classId === preferredClassId)) {
            return preferredClassId;
          }
          if (current && classes.some(classRoom => classRoom.classId === current)) {
            return current;
          }
          return classes[0]?.classId || '';
        });
      })
      .catch(err => {
        console.warn("Failed to load student classes:", err);
      });
  }, [canSubmitToClass, preferredClassId]);

  const handleJoinClass = async () => {
    if (!joinClassCode.trim()) {
      setSubmitNotice(lang === 'zh' ? '请输入班级加入码。' : 'Enter a class join code.');
      return;
    }

    setIsJoiningClass(true);
    setSubmitNotice('');
    try {
      const result = await api.classroom.joinClass(joinClassCode);
      const classRoom = result.classRoom;
      setStudentClasses(prev => {
        if (result.status !== 'joined' || prev.some(item => item.classId === classRoom.classId)) return prev;
        return [...prev, classRoom];
      });
      if (result.status === 'joined') {
        const classes = await api.classroom.listStudentClasses();
        setStudentClasses(classes);
        setSelectedClassId(classes.some(item => item.classId === classRoom.classId)
          ? classRoom.classId
          : classes[0]?.classId || '');
      }
      setJoinClassCode('');
      setSubmitNotice(lang === 'zh' ? '已加入班级。' : 'Joined class.');
      setSubmitNotice(result.status === 'pending'
        ? (lang === 'zh' ? '已提交加入申请，请等待班级管理员审批。' : 'Join request submitted. Wait for teacher approval.')
        : (lang === 'zh' ? '已加入班级。' : 'Joined class.'));
    } catch (err) {
      setSubmitNotice(err instanceof Error ? err.message : (lang === 'zh' ? '加入班级失败。' : 'Failed to join class.'));
    } finally {
      setIsJoiningClass(false);
    }
  };

  const submitAllStepsToClass = async () => {
    if (!selectedClassId) {
      setSubmitNotice(lang === 'zh' ? '请先选择要提交的班级。' : 'Select a class first.');
      return;
    }
    if (!studentClasses.some(classRoom => classRoom.classId === selectedClassId)) {
      try {
        const classes = await api.classroom.listStudentClasses();
        setStudentClasses(classes);
        setSelectedClassId(classes[0]?.classId || '');
      } catch (err) {
        console.warn("Failed to refresh student classes before submit:", err);
      }
      setSubmitNotice(lang === 'zh'
        ? '班级信息已刷新，请重新选择班级后再提交。'
        : 'Class information was refreshed. Select a class again before submitting.');
      return;
    }

    const firstMissingStep = learningSteps.find(step => !isStepAnswered(step));
    if (firstMissingStep) {
      setActiveStepId(firstMissingStep.id);
      setShowSubmitPanel(false);
      setSubmitNotice(lang === 'zh'
        ? `还有未完成题目，请先补全“${firstMissingStep.title}”。`
        : `Some answers are missing. Complete "${firstMissingStep.title}" first.`);
      return;
    }

    const stepContents: StepSubmissionContent[] = learningSteps.map(step => {
      const questions = getStepQuestions(lang, step.id);
      const responses = questions.map((_, index) => answers[step.id].responses[index] || '');
      return {
        stepId: step.id,
        index: step.index,
        title: step.title,
        task: step.task,
        prompts: questions.map(question => question.prompt),
        questions,
        responses,
        objectiveSummary: getObjectiveSummary(questions, responses),
        rubric: step.rubric,
        completed: true,
      };
    });
    const allQuestions = stepContents.flatMap(step =>
      step.questions.map(question => ({
        ...question,
        prompt: `${step.index} ${step.title}：${question.prompt}`,
      }))
    );
    const allResponses = stepContents.flatMap(step => step.responses);
    const objectiveSummary = stepContents.reduce((summary, step) => ({
      total: summary.total + step.objectiveSummary.total,
      correct: summary.correct + step.objectiveSummary.correct,
    }), { total: 0, correct: 0 });

    setIsSubmitting(true);
    setSubmitNotice('');
    try {
      const submitted = await api.classroom.submitLearningTask({
        classId: selectedClassId,
        projectId: project?.projectId,
        projectName: project?.name,
        taskType: 'reflection',
        title: lang === 'zh' ? '完整学习流程提交' : 'Complete Learning Process Submission',
        content: JSON.stringify({
          task: lang === 'zh'
            ? '学生已完成虚拟仿真实验 8 个学习步骤，提交完整过程检测答案。'
            : 'The student completed all 8 simulation-lab learning steps and submitted the full process check.',
          prompts: allQuestions.map(question => question.prompt),
          questions: allQuestions,
          responses: allResponses,
          steps: stepContents,
          objectiveSummary,
          rubric: lang === 'zh'
            ? '综合评价学生在需求分析、器件选型、接口识别、虚拟接线、安全判断、代码理解、工程导出和反思改进中的完整学习过程。'
            : 'Assess the full process across requirements, components, interfaces, wiring, safety, code, export, and reflection.',
          completed: true,
          isFullProcessSubmission: true,
          projectName: project?.name,
        }),
      });
      setLastAiReview(submitted);
      setAnswers(prev => learningSteps.reduce<Record<StepId, StepAnswer>>((next, step) => ({
        ...next,
        [step.id]: {
          ...prev[step.id],
          completed: true,
          updatedAt: new Date().toISOString(),
        },
      }), prev));
      setSubmitNotice(lang === 'zh'
        ? (submitted.aiStatus === 'completed'
          ? '完整学习流程已提交到班级，AI 助教已完成初评，教师端可以查看。'
          : '完整学习流程已提交到班级，教师端可以查看；AI 助教初评暂未生成。')
        : (submitted.aiStatus === 'completed'
          ? 'Full learning process submitted. AI tutor review is ready for teacher review.'
          : 'Full learning process submitted. Teacher can review it; AI tutor review is not ready.'));
    } catch (err) {
      setSubmitNotice(err instanceof Error ? err.message : (lang === 'zh' ? '提交失败。' : 'Submission failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="border border-neutral-200/70 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-neutral-950">
                {lang === 'zh' ? '学习任务评价' : 'Learning Tasks and Feedback'}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-3xl">
                {canViewTeacherFeedback
                  ? (lang === 'zh'
                    ? '按照工程学习流程记录学生分析、验证、反思的过程，并为教师提供过程性评价反馈。'
                    : 'Guides students through engineering tasks and gives teachers a process-based feedback view.')
                  : (lang === 'zh'
                    ? '按照工程学习流程记录需求分析、器件选型、接线验证、安全判断和反思改进过程。'
                    : 'Guides students through requirement analysis, component selection, wiring checks, safety reasoning, and reflection.')}
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 w-fit">
            {canViewTeacherFeedback
              ? (lang === 'zh' ? '学生完成任务 / 教师查看反馈' : 'STUDENT TASKS / TEACHER FEEDBACK')
              : (lang === 'zh' ? '学生完成任务 / 保存学习记录' : 'STUDENT TASKS / LEARNING RECORD')}
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
            {learningSteps.map(step => {
              const isActive = step.id === activeStepId;
              const isDone = isStepAnswered(step);
              return (
                <div
                  key={step.id}
                  className={`min-h-18 rounded-lg border px-3 py-2 text-left flex flex-col justify-between ${
                    isActive
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                      : isDone
                        ? 'border-emerald-200 bg-emerald-50 text-neutral-800'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black ${isActive ? 'text-neutral-300' : 'text-neutral-400'}`}>
                      {step.index}
                    </span>
                    {isDone && <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`} />}
                  </div>
                  <span className="text-[11px] font-bold leading-tight">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${canViewTeacherFeedback ? 'xl:grid-cols-[1fr_360px]' : ''}`}>
        <div className="border border-neutral-200/70 bg-white rounded-2xl shadow-sm p-5 space-y-5">
          <div className="space-y-2">
            <div className="text-[10px] font-mono font-black text-neutral-400">
              {activeStep.index} / {activeStep.title}
            </div>
            <h4 className="font-display font-black text-base text-neutral-950">
              {lang === 'zh' ? '当前学习任务' : 'Current Learning Task'}
            </h4>
            <p className="text-sm font-semibold text-neutral-800 leading-relaxed">{activeStep.task}</p>
          </div>

          <div className="rounded-xl border border-neutral-150 bg-neutral-50 p-4 space-y-3">
            <h5 className="text-xs font-black text-neutral-900">
              {lang === 'zh' ? '过程检测题' : 'Process Checks'}
            </h5>
            <div className="space-y-3">
              {activeQuestions.map((question, index) => (
                <div key={`${activeStep.id}-${index}`} className="rounded-xl bg-white border border-neutral-100 p-3 space-y-2">
                  <div className="flex gap-2 text-[11px] text-neutral-800 leading-relaxed">
                    <span className="font-mono font-black text-sky-700 shrink-0">{index + 1}</span>
                    <span className="text-[13px] font-semibold">{question.prompt}</span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-neutral-500">
                      {question.type === 'choice' ? 'Choice' : question.type === 'judge' ? 'Judge' : 'Short'}
                    </span>
                  </div>
                  {question.type === 'short' ? (
                    <textarea
                      value={answers[activeStepId].responses[index] || ''}
                      onChange={(event) => updatePromptAnswer(index, event.target.value)}
                      placeholder={lang === 'zh' ? '用简短文字写出判断依据或改进想法。' : 'Write brief evidence or an improvement idea.'}
                      className="w-full min-h-20 resize-y rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-xs leading-relaxed text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(question.options || []).map(option => {
                        const active = answers[activeStepId].responses[index] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updatePromptAnswer(index, option)}
                            className={`min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                              active
                                ? 'border-sky-700 bg-sky-50 text-sky-900'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 hover:bg-white'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-500 min-h-4">{savedNotice}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={!canGoPrevious}
                className="px-4 py-2 border border-neutral-200 hover:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-950 transition flex items-center gap-2 disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-neutral-700"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'zh' ? '上一步' : 'Previous'}
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!canGoNext}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-2 disabled:opacity-40"
              >
                {lang === 'zh' ? '下一步' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
              {canSubmitToClass && (
                <button
                  type="button"
                  onClick={() => {
                    const firstMissingStep = learningSteps.find(step => !isStepAnswered(step));
                    if (firstMissingStep) {
                      setActiveStepId(firstMissingStep.id);
                      setSubmitNotice(lang === 'zh'
                        ? `还有未完成题目，请先补全“${firstMissingStep.title}”。`
                        : `Some answers are missing. Complete "${firstMissingStep.title}" first.`);
                      return;
                    }
                    setSubmitNotice('');
                    setShowSubmitPanel(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-700 text-white text-xs font-bold transition flex items-center gap-2 hover:bg-sky-800"
                >
                  <Send className="w-4 h-4" />
                  {lang === 'zh' ? '提交' : 'Submit'}
                </button>
              )}
            </div>
          </div>

          {canSubmitToClass && showSubmitPanel && (
            <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-neutral-950/35 px-4 py-6 backdrop-blur-[1px] sm:items-center">
              <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                <div className="shrink-0 flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
                  <div>
                    <div className="h-9 w-9 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </div>
                    <h5 className="mt-3 text-sm font-black text-neutral-950">
                    {lang === 'zh' ? '提交完整学习流程' : 'Submit Full Learning Process'}
                    </h5>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {lang === 'zh'
                      ? '系统会一次性提交 8 个步骤的全部答案，教师可在班级管理中查看完整回答、AI 初评和学习画像。'
                      : 'The system submits answers from all 8 steps at once for teacher review, AI feedback, and learning portraits.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubmitPanel(false)}
                    className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                    aria-label={lang === 'zh' ? '关闭提交弹窗' : 'Close submit dialog'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={joinClassCode}
                  onChange={event => setJoinClassCode(event.target.value)}
                  placeholder={lang === 'zh' ? '输入班级加入码' : 'Enter class join code'}
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-950 focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleJoinClass}
                  disabled={isJoiningClass}
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-xs font-bold hover:border-neutral-900 hover:text-neutral-950 transition disabled:opacity-60"
                >
                  {isJoiningClass
                    ? (lang === 'zh' ? '加入中...' : 'Joining...')
                    : (lang === 'zh' ? '加入班级' : 'Join Class')}
                </button>
              </div>

              {studentClasses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-500">
                  {lang === 'zh'
                    ? '你还没有加入任何班级，可以输入教师提供的加入码主动加入。'
                    : 'You have not joined a class yet. Enter a join code from your teacher.'}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedClassId}
                    onChange={event => setSelectedClassId(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-950 focus:outline-none focus:border-neutral-900"
                  >
                    {studentClasses.map(classRoom => (
                      <option key={classRoom.classId} value={classRoom.classId}>
                        {classRoom.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={submitAllStepsToClass}
                    disabled={isSubmitting || !!lastAiReview}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting
                      ? (lang === 'zh' ? '提交中...' : 'Submitting...')
                      : (lang === 'zh' ? '确认提交' : 'Confirm Submit')}
                  </button>
                </div>
              )}

              {submitNotice && (
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-900">{submitNotice}</div>
              )}

              {lastAiReview?.aiFeedback && (
                <div className={`rounded-xl border p-4 ${
                  lastAiReview.aiStatus === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-amber-200 bg-amber-50/70'
                }`}>
                  <div className={`text-[10px] font-mono font-black uppercase ${
                    lastAiReview.aiStatus === 'completed' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {lang === 'zh' ? 'AI 助教初评' : 'AI Tutor Review'}
                    {lastAiReview.aiScore === undefined ? '' : ` · ${lastAiReview.aiScore}/100`}
                  </div>
                  {lastAiReview.aiObjectiveTotal !== undefined && lastAiReview.aiObjectiveTotal > 0 && (
                    <div className="mt-1 text-[10px] font-mono font-black text-sky-800">
                      {lang === 'zh' ? '客观题' : 'Objective'}：{lastAiReview.aiObjectiveCorrect ?? 0}/{lastAiReview.aiObjectiveTotal}
                    </div>
                  )}
                  <p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed ${
                    lastAiReview.aiStatus === 'completed' ? 'text-emerald-950' : 'text-amber-950'
                  }`}>
                    {lastAiReview.aiFeedback}
                  </p>
                </div>
              )}
                </div>
                <div className="shrink-0 flex flex-col gap-2 border-t border-neutral-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSubmitPanel(false)}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                  >
                    {lang === 'zh' ? '关闭' : 'Close'}
                  </button>
                  {lastAiReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitPanel(false);
                        setLastAiReview(null);
                      }}
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
                    >
                      {lang === 'zh' ? '返回继续修改' : 'Back to Edit'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {canViewTeacherFeedback && (
        <aside className="border border-neutral-200/70 bg-white rounded-2xl shadow-sm p-5 space-y-5 h-fit">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm text-neutral-950">
                {lang === 'zh' ? '教师评价反馈' : 'Teacher Feedback'}
              </h4>
              <p className="text-[11px] text-neutral-500 mt-1">
                {lang === 'zh' ? '查看学习完成度、评价要点和反馈建议。' : 'Review progress, rubric focus, and feedback suggestions.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-700">{lang === 'zh' ? '学习流程完成度' : 'Progress'}</span>
              <span className="font-mono font-black text-neutral-950">{completedCount}/{learningSteps.length}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-150 bg-neutral-50 p-4 space-y-2">
            <h5 className="text-xs font-black text-neutral-900">{lang === 'zh' ? '当前步骤评价要点' : 'Current Rubric'}</h5>
            <p className="text-[11px] text-neutral-650 leading-relaxed">{activeStep.rubric}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h5 className="text-xs font-black">{lang === 'zh' ? '教师重点提醒' : 'Teacher Focus'}</h5>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">{activeStep.teacherFocus}</p>
          </div>

          <div className="rounded-xl border border-sky-150 bg-sky-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-900">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <h5 className="text-xs font-black">{lang === 'zh' ? '反馈建议' : 'Suggested Feedback'}</h5>
            </div>
            <p className="text-[11px] text-sky-900/80 leading-relaxed">{feedbackSuggestion}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-900 block">
              {lang === 'zh' ? '教师评语' : 'Teacher Comment'}
            </label>
            <textarea
              value={teacherNote}
              onChange={(event) => setTeacherNote(event.target.value)}
              placeholder={lang === 'zh' ? '可记录学生表现、问题与后续指导建议。' : 'Record performance, issues, and follow-up guidance.'}
              className="w-full min-h-28 resize-none rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </aside>
        )}
      </div>
    </section>
  );
};
