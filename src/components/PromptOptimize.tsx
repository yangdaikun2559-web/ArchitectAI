import React, { useState } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { Sparkles, Sliders, Play, Edit3, HelpCircle, CheckCircle2 } from 'lucide-react';

interface PromptOptimizeProps {
  originalInput: string;
  projectName: string;
  optimizedPrompt: string;
  recommendedPlatform: string;
  recommendedSensors: string;
  recommendedDisplays: string;
  recommendedAlerts: string;
  recommendedNetwork: string;
  recommendedPower: string;
  onModifyPrompt: (val: string) => void;
  onStartGeneration: () => void;
  isGenerating: boolean;
}

export const PromptOptimize: React.FC<PromptOptimizeProps> = ({
  originalInput,
  projectName,
  optimizedPrompt,
  recommendedPlatform,
  recommendedSensors,
  recommendedDisplays,
  recommendedAlerts,
  recommendedNetwork,
  recommendedPower,
  onModifyPrompt,
  onStartGeneration,
  isGenerating,
}) => {
  const { t } = useLanguage();
  const [editablePrompt, setEditablePrompt] = useState(optimizedPrompt);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onModifyPrompt(editablePrompt);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="space-y-2">
        <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">
          {t('optTitle')}
        </h2>
        <p className="text-neutral-500 text-xs">
          {t('optDesc')}
        </p>
      </div>

      {/* Main Grid: Left editor, Right structured analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Readonly original requirement */}
          <div className="border border-neutral-100 rounded-xl bg-neutral-50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-neutral-400 font-semibold tracking-wider">{t('rawReq')}</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal whitespace-pre-wrap">
              {originalInput}
            </p>
          </div>

          {/* Editable optimized prompt */}
          <div className="border border-neutral-200.5 rounded-xl bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neutral-850" />
                <h4 className="font-display font-semibold text-xs text-neutral-900">{t('optSpec')}</h4>
              </div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 flex items-center gap-1 border border-neutral-200 hover:border-neutral-400 px-3 py-1 rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {t('microTuning')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1 rounded-lg transition"
                >
                  {t('saveChange')}
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full min-h-[220px] p-4 text-xs/relaxed font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-950 bg-neutral-50"
              />
            ) : (
              <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-lg min-h-[220px]">
                <p className="text-xs font-mono text-neutral-700 leading-relaxed whitespace-pre-wrap font-normal">
                  {optimizedPrompt}
                </p>
              </div>
            )}

            {/* Prompt Actions */}
            <div className="flex gap-3 justify-end pt-2 text-xs">
              <button
                type="button"
                onClick={onStartGeneration}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-855 text-white font-semibold rounded-lg flex items-center gap-2 transition"
              >
                <Play className="w-4 h-4" />
                {isGenerating ? t('generatingBtn') : t('generateBtn')}
              </button>
            </div>
          </div>
        </div>

        {/* Structured properties sidebar */}
        <div className="space-y-6">
          <div className="border border-neutral-200/50 rounded-xl bg-white p-5 shadow-sm space-y-4 h-full">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-50">
              <Sliders className="w-4.5 h-4.5 text-neutral-800" />
              <h4 className="font-display font-semibold text-xs text-neutral-900 tracking-tight">{t('structHardware')}</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertyMcu')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedPlatform}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertySensor')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedSensors || "未检测到对应传感器"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertyDisplay')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedDisplays || "未检测到显示屏"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertyAlert')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedAlerts || "未配置主动警报部件"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertyNetwork')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedNetwork || "单机离线运行"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 font-semibold tracking-wider uppercase block">{t('propertyPower')}</span>
                <span className="text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200/50 inline-block">
                  {recommendedPower || "USB 5V 安全电压"}
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 text-[10px] font-medium leading-normal text-neutral-500 border border-neutral-150 mt-4.5">
              {t('optTip')}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Layout visualization */}
      <div className="flex items-center justify-between border border-neutral-100 rounded-xl bg-white p-4 text-xs font-medium text-neutral-500 shadow-xs max-w-4xl">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <CheckCircle2 className="w-4.5 h-4.5 text-neutral-400" />
          <span>{t('stepTitle1')}</span>
        </div>
        <div className="h-px bg-neutral-100 w-8 flex-1" />
        <div className="flex items-center gap-1.5 text-neutral-900 font-bold">
          <span className="bg-neutral-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
          <span>{t('stepTitle2')}</span>
        </div>
        <div className="h-px bg-neutral-100 w-8 flex-1" />
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="bg-neutral-100 text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
          <span>{t('stepTitle3')}</span>
        </div>
        <div className="h-px bg-neutral-100 w-8 flex-1" />
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="bg-neutral-100 text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">4</span>
          <span>{t('stepTitle4')}</span>
        </div>
        <div className="h-px bg-neutral-100 w-8 flex-1" />
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="bg-neutral-100 text-neutral-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">5</span>
          <span>{t('stepTitle5')}</span>
        </div>
      </div>
    </div>
  );
};
