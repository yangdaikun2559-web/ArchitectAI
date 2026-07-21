import React, { useState } from 'react';
import { Cpu, Terminal, Sparkles, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';

interface RequirementInputProps {
  onSubmit: (rawInput: string, platform: 'ESP32' | 'STM32', provider: 'gemini' | 'deepseek', model?: string) => void;
  isLoading: boolean;
  onLoadDemo?: () => void;
}

export const RequirementInput: React.FC<RequirementInputProps> = ({ onSubmit, isLoading, onLoadDemo }) => {
  const { user, profile } = useAuth();
  const { lang, t } = useLanguage();
  const [platform, setPlatform] = useState<'ESP32' | 'STM32'>('STM32');
  const [provider, setProvider] = useState<'gemini' | 'deepseek'>('deepseek');
  const [deepseekModel, setDeepseekModel] = useState<string>('deepseek-chat');
  const [rawInput, setRawInput] = useState('');

  const username = user ? (profile?.displayName || user.displayName || 'Developer') : (lang === 'zh' ? '开发者' : 'Developer');

  const getPeriodGreeting = () => {
    const hour = new Date().getHours();
    let greet = '';
    if (hour >= 5 && hour < 12) {
      greet = lang === 'zh' ? '早上好' : 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      greet = lang === 'zh' ? '下午好' : 'Good afternoon';
    } else {
      greet = lang === 'zh' ? '晚上好' : 'Good evening';
    }
    return `${greet}，${username}`;
  };

  const suggestions = [
    {
      title: t('sug1_title'),
      desc: t('sug1_desc'),
    },
    {
      title: t('sug2_title'),
      desc: t('sug2_desc'),
    },
    {
      title: t('sug3_title'),
      desc: t('sug3_desc'),
    },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSubmit(rawInput.trim(), platform, provider, provider === 'deepseek' ? deepseekModel : undefined);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Intro Greetings card */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-display font-bold text-2xl text-neutral-900 tracking-tight">
            {getPeriodGreeting()} 👋
          </h2>
          <p className="text-neutral-500 text-sm">{t('inputDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* MCU Selector Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold tracking-wider uppercase text-neutral-400 block font-mono">{t('mcuPlatform')}</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPlatform('STM32')}
              className={`p-5 rounded-2xl border text-left flex gap-4 transition-all duration-200 ${
                platform === 'STM32'
                  ? 'border-neutral-900 bg-neutral-950 text-white shadow-md shadow-neutral-200'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                platform === 'STM32' ? 'bg-neutral-800' : 'bg-neutral-50'
              }`}>
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">STM32F103C8T6 Blue Pill</h4>
                <p className="text-[10px] mt-1 opacity-70">{t('mcuSTM32Desc')}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('ESP32')}
              className={`p-5 rounded-2xl border text-left flex gap-4 transition-all duration-200 ${
                platform === 'ESP32'
                  ? 'border-neutral-900 bg-neutral-950 text-white shadow-md shadow-neutral-200'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                platform === 'ESP32' ? 'bg-neutral-800' : 'bg-neutral-50'
              }`}>
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">ESP32 DevKit WROOM</h4>
                <p className="text-[10px] mt-1 opacity-70">{t('mcuESP32Desc')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Text Area prompt entry */}
        <div className="space-y-3">
          <label className="text-xs font-bold tracking-wider uppercase text-neutral-400 block font-mono">{t('designDesc')}</label>
          <div className="relative">
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={t('placeholderText')}
              className="w-full min-h-[160px] p-5 text-sm/relaxed rounded-2xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition focus:ring-1 focus:ring-neutral-900 pr-12 resize-none leading-relaxed"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-mono font-medium text-neutral-400">
              {rawInput.length} {t('charCount')}
            </div>
          </div>
        </div>

        {/* AI Compilation Engine & Model Selection */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wider uppercase text-neutral-400 block font-mono">{t('aiEngine')}</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'gemini' | 'deepseek')}
                  className="w-full p-4 text-sm rounded-2xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 transition focus:ring-1 focus:ring-neutral-900 appearance-none font-sans font-semibold cursor-pointer pr-10"
                >
                  <option value="deepseek">DeepSeek V3 / Coder</option>
                  <option value="gemini">Gemini 3.5 Flash</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {provider === 'deepseek' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider uppercase text-neutral-400 block font-mono">DeepSeek 模型版本</label>
                <div className="relative">
                  <select
                    value={deepseekModel}
                    onChange={(e) => setDeepseekModel(e.target.value)}
                    className="w-full p-4 text-sm rounded-2xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 transition focus:ring-1 focus:ring-neutral-900 appearance-none font-sans font-semibold cursor-pointer pr-10"
                  >
                    <option value="deepseek-chat">默认 (deepseek-chat)</option>
                    <option value="deepseek-v4-flash">闪电版 (deepseek-v4-flash)</option>
                    <option value="deepseek-v4-pro">专业版 (deepseek-v4-pro)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">
            {provider === 'deepseek' 
              ? (lang === 'zh' ? `当前使用的 DeepSeek 模型为: ${deepseekModel}。在大模型代码精准推理与物理布线引脚连接逻辑上极其出彩，适用于稳定生成。` : `Currently using DeepSeek model: ${deepseekModel}. Exceptional performance in codebase logic reasoning and precise physical pin routing.`) 
              : (lang === 'zh' ? '备选：多模态及提示词处理响应极速（若切换，请确保您已在本地配置相应的 GEMINI_API_KEY 环境变量）。' : 'Alternative: Rapid response in multi-modal task reasoning. (Requires local GEMINI_API_KEY).')}
          </p>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !rawInput.trim()}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-medium text-xs rounded-xl shadow-lg shadow-neutral-200/50 flex items-center gap-2.5 transition active:scale-95"
          >
            <Sparkles className="w-4.5 h-4.5" />
            {isLoading ? t('optimizingBtn') : t('optimizeBtn')}
          </button>
        </div>
      </form>

      {/* Suggested prompts library */}
      <div className="space-y-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-2 text-neutral-800">
          <BookOpen className="w-4 h-4 text-neutral-600" />
          <h3 className="font-display font-semibold text-sm tracking-tight">{t('presetTitle')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRawInput(sug.desc || '')}
              className="p-4 border border-neutral-200 hover:border-neutral-400 bg-white text-left rounded-xl transition duration-200 space-y-2 hover:shadow-sm"
            >
              <h5 className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-500" />
                {sug.title}
              </h5>
              <p className="text-[10px]/relaxed text-neutral-500 mt-1 line-clamp-3">{sug.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
