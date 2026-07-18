import React from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { 
  Keyboard, Sparkles, Binary, Sliders, Database, History, 
  Settings, UserCheck, AlertTriangle, ClipboardCheck, UsersRound, School
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  hasActiveProject: boolean;
  isAdmin?: boolean;
  canManageClasses?: boolean;
  canViewMyClasses?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, hasActiveProject, isAdmin = false, canManageClasses = false, canViewMyClasses = false }) => {
  const { t } = useLanguage();
  const classManagementLabel = t('classManagement') === 'classManagement' ? '班级管理' : t('classManagement');

  return (
    <aside className="w-60 border-r border-neutral-100 bg-white h-[calc(100vh-4rem)] sticky top-16 flex flex-col justify-between py-6 px-4">
      <div className="space-y-6">
        {/* Workspace section */}
        <div>
          <p className="px-3 text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase mb-2">
            {t('workspace')}
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('input')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'input' 
                  ? 'bg-neutral-900 text-white' 
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              {t('step1')}
            </button>

            <button
              onClick={() => onTabChange('optimize')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'optimize'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-4 h-4" />
                {t('step2')}
              </span>
              {hasActiveProject && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />}
            </button>

            <button
              onClick={() => onTabChange('progress')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'progress'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              {t('step3')}
            </button>

            <button
              onClick={() => onTabChange('preview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'preview'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Database className="w-4 h-4" />
              {t('step4')}
            </button>

            <button
              onClick={() => onTabChange('code')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'code'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Binary className="w-4 h-4" />
              {t('step5')}
            </button>

            <button
              onClick={() => onTabChange('download')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'download'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              {t('step6')}
            </button>
          </nav>
        </div>

        {/* Data Records section */}
        <div>
          <p className="px-3 text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase mb-2">
            {t('records')}
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('history')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentTab === 'history' 
                  ? 'bg-neutral-900 text-white' 
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <History className="w-4 h-4" />
              {t('history')}
            </button>

            {canViewMyClasses && (
              <button
                onClick={() => onTabChange('myClasses')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'myClasses'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <School className="w-4 h-4" />
                我的班级
              </button>
            )}

            {canManageClasses && (
              <button
                onClick={() => onTabChange('classroom')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'classroom'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <UsersRound className="w-4 h-4" />
                {classManagementLabel}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => onTabChange('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'admin' 
                    ? 'bg-neutral-900 text-white' 
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                {t('admin')}
              </button>
            )}
          </nav>
        </div>

        {/* Support disclaimer note */}
        <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3">
          <div className="flex gap-2 text-orange-850">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold tracking-tight">{t('disclaimerTitle')}</p>
              <p className="text-[9px] text-orange-750 font-medium leading-normal mt-1">{t('disclaimerDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-4 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-neutral-400 font-semibold uppercase">
          {t('account')}
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-600">
          <UserCheck className="w-4 h-4" />
          <span>{t('quota')}</span>
        </div>
      </div>
    </aside>
  );
};
