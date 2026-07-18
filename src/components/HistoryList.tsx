import React, { useEffect, useState } from 'react';
import { IoTProject } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { 
  History, Calendar, Cpu, Trash2, ArrowRight, 
  AlertCircle, Loader2
} from 'lucide-react';

interface HistoryListProps {
  onSelectProject: (project: IoTProject) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onSelectProject }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<IoTProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.projects.list();
      setProjects(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.projects.delete(projectId);
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center border border-neutral-100 rounded-xl bg-white max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
        <h4 className="font-display font-semibold text-sm text-neutral-800">{t('loginAuthTitle')}</h4>
        <p className="text-xs text-neutral-500">{t('loginAuthDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('historyTitle')}</h2>
          <p className="text-neutral-500 text-xs text-left">{t('historyDesc')}</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-1 px-3 border border-neutral-200 hover:border-neutral-800 font-bold text-xs rounded-lg transition"
        >
          {loading ? t('syncingBtn') : t('syncCloudBtn')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 gap-2 font-mono text-xs text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('loadingHistory')}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 space-y-3">
          <History className="w-8 h-8 text-neutral-300 mx-auto" />
          <h4 className="font-semibold text-xs text-neutral-700">{t('noHistory')}</h4>
          <p className="text-[11px] text-neutral-400">{t('noHistoryDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const isCompleted = proj.status === 'completed';
            return (
              <div
                key={proj.projectId}
                onClick={() => onSelectProject(proj)}
                className="group border border-neutral-250 p-5 rounded-2xl bg-white hover:border-neutral-900 cursor-pointer transition duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${
                      isCompleted ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                    }`}>
                      {proj.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm text-neutral-900 group-hover:text-black line-clamp-1 mt-2.5">
                    {proj.name}
                  </h4>
                  <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-normal">
                    {proj.rawInput}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-50 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[10px] font-bold uppercase">
                    <Cpu className="w-3.5 h-3.5 text-neutral-600" />
                    {proj.recommendedPlatform || 'ESP32'}
                  </div>
                  <div className="flex items-center gap-1 text-neutral-400 hover:text-neutral-900 font-bold transition text-[11px]">
                    {t('viewSchemeOnBoard')}
                    <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
                  </div>
                </div>

                {/* Trash delete button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={(e) => handleDelete(e, proj.projectId)}
                    className="p-1.5 text-neutral-450 hover:text-rose-600 hover:bg-neutral-50 rounded-lg transition"
                    title={t('deleteHistoryTitle')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
