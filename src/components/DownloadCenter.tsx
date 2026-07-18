import React from 'react';
import { FileArchive } from 'lucide-react';
import { IoTProject } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { EngineeringScaffold } from './EngineeringScaffold';

interface DownloadCenterProps {
  project: IoTProject | null;
  onDownloadZip: () => void;
  onNavigateToTab: (tab: string) => void;
  canViewTeacherFeedback: boolean;
  preferredClassId?: string;
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({ project, onDownloadZip, onNavigateToTab, canViewTeacherFeedback, preferredClassId }) => {
  const { t, lang } = useLanguage();
  const downloadDescription = canViewTeacherFeedback
    ? t('downloadDesc')
    : (lang === 'zh'
      ? '按照需求分析、器件选型、接口识别、虚拟接线、安全判断、代码理解、工程导出和反思改进的流程，记录学习过程。'
      : 'Guides the learning flow through requirement analysis, component selection, interface recognition, virtual wiring, safety checks, code reading, export, and reflection.');

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('downloadTitle')}</h2>
        <p className="text-neutral-500 text-xs text-left mt-1">
          {downloadDescription}
        </p>
      </div>

      {!project ? (
        <div className="p-12 text-center border border-dashed border-neutral-200 rounded-2xl bg-white space-y-4">
          <FileArchive className="w-8 h-8 text-neutral-300 mx-auto" />
          <h4 className="font-semibold text-xs text-neutral-700">{t('noActiveProj')}</h4>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
            {t('noActiveProjDesc')}
          </p>
          <button
            onClick={() => onNavigateToTab('input')}
            className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition shadow-sm"
          >
            {t('startNewProj')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <EngineeringScaffold
            canViewTeacherFeedback={canViewTeacherFeedback}
            project={project}
            preferredClassId={preferredClassId}
          />
        </div>
      )}
    </div>
  );
};
