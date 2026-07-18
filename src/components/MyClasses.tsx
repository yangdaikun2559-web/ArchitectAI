import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  MessageSquareText,
  RefreshCw,
  School,
  Send,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import { ClassJoinRequest, ClassRoom, LearningSubmission } from '../types';

interface MyClassesProps {
  onGoToLearning: (classId: string) => void;
}

function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getClassJoinCode(classRoom: ClassRoom) {
  return classRoom.joinCode || `CLASS-${classRoom.classId.slice(-6).toUpperCase()}`;
}

export const MyClasses: React.FC<MyClassesProps> = ({ onGoToLearning }) => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [submissions, setSubmissions] = useState<LearningSubmission[]>([]);
  const [joinRequests, setJoinRequests] = useState<ClassJoinRequest[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const selectedClass = classes.find(item => item.classId === selectedClassId) || classes[0] || null;

  const classStats = useMemo(() => {
    const result = new Map<string, {
      total: number;
      reviewed: number;
      pending: number;
      latest?: LearningSubmission;
    }>();

    submissions.forEach(submission => {
      const current = result.get(submission.classId) || { total: 0, reviewed: 0, pending: 0 };
      current.total += 1;
      if (submission.status === 'reviewed') current.reviewed += 1;
      if (submission.status === 'submitted') current.pending += 1;
      if (!current.latest || submission.createdAt.localeCompare(current.latest.createdAt) > 0) {
        current.latest = submission;
      }
      result.set(submission.classId, current);
    });

    return result;
  }, [submissions]);

  const selectedSubmissions = useMemo(() => (
    selectedClass ? submissions.filter(item => item.classId === selectedClass.classId) : []
  ), [selectedClass, submissions]);

  const statCards: Array<{ label: string; value: number; Icon: LucideIcon; color: string }> = selectedClass
    ? [
      {
        label: '任务提交',
        value: selectedSubmissions.length,
        Icon: ClipboardCheck,
        color: 'text-neutral-950',
      },
      {
        label: '待教师反馈',
        value: selectedSubmissions.filter(item => item.status === 'submitted').length,
        Icon: Clock3,
        color: 'text-amber-700',
      },
      {
        label: '已反馈',
        value: selectedSubmissions.filter(item => item.status === 'reviewed').length,
        Icon: CheckCircle2,
        color: 'text-emerald-700',
      },
      {
        label: '关联项目',
        value: new Set(selectedSubmissions.map(item => item.projectId).filter(Boolean)).size,
        Icon: School,
        color: 'text-sky-700',
      },
    ]
    : [];

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextClasses, nextSubmissions, nextJoinRequests] = await Promise.all([
        api.classroom.listStudentClasses(),
        api.classroom.listStudentSubmissions(),
        api.classroom.listMyJoinRequests(),
      ]);
      setClasses(nextClasses);
      setSubmissions(nextSubmissions);
      setJoinRequests(nextJoinRequests);
      setSelectedClassId(current => current || nextClasses[0]?.classId || '');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '班级数据加载失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setNotice('请输入班级加入码或邀请链接。');
      return;
    }

    setJoining(true);
    setNotice('');
    try {
      const result = await api.classroom.joinClass(joinCode);
      const classRoom = result.classRoom;
      setClasses(prev => {
        if (result.status !== 'joined' || prev.some(item => item.classId === result.classRoom.classId)) return prev;
        return [result.classRoom, ...prev];
      });
      if (result.status === 'joined') {
        setSelectedClassId(result.classRoom.classId);
      }
      setJoinCode('');
      setNotice(`已加入班级：${classRoom.name}`);
      setNotice(result.status === 'pending'
        ? `已提交加入申请，等待班级管理员审批：${result.classRoom.name}`
        : `已加入班级：${result.classRoom.name}`);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '加入班级失败。');
    } finally {
      setJoining(false);
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto space-y-5">
      <div className="border-b border-neutral-100 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">我的班级</h2>
          <p className="text-neutral-500 text-xs text-left mt-1">
            查看已加入班级、学习任务提交记录和教师反馈，也可以通过加入码进入新的班级。
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="w-fit px-3 py-2 border border-neutral-200 hover:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-950 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800">
          {notice}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-950">加入班级</h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                支持输入完整加入码、短码，或教师复制的邀请链接。
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[520px]">
            <input
              value={joinCode}
              onChange={event => setJoinCode(event.target.value)}
              placeholder="例如 CLASS-RRRO6S 或邀请链接"
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <button
              type="button"
              onClick={handleJoinClass}
              disabled={joining}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {joining ? '加入中...' : '加入班级'}
            </button>
          </div>
        </div>
      </div>

      {joinRequests.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-neutral-950">加入申请</h3>
              <p className="mt-1 text-[11px] text-neutral-500">审批通过后，班级会自动出现在已加入列表中。</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {joinRequests.slice(0, 4).map(request => (
              <div key={request.requestId} className="rounded-xl border border-neutral-150 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-neutral-950">{request.className}</div>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      {request.status === 'pending'
                        ? '等待班级管理员审批'
                        : request.status === 'approved'
                          ? '审批已通过'
                          : '审批未通过'}
                    </div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-neutral-950">已加入班级</h3>
              <p className="mt-1 text-[11px] text-neutral-500">共 {classes.length} 个班级</p>
            </div>
            <School className="w-5 h-5 text-neutral-300" />
          </div>
          <div className="max-h-[620px] overflow-y-auto p-3 space-y-2">
            {classes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
                暂未加入任何班级
              </div>
            ) : classes.map(classRoom => {
              const stats = classStats.get(classRoom.classId) || { total: 0, reviewed: 0, pending: 0 };
              const active = selectedClass?.classId === classRoom.classId;
              return (
                <button
                  key={classRoom.classId}
                  type="button"
                  onClick={() => setSelectedClassId(classRoom.classId)}
                  className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                    active
                      ? 'border-neutral-900 bg-neutral-950 text-white'
                      : 'border-neutral-150 bg-neutral-50 text-neutral-850 hover:bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{classRoom.name}</div>
                      <div className={`mt-1 font-mono text-[10px] ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {getClassJoinCode(classRoom)}
                      </div>
                    </div>
                    <UsersRound className={`w-4 h-4 shrink-0 ${active ? 'text-neutral-300' : 'text-neutral-400'}`} />
                  </div>
                  <div className={`mt-3 grid grid-cols-3 gap-2 text-[10px] ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    <span>提交 {stats.total}</span>
                    <span>待评 {stats.pending}</span>
                    <span>反馈 {stats.reviewed}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm min-h-[560px]">
          {!selectedClass ? (
            <div className="h-full min-h-96 flex flex-col items-center justify-center text-center text-neutral-400 gap-3">
              <School className="w-10 h-10" />
              <div className="text-sm font-bold text-neutral-650">请选择或加入一个班级</div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-neutral-100 pb-5">
                <div>
                  <div className="text-[10px] font-mono font-black text-neutral-400 uppercase">Current Class</div>
                  <h3 className="mt-1 font-display text-lg font-black text-neutral-950">{selectedClass.name}</h3>
                  {selectedClass.description && (
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500">{selectedClass.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-[10px] font-black text-neutral-700">
                      {getClassJoinCode(selectedClass)}
                    </span>
                    <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-bold text-neutral-500">
                      创建于 {formatTime(selectedClass.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToLearning(selectedClass.classId)}
                  className="w-fit rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 flex items-center gap-2"
                >
                  <BookOpenCheck className="w-4 h-4" />
                  去完成学习任务
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map(({ label, value, Icon, color }) => (
                  <div key={label} className="rounded-xl border border-neutral-150 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase text-neutral-400">{label}</span>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className={`mt-2 text-xl font-black ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-neutral-800" />
                  <h4 className="text-xs font-black text-neutral-950">学习任务与教师反馈</h4>
                </div>

                {selectedSubmissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
                    当前班级暂无学习任务提交记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSubmissions.map(submission => (
                      <div key={submission.submissionId} className="rounded-xl border border-neutral-150 bg-white p-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-neutral-950 truncate">{submission.title}</div>
                            <div className="mt-1 text-[11px] text-neutral-500">
                              {submission.projectName || submission.projectId || '未关联项目'} · {formatTime(submission.createdAt)}
                            </div>
                          </div>
                          <span className={`w-fit rounded-lg border px-2 py-1 text-[10px] font-mono font-black uppercase ${
                            submission.status === 'reviewed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {submission.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                          </span>
                        </div>
                        {submission.aiFeedback && (
                          <div className={`mt-3 rounded-lg border p-3 ${
                            submission.aiStatus === 'completed'
                              ? 'border-sky-100 bg-sky-50/70'
                              : 'border-amber-100 bg-amber-50/70'
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[10px] font-mono font-black uppercase ${
                              submission.aiStatus === 'completed' ? 'text-sky-700' : 'text-amber-700'
                            }`}>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>AI 助教初评{submission.aiScore === undefined ? '' : ` · ${submission.aiScore}/100`}</span>
                            </div>
                            {submission.aiObjectiveTotal !== undefined && submission.aiObjectiveTotal > 0 && (
                              <div className="mt-1 text-[10px] font-mono font-black text-sky-800">
                                客观题：{submission.aiObjectiveCorrect ?? 0}/{submission.aiObjectiveTotal}
                              </div>
                            )}
                            <p className={`mt-1 whitespace-pre-wrap text-xs leading-relaxed ${
                              submission.aiStatus === 'completed' ? 'text-sky-900' : 'text-amber-900'
                            }`}>
                              {submission.aiFeedback}
                            </p>
                          </div>
                        )}
                        {submission.status === 'reviewed' && (
                          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                            <div className="text-[10px] font-mono font-black uppercase text-emerald-700">
                              教师反馈 {submission.score === undefined ? '' : `· ${submission.score} 分`}
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-emerald-900">
                              {submission.teacherFeedback || '教师已完成评价。'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
