import React, { useEffect, useState } from 'react';
import { GenerationStepLog } from '../types';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface TaskProgressProps {
  projectName: string;
  logs: GenerationStepLog[];
  onRetry: () => void;
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({
  projectName,
  logs,
  onRetry,
  status,
  errorMessage,
}) => {
  const { t, lang } = useLanguage();
  const [progressVals, setProgressVals] = useState({
    scheme: 0,
    schematic: 0,
    code: 0,
    jszip: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Timer counter
  useEffect(() => {
    if (status !== 'generating') {
      return;
    }

    setElapsedTime(0);
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Alive progressive bar simulation
  useEffect(() => {
    if (status !== 'generating') {
      if (status === 'completed') {
        setProgressVals({ scheme: 100, schematic: 100, code: 100, jszip: 100 });
      }
      return;
    }

    const interval = setInterval(() => {
      setProgressVals(prev => {
        const nextScheme = prev.scheme < 100 ? prev.scheme + (100 - prev.scheme) * 0.15 + 0.5 : 100;
        
        let nextSchematic = prev.schematic;
        if (prev.scheme >= 60) {
          nextSchematic = prev.schematic < 99 ? prev.schematic + (99 - prev.schematic) * 0.10 + 0.3 : 99;
        }

        let nextCode = prev.code;
        if (prev.schematic >= 60) {
          nextCode = prev.code < 98 ? prev.code + (98 - prev.code) * 0.06 + 0.2 : 98;
        }

        let nextJszip = prev.jszip;
        if (prev.code >= 80) {
          nextJszip = prev.jszip < 95 ? prev.jszip + (95 - prev.jszip) * 0.05 + 0.1 : 95;
        }

        return {
          scheme: Math.min(Math.round(nextScheme), 100),
          schematic: Math.min(Math.round(nextSchematic), 99),
          code: Math.min(Math.round(nextCode), 98),
          jszip: Math.min(Math.round(nextJszip), 95),
        };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Heading */}
      <div className="space-y-2">
        <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('progTitle')}</h2>
        <p className="text-neutral-500 text-xs">{t('progDesc')}</p>
      </div>

      {/* Task Details Grid */}
      <div className="border border-neutral-100 rounded-xl bg-white p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase block tracking-wider">{t('taskName')}</span>
          <span className="text-xs font-semibold text-neutral-800 line-clamp-1 mt-1">{projectName || "IoT Prototype System"}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase block tracking-wider">{t('taskStatus')}</span>
          <div className="mt-1 flex items-center gap-2">
            {status === 'generating' && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-700 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('statusGenerating')}
              </span>
            )}
            {status === 'completed' && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700">
                {t('statusCompleted')}
              </span>
            )}
            {status === 'failed' && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-rose-50 text-rose-700">
                {t('statusFailed')}
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase block tracking-wider">{t('estTime')}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-mono font-semibold text-neutral-800">{formatTime(elapsedTime)}</span>
            {status === 'generating' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
            )}
            {status === 'completed' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Completed" />
            )}
            {status === 'failed' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" title="Failed" />
            )}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase block tracking-wider">{t('actions')}</span>
          {status === 'failed' && (
            <button
              onClick={onRetry}
              className="mt-1 px-3 py-1 border border-neutral-200 hover:border-neutral-800 text-neutral-700 hover:text-neutral-900 font-bold text-[10px] rounded-md transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('rebuildBtn')}
            </button>
          )}
          {status === 'generating' && (
            <span className="text-[10px] text-neutral-400 mt-1 block font-medium">{t('waitSubmit')}</span>
          )}
          {status === 'completed' && (
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">{t('autoSaved')}</span>
          )}
        </div>
      </div>

      {status === 'failed' && (
        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex gap-3 text-rose-950">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-semibold text-xs leading-none">{t('failedAlert')}</h5>
            <p className="text-[11px] text-rose-700 leading-normal font-normal">
              {t('errorLabel')} {errorMessage || t('errorDefault')}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Logs on left, Progress output on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step Logs Panel */}
        <div className="border border-neutral-100 rounded-xl bg-white p-5 shadow-sm flex flex-col h-[340px]">
          <h4 className="font-display font-semibold text-xs text-neutral-900 border-b border-neutral-50 pb-3 mb-3">
            {t('stepsStream')}
          </h4>
          <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[10px]/relaxed pr-2">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-neutral-400 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`font-medium ${
                  log.status === 'success' ? 'text-emerald-600 font-semibold' :
                  log.status === 'error' ? 'text-rose-600 font-bold' :
                  log.status === 'warn' ? 'text-yellow-600' :
                  'text-neutral-600'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            {status === 'generating' && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                {t('loadingPipe')}
              </div>
            )}
          </div>
        </div>

        {/* Deliverables Panel */}
        <div className="border border-neutral-100 rounded-xl bg-white p-5 shadow-sm flex flex-col h-[340px] justify-between">
          <div>
            <h4 className="font-display font-semibold text-xs text-neutral-900 border-b border-neutral-50 pb-3 mb-3">
              {t('outputsGauges')}
            </h4>
            <div className="space-y-4">
              {/* Deliverable 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                  <span>{t('architecturePlan')}</span>
                  <span className="font-mono text-neutral-500 font-bold">{progressVals.scheme}%</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${progressVals.scheme}%` }} />
                </div>
              </div>

              {/* Deliverable 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                  <span>{t('wiringPinMap')}</span>
                  <span className="font-mono text-neutral-500 font-bold">{progressVals.schematic}%</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${progressVals.schematic}%` }} />
                </div>
              </div>

              {/* Deliverable 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                  <span>{t('firmwareCodes')}</span>
                  <span className="font-mono text-neutral-500 font-bold">{progressVals.code}%</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${progressVals.code}%` }} />
                </div>
              </div>

              {/* Deliverable 4 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                  <span>{t('zipPackaging')}</span>
                  <span className="font-mono text-neutral-500 font-bold">{progressVals.jszip}%</span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${progressVals.jszip}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-3 text-[10px] text-neutral-500 leading-normal border border-neutral-150">
            {t('processNotice')}
          </div>
        </div>
      </div>
    </div>
  );
};
