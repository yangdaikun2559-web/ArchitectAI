import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { Cpu, LogOut, LogIn, Bell, Monitor, HelpCircle, Languages } from 'lucide-react';
import { api } from '../lib/api';
import { ClassJoinRequest } from '../types';
import { HelpDocsModal } from './HelpDocsModal';
import { maskStudentName } from '../lib/privacy';

export const TopNavbar: React.FC = () => {
  const { user, profile, signIn, signOut } = useAuth();
  const { toggleLanguage, t } = useLanguage();
  const brandSub = t('brandSub');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpDocs, setShowHelpDocs] = useState(false);
  const [joinRequests, setJoinRequests] = useState<ClassJoinRequest[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const isTeacherLike = profile?.role === 'teacher' || profile?.role === 'admin' || profile?.role === 'superadmin';
  const notificationCount = useMemo(() => (
    isTeacherLike
      ? joinRequests.filter(item => item.status === 'pending').length
      : joinRequests.filter(item => item.status !== 'pending').length
  ), [isTeacherLike, joinRequests]);

  const loadNotifications = async () => {
    if (!user || !profile) {
      setJoinRequests([]);
      return;
    }
    setNoticeLoading(true);
    try {
      const nextRequests = isTeacherLike
        ? await api.classroom.listPendingJoinRequests()
        : await api.classroom.listMyJoinRequests();
      setJoinRequests(nextRequests);
    } catch (err) {
      console.warn('Failed to load class join notifications:', err);
    } finally {
      setNoticeLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.userId, profile?.role]);

  const reviewRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    await api.classroom.reviewJoinRequest(requestId, { decision });
    await loadNotifications();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand logo in Swiss modern style */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 shadow-sm text-white">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-neutral-900 text-sm tracking-tight">{t('brandTitle')}</h1>
            {brandSub && (
              <p className="text-[10px] font-mono text-neutral-400 font-medium">{brandSub}</p>
            )}
          </div>
        </div>

        {/* Global Toolbar and Auth credentials */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(prev => !prev);
                loadNotifications();
              }}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg transition hover:bg-neutral-50 relative"
            >
              <Bell className="w-4.5 h-4.5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-3 w-96 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-950">
                      {isTeacherLike ? '班级加入审批' : '班级通知'}
                    </h3>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {isTeacherLike ? '处理学生提交的加入班级申请' : '查看班级申请审批结果'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadNotifications}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-bold text-neutral-600 hover:border-neutral-900 hover:text-neutral-950"
                  >
                    {noticeLoading ? '刷新中' : '刷新'}
                  </button>
                </div>

                <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
                  {joinRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-400">
                      暂无班级通知
                    </div>
                  ) : joinRequests.map(request => (
                    <div key={request.requestId} className="rounded-xl border border-neutral-150 bg-neutral-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-neutral-950">
                            {isTeacherLike ? maskStudentName(request.studentName, request.studentId) : request.className}
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {isTeacherLike
                              ? `申请加入：${request.className}`
                              : request.status === 'approved'
                                ? '申请已通过'
                                : request.status === 'rejected'
                                  ? '申请未通过'
                                  : '等待班级管理员审批'}
                          </div>
                          {request.username && isTeacherLike && (
                            <div className="mt-1 font-mono text-[10px] text-neutral-400">@{request.username}</div>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono font-black uppercase ${
                          request.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : request.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {request.status}
                        </span>
                      </div>

                      {isTeacherLike && request.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => reviewRequest(request.requestId, 'approved')}
                            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-neutral-800"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewRequest(request.requestId, 'rejected')}
                            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 hover:border-neutral-900 hover:text-neutral-950"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg transition hover:bg-neutral-50">
            <Monitor className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelpDocs(true)}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg transition hover:bg-neutral-50"
            title="系统帮助文档"
            aria-label="系统帮助文档"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={toggleLanguage}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg transition hover:bg-neutral-50"
            title="切换语言/语音 Switch Language/Speech"
          >
            <Languages className="w-4.5 h-4.5" />
          </button>

          <div className="h-5 w-px bg-neutral-100" />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-neutral-800 leading-none">{profile?.displayName || user.displayName || 'Developer'}</p>
                <p className="text-[10px] font-mono text-neutral-400 font-medium">{profile?.role?.toUpperCase() || 'USER'}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-display font-semibold text-xs border border-neutral-200">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <button 
                onClick={signOut}
                className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition text-xs flex items-center gap-1.5 font-bold"
                title={t('signOut')}
              >
                <LogOut className="w-4 h-4" />
                {t('signOut')}
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-medium flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {t('signIn')}
            </button>
          )}
        </div>
      </div>
      <HelpDocsModal
        isOpen={showHelpDocs}
        onClose={() => setShowHelpDocs(false)}
      />
    </header>
  );
};
