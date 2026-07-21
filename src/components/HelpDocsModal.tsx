import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  FileText,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Rocket,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';

type HelpSectionId = 'quickstart' | 'features' | 'roles' | 'courseware' | 'faq';

interface HelpDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpBlock {
  title: string;
  body?: string;
  items?: string[];
}

interface HelpSection {
  id: HelpSectionId;
  label: string;
  icon: LucideIcon;
  summary: string;
  blocks: HelpBlock[];
}

export const HelpDocsModal: React.FC<HelpDocsModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const [activeSectionId, setActiveSectionId] = useState<HelpSectionId>('quickstart');
  const isTeacherLike = profile?.role === 'teacher' || profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    if (!isOpen) return;
    setActiveSectionId('quickstart');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sections: HelpSection[] = useMemo(() => {
    if (lang === 'en') {
      return [
        {
          id: 'quickstart',
          label: 'Quick Start',
          icon: Rocket,
          summary: 'Use this flow when opening the platform for the first time.',
          blocks: [
            {
              title: 'Create one IoT courseware project in 5 steps',
              items: [
                'Choose a controller platform, such as STM32 Blue Pill or ESP32 DevKit.',
                'Describe the project goal with sensors, display, alarm, communication, and scenario.',
                'Review the optimized plan and correct any misunderstood hardware details.',
                'Check the wiring preview and generated source files before using them in class.',
                'Complete the learning task assessment and submit records when needed.',
              ],
            },
            {
              title: 'Requirement template',
              body: 'I want to build a ____ system using ____ sensor(s). Data should be shown on ____. When ____ happens, trigger ____. It will be used in ____ scenario.',
            },
            {
              title: 'Best first try',
              body: 'Start with a simple monitoring-and-alarm project. Add networking, data history, or multiple sensors after the first result is stable.',
            },
          ],
        },
        {
          id: 'features',
          label: 'Features',
          icon: ListChecks,
          summary: 'What each workspace page is for.',
          blocks: [
            {
              title: 'Requirement Input',
              body: 'Write the project idea and select the target controller. The clearer the scenario and hardware list, the easier it is for the system to generate a useful plan.',
            },
            {
              title: 'Prompt Optimization',
              body: 'Review how the system understood your needs. Correct sensors, displays, alarms, power, network, and platform before generating the final project.',
            },
            {
              title: 'Circuit Preview and Code Preview',
              body: 'Use the circuit preview to inspect wiring relationships and the code preview to understand firmware structure. Treat generated wiring and code as a prototype that still needs teacher or engineer verification.',
            },
            {
              title: 'Learning Task Assessment',
              body: 'Students answer questions step by step: requirement analysis, component selection, interface recognition, virtual wiring, safety judgment, code reading, export, and reflection.',
            },
          ],
        },
        {
          id: 'roles',
          label: 'Roles',
          icon: UsersRound,
          summary: 'Different accounts see different teaching functions.',
          blocks: [
            {
              title: 'Student or regular account',
              items: [
                'Generate and view IoT project resources.',
                'Complete question-by-question learning records.',
                'Join a class and submit learning task records.',
                'View class status and teacher feedback when available.',
              ],
            },
            {
              title: 'Teacher account',
              items: [
                'Create and manage classes.',
                'Approve student join requests.',
                'View submitted learning records.',
                'Write process-based feedback for students.',
              ],
            },
            {
              title: 'Administrator',
              body: 'Administrators can manage users, hardware data, and class-related teaching workflows.',
            },
          ],
        },
        {
          id: 'courseware',
          label: 'Courseware',
          icon: GraduationCap,
          summary: 'How to use generated results as a courseware work.',
          blocks: [
            {
              title: 'What the system already provides',
              items: [
                'Project requirement and optimized engineering plan.',
                'Hardware connection preview and pin mapping.',
                'Firmware source files and resource package.',
                'Learning task assessment flow with student responses and teacher feedback.',
              ],
            },
            {
              title: 'What to supplement for a courseware submission',
              items: [
                'Course name, class period, target students, and teaching context.',
                'Knowledge goals, ability goals, and literacy goals.',
                'Student tasks, teacher guidance, and assessment rubric.',
                'Screenshots or recordings showing how the resource supports teaching.',
              ],
            },
          ],
        },
        {
          id: 'faq',
          label: 'FAQ',
          icon: CircleHelp,
          summary: 'Common issues and recommended fixes.',
          blocks: [
            {
              title: 'The generated result is not what I expected',
              body: 'Return to Prompt Optimization and adjust the structured plan. Be explicit about sensor type, interface, power, alarm condition, and display output.',
            },
            {
              title: 'Can the wiring and code be used directly?',
              body: 'Use them as prototype resources. Before physical wiring or powering on, verify pin definitions, voltage compatibility, grounding, and current limits.',
            },
            {
              title: 'Why complete learning task assessment?',
              body: 'It turns the generated project into an observable learning process, which helps students explain engineering reasoning instead of only downloading a result.',
            },
          ],
        },
      ];
    }

    return [
      {
        id: 'quickstart',
        label: '快速上手',
        icon: Rocket,
        summary: '第一次使用平台时，建议先按这个流程完成一个完整项目。',
        blocks: [
          {
            title: '5 步生成一个物联网课件工程',
            items: [
              '选择主控平台，例如 STM32F103C8T6 Blue Pill 或 ESP32 DevKit。',
              '描述项目需求，写清传感器、显示、报警、通信和真实应用场景。',
              '检查系统优化后的方案，确认硬件、接口、电源和报警逻辑没有理解偏差。',
              '查看电路预览和代码预览，理解接线关系、引脚映射和程序结构。',
              '进入学习任务评价，按步骤完成一问一答，并按需要提交到班级。',
            ],
          },
          {
            title: '需求输入模板',
            body: '我想做一个____系统，使用____传感器，数据显示在____，当____时触发____，用于____场景。',
          },
          {
            title: '第一次使用建议',
            body: '先做一个“监测 + 显示 + 报警”的简单项目，确认生成结果稳定后，再加入联网、数据记录、多传感器联动等扩展要求。',
          },
        ],
      },
      {
        id: 'features',
        label: '功能说明',
        icon: ListChecks,
        summary: '了解左侧每个功能页面分别解决什么问题。',
        blocks: [
          {
            title: '需求输入',
            body: '用于写项目想法并选择主控平台。需求越具体，系统越容易生成可检查、可教学、可修改的工程方案。',
          },
          {
            title: '方案优化',
            body: '用于确认系统是否正确理解你的项目。这里要重点检查主控、传感器、显示模块、报警模块、通信方式和供电要求。',
          },
          {
            title: '电路预览与代码预览',
            body: '电路预览用于查看接线关系和引脚映射；代码预览用于理解固件结构。生成结果适合作为课件原型，真实接线前仍需核对官方引脚和电气安全。',
          },
          {
            title: '学习任务评价',
            body: '把工程过程拆成需求分析、器件选型、接口识别、虚拟接线、安全判断、代码理解、工程导出和反思改进。学生逐题回答，教师可查看过程性反馈。',
          },
          {
            title: '历史项目与班级管理',
            body: '历史项目用于找回以前生成的工程；班级管理用于教师审核学生加入、查看提交记录并给出反馈。',
          },
        ],
      },
      {
        id: 'roles',
        label: '角色说明',
        icon: UsersRound,
        summary: '不同账号看到的功能不同，避免学生误操作教师功能。',
        blocks: [
          {
            title: '普通用户 / 学生',
            items: [
              '可以生成和查看物联网工程资源。',
              '可以完成一问一答学习记录。',
              '可以加入班级并提交学习任务。',
              '可以查看自己的班级状态和教师反馈。',
            ],
          },
          {
            title: '教师',
            items: [
              '可以创建和管理班级。',
              '可以审核学生加入班级。',
              '可以查看学生提交的学习任务记录。',
              '可以根据过程表现填写教师反馈。',
            ],
          },
          {
            title: '管理员',
            body: '管理员除教师功能外，还可以管理用户、硬件库、模型配置等系统后台内容。',
          },
          {
            title: isTeacherLike ? '当前账号提示' : '当前账号提示',
            body: isTeacherLike
              ? '当前账号属于教师或管理员类型，可以查看教师评价反馈和班级管理相关功能。'
              : '当前账号属于普通用户类型，主要完成项目生成、学习任务记录和班级提交。',
          },
        ],
      },
      {
        id: 'courseware',
        label: '课件作品建议',
        icon: GraduationCap,
        summary: '把生成项目整理成可参赛、可教学的课件作品。',
        blocks: [
          {
            title: '系统已经提供的材料',
            items: [
              '项目需求和结构化工程方案。',
              '硬件接线预览、引脚分配和安全提示。',
              '固件代码、README 和工程资源包。',
              '学习任务评价流程、学生作答记录和教师反馈入口。',
            ],
          },
          {
            title: '建议补充的课件要素',
            items: [
              '课程名称、课时安排、适用对象和教学情境。',
              '知识目标、能力目标和素养目标。',
              '学生任务单、教师活动设计和评价量规。',
              '课堂使用截图、学生提交样例或教师反馈样例。',
            ],
          },
          {
            title: '使用建议',
            body: '不要只展示“AI 生成结果”，要突出学生如何通过问题、接线、代码和反思理解工程过程。',
          },
        ],
      },
      {
        id: 'faq',
        label: '常见问题',
        icon: CircleHelp,
        summary: '遇到问题时，可以先从这里排查。',
        blocks: [
          {
            title: '不知道怎么写需求怎么办？',
            body: '按“系统用途 + 传感器 + 显示方式 + 报警条件 + 应用场景”的结构写。例如：做一个温室监测系统，用温湿度传感器，OLED 显示，温度超过阈值时蜂鸣器报警。',
          },
          {
            title: '生成结果不符合预期怎么办？',
            body: '回到方案优化页面，明确修改被识别错的硬件、接口、供电、电压或报警条件，再重新生成。',
          },
          {
            title: '接线图和代码可以直接用于真实硬件吗？',
            body: '建议先作为原型和教学材料使用。真实通电前必须核对主控官方引脚、电压兼容、共地关系和执行器驱动电流。',
          },
          {
            title: '为什么要做学习任务评价？',
            body: '它能把生成结果转化为学习过程，证明学生理解了需求、器件、接口、接线、安全、代码和改进，而不是只下载了一个工程包。',
          },
        ],
      },
    ];
  }, [isTeacherLike, lang]);

  if (!isOpen) return null;

  const activeSection = sections.find(section => section.id === activeSectionId) || sections[0];
  const ActiveIcon = activeSection.icon;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <button
        type="button"
        aria-label={lang === 'zh' ? '关闭帮助文档' : 'Close help docs'}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/25 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-docs-title"
        className="relative z-10 flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
      >
        <div className="h-16 border-b border-neutral-100 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-neutral-950">
                <span id="help-docs-title" className="sr-only">
                  {lang === 'zh' ? '系统帮助文档' : 'System Help Docs'}
                </span>
                {lang === 'zh' ? '系统帮助文档' : 'System Help Docs'}
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {lang === 'zh' ? '快速上手、功能说明、角色权限与常见问题' : 'Quick start, feature guide, roles, and FAQ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-950 hover:border-neutral-900 flex items-center justify-center transition"
            aria-label={lang === 'zh' ? '关闭帮助文档' : 'Close help docs'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr]">
          <nav className="border-b md:border-b-0 md:border-r border-neutral-100 bg-neutral-50/60 p-4 space-y-2 overflow-y-auto">
            {sections.map(section => {
              const SectionIcon = section.icon;
              const isActive = section.id === activeSectionId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left flex items-center gap-3 transition ${
                    isActive
                      ? 'bg-neutral-950 text-white shadow-sm'
                      : 'bg-white border border-neutral-100 text-neutral-600 hover:border-neutral-300 hover:text-neutral-950'
                  }`}
                >
                  <SectionIcon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-black">{section.label}</span>
                </button>
              );
            })}
          </nav>

          <main className="min-h-0 overflow-y-auto p-5 md:p-7">
            <div className="max-w-2xl space-y-6">
              <div className="space-y-3">
                <div className="h-11 w-11 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-950 tracking-tight">{activeSection.label}</h3>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{activeSection.summary}</p>
                </div>
              </div>

              <div className="space-y-4">
                {activeSection.blocks.map(block => (
                  <section key={block.title} className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <h4 className="text-sm font-black text-neutral-950">{block.title}</h4>
                    </div>
                    {block.body && (
                      <p className="pl-6 text-xs leading-relaxed text-neutral-600">{block.body}</p>
                    )}
                    {block.items && (
                      <ul className="pl-6 space-y-2">
                        {block.items.map(item => (
                          <li key={item} className="flex gap-2 text-xs leading-relaxed text-neutral-600">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-300 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex gap-3">
                <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h4 className="text-xs font-black text-amber-950">
                    {lang === 'zh' ? '使用提醒' : 'Reminder'}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                    {lang === 'zh'
                      ? '帮助文档用于快速理解平台流程。真实硬件接线和通电前，请务必结合官方资料进行安全核对。'
                      : 'The help docs explain platform workflow. Before wiring or powering real hardware, always verify against official references.'}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>

        <div className="border-t border-neutral-100 px-5 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <FileText className="h-3.5 w-3.5" />
            <span>{lang === 'zh' ? '默认从快速上手开始，需要时再查看详细功能。' : 'Start with Quick Start, then open details as needed.'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition"
          >
            {lang === 'zh' ? '知道了' : 'Got it'}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};
