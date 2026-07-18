import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  MessageSquareText,
  MoreVertical,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Target,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { ClassMember, ClassRoom, ClassTeacherMember, LearningPortrait, LearningQuestion, LearningSubmission } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const taskLabels: Record<string, string> = {
  requirement: '需求分析',
  components: '器件选型',
  interfaces: '接口识别',
  wiring: '虚拟接线',
  safety: '安全判断',
  code: '代码理解',
  export: '工程导出',
  reflection: '反思改进',
};

type SubmissionFilter = 'all' | 'submitted' | 'reviewed';
type ListMode = 'submissions' | 'students';
type ManageTab = 'classes' | 'teachers';

function formatTime(value: string | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function parseSubmissionContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.prompts) && Array.isArray(parsed.responses)) {
      return parsed as {
        task?: string;
        rubric?: string;
        questions?: LearningQuestion[];
        prompts: string[];
        responses: string[];
        objectiveSummary?: {
          total: number;
          correct: number;
        };
        steps?: Array<{
          stepId: string;
          index: string;
          title: string;
          task: string;
          prompts: string[];
          questions?: LearningQuestion[];
          responses: string[];
          objectiveSummary?: {
            total: number;
            correct: number;
          };
          rubric?: string;
          completed?: boolean;
        }>;
      };
    }
  } catch {
    return null;
  }
  return null;
}

function getPortraitLevelStyle(level: string) {
  if (level === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (level === 'stable') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (level === 'risk') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function getPortraitBarStyle(level: string) {
  if (level === 'strong') return 'bg-emerald-500';
  if (level === 'stable') return 'bg-sky-500';
  if (level === 'risk') return 'bg-rose-500';
  return 'bg-amber-500';
}

function clampPortraitScore(score: number | undefined) {
  return Math.max(0, Math.min(100, score ?? 0));
}

export const ClassManagement: React.FC = () => {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [teacherTeam, setTeacherTeam] = useState<ClassTeacherMember[]>([]);
  const [submissions, setSubmissions] = useState<LearningSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [listMode, setListMode] = useState<ListMode>('submissions');
  const [filter, setFilter] = useState<SubmissionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [manageClassQuery, setManageClassQuery] = useState('');
  const [manageMemberQuery, setManageMemberQuery] = useState('');
  const [manageTeacherQuery, setManageTeacherQuery] = useState('');
  const [manageTab, setManageTab] = useState<ManageTab>('classes');
  const [openClassMenuId, setOpenClassMenuId] = useState('');
  const [openMemberMenuId, setOpenMemberMenuId] = useState('');
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [renameClassName, setRenameClassName] = useState('');
  const [renameClassDescription, setRenameClassDescription] = useState('');
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showRenameClass, setShowRenameClass] = useState(false);
  const [showManageClass, setShowManageClass] = useState(false);
  const [showJoinClassPopup, setShowJoinClassPopup] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<ClassMember | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<ClassMember | null>(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentUsername, setEditStudentUsername] = useState('');
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [score, setScore] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [learningPortrait, setLearningPortrait] = useState<LearningPortrait | null>(null);
  const [isPortraiting, setIsPortraiting] = useState(false);
  const [submissionStepPage, setSubmissionStepPage] = useState(0);

  const selectedClass = classes.find(item => item.classId === selectedClassId) || null;
  const selectedSubmission = submissions.find(item => item.submissionId === selectedSubmissionId) || null;
  const selectedMember = members.find(item => item.userId === selectedMemberId) || null;
  const portraitStudentId = listMode === 'students' ? selectedMember?.userId : selectedSubmission?.studentId;
  const submittedCount = submissions.filter(item => item.status === 'submitted').length;
  const reviewedCount = submissions.filter(item => item.status === 'reviewed').length;
  const parsedContent = selectedSubmission ? parseSubmissionContent(selectedSubmission.content) : null;
  const submittedSteps = parsedContent?.steps || [];
  const submittedStepCount = submittedSteps.length;
  const currentSubmittedStep = submittedSteps[Math.min(submissionStepPage, Math.max(0, submittedStepCount - 1))];
  const portraitDimensions = learningPortrait?.dimensions || [];
  const portraitAverageScore = portraitDimensions.length
    ? Math.round(portraitDimensions.reduce((sum, item) => sum + clampPortraitScore(item.score), 0) / portraitDimensions.length)
    : undefined;
  const portraitWeakCount = portraitDimensions.filter(item => item.level === 'risk' || item.level === 'developing').length;
  const portraitTeachingFocus = learningPortrait?.teachingFocus?.length
    ? learningPortrait.teachingFocus
    : portraitDimensions
      .slice()
      .sort((a, b) => clampPortraitScore(a.score) - clampPortraitScore(b.score))
      .slice(0, 3)
      .map(item => ({
        title: item.name,
        reason: item.evidence,
        action: item.suggestion,
      }));
  const classJoinCode = selectedClass ? selectedClass.joinCode || `CLASS-${selectedClass.classId.slice(-6).toUpperCase()}` : '';
  const classJoinLink = classJoinCode ? `${window.location.origin}/?joinClass=${encodeURIComponent(classJoinCode)}` : '';

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return submissions
      .filter(item => filter === 'all' || item.status === filter)
      .filter(item => {
        if (!query) return true;
        return [
          item.title,
          item.studentName,
          item.projectName,
          item.projectId,
          taskLabels[item.taskType],
          item.taskType,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));
      });
  }, [filter, searchQuery, submissions]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(member => (
      member.displayName?.toLowerCase().includes(query) ||
      member.username?.toLowerCase().includes(query) ||
      member.userId.toLowerCase().includes(query)
    ));
  }, [members, searchQuery]);

  const managedMembers = useMemo(() => {
    const query = manageMemberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(member => (
      member.displayName?.toLowerCase().includes(query) ||
      member.username?.toLowerCase().includes(query) ||
      member.userId.toLowerCase().includes(query)
    ));
  }, [manageMemberQuery, members]);

  const managedClasses = useMemo(() => {
    const query = manageClassQuery.trim().toLowerCase();
    if (!query) return classes;
    return classes.filter(classRoom => (
      classRoom.name.toLowerCase().includes(query) ||
      classRoom.description?.toLowerCase().includes(query)
    ));
  }, [classes, manageClassQuery]);

  const managedTeachers = useMemo(() => {
    const query = manageTeacherQuery.trim().toLowerCase();
    if (!query) return teacherTeam;
    return teacherTeam.filter(teacher => (
      teacher.displayName?.toLowerCase().includes(query) ||
      teacher.username?.toLowerCase().includes(query) ||
      teacher.userId.toLowerCase().includes(query)
    ));
  }, [manageTeacherQuery, teacherTeam]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const openCreateClass = () => {
    setClassName('');
    setClassDescription('');
    setShowClassSwitcher(false);
    setShowCreateClass(true);
  };

  const escapeCsvCell = (value: string | number) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMembers = () => {
    if (!selectedClass) {
      showNotice('请先选择班级。');
      return;
    }
    if (members.length === 0) {
      showNotice('当前班级暂无学生可导出。');
      return;
    }

    const header = ['序号', '姓名', '学号/工号', '院系', '专业', '班级', '加入时间'];
    const rows = members.map((member, index) => [
      index + 1,
      member.displayName || member.userId,
      member.username || member.userId,
      '智慧产业学院',
      '物联网应用技术',
      selectedClass.name,
      formatTime(member.joinedAt).split(' ')[0],
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(escapeCsvCell).join(','))
      .join('\n');
    const safeClassName = selectedClass.name.replace(/[\\/:*?"<>|]/g, '_');
    downloadTextFile(`${safeClassName}-学生名单.csv`, `\uFEFF${csv}`);
    showNotice('学生名单已开始导出。');
  };

  const buildCreatorTeacherTeam = (classRoom: ClassRoom): ClassTeacherMember[] => {
    const isCurrentProfile = profile?.userId === classRoom.teacherId;
    const isYoungDylan = classRoom.teacherId === 'user_youngdylen';
    return [{
      classId: classRoom.classId,
      userId: classRoom.teacherId,
      role: 'creator',
      joinedAt: classRoom.createdAt,
      displayName: isCurrentProfile ? profile.displayName : (isYoungDylan ? 'Young Dylan' : classRoom.teacherId),
      username: isYoungDylan ? 'yangdaikun2559' : classRoom.teacherId,
      department: '智慧产业学院',
    }];
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const nextClasses = await api.classroom.listTeacherClasses();
      setClasses(nextClasses);
      setSelectedClassId(current => (
        current && nextClasses.some(classRoom => classRoom.classId === current)
          ? current
          : nextClasses[0]?.classId || ''
      ));
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '班级列表加载失败。');
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetail = async (classId: string) => {
    setLearningPortrait(null);
    if (!classId) {
      setMembers([]);
      setTeacherTeam([]);
      setSubmissions([]);
      setSelectedSubmissionId('');
      setSelectedMemberId('');
      return;
    }
    setLoading(true);
    try {
      const classRoom = classes.find(item => item.classId === classId);
      const [nextMembers, nextTeacherTeam, nextSubmissions] = await Promise.all([
        api.classroom.listMembers(classId),
        api.classroom.listTeachers(classId).catch(() => classRoom ? buildCreatorTeacherTeam(classRoom) : []),
        api.classroom.listClassSubmissions(classId),
      ]);
      setMembers(nextMembers);
      setTeacherTeam(nextTeacherTeam);
      setSubmissions(nextSubmissions);
      setSelectedSubmissionId(nextSubmissions[0]?.submissionId || '');
      setSelectedMemberId(nextMembers[0]?.userId || '');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '班级详情加载失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadClassDetail(selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    const closeClassMenu = () => {
      setOpenClassMenuId('');
      setOpenMemberMenuId('');
    };
    document.addEventListener('click', closeClassMenu);
    return () => document.removeEventListener('click', closeClassMenu);
  }, []);

  useEffect(() => {
    const closeClassSwitcher = () => setShowClassSwitcher(false);
    document.addEventListener('click', closeClassSwitcher);
    return () => document.removeEventListener('click', closeClassSwitcher);
  }, []);

  useEffect(() => {
    setFeedbackText(selectedSubmission?.teacherFeedback || '');
    setScore(selectedSubmission?.score === undefined ? '' : String(selectedSubmission.score));
    setSubmissionStepPage(0);
  }, [selectedSubmissionId, selectedSubmission?.teacherFeedback, selectedSubmission?.score]);

  useEffect(() => {
    if (submittedStepCount > 0 && submissionStepPage >= submittedStepCount) {
      setSubmissionStepPage(submittedStepCount - 1);
    }
  }, [submittedStepCount, submissionStepPage]);

  const handleCreateClass = async () => {
    if (!className.trim()) {
      showNotice('请先填写班级名称。');
      return;
    }
    try {
      const classRoom = await api.classroom.createClass({
        name: className,
        description: classDescription,
      });
      setClasses(prev => [classRoom, ...prev]);
      setSelectedClassId(classRoom.classId);
      setClassName('');
      setClassDescription('');
      setShowCreateClass(false);
      loadClasses();
      showNotice('班级已创建。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '创建班级失败。');
    }
  };

  const openRenameClass = () => {
    if (!selectedClass) return;
    setRenameClassName(selectedClass.name);
    setRenameClassDescription(selectedClass.description || '');
    setShowRenameClass(true);
  };

  const openRenameClassFor = (classRoom: ClassRoom) => {
    setSelectedClassId(classRoom.classId);
    setManageMemberQuery('');
    setRenameClassName(classRoom.name);
    setRenameClassDescription(classRoom.description || '');
    setShowRenameClass(true);
  };

  const openJoinSettingsFor = (classRoom: ClassRoom) => {
    setSelectedClassId(classRoom.classId);
    setManageMemberQuery('');
    setShowJoinClassPopup(true);
  };

  const handleRenameClass = async () => {
    if (!selectedClass) return;
    if (!renameClassName.trim()) {
      showNotice('请先填写班级名称。');
      return;
    }
    try {
      const updated = await api.classroom.updateClass(selectedClass.classId, {
        name: renameClassName,
        description: renameClassDescription,
      });
      setClasses(prev => prev.map(item => item.classId === updated.classId ? updated : item));
      setShowRenameClass(false);
      showNotice('班级已重命名。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '重命名班级失败。');
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await api.classroom.deleteClass(classToDelete.classId);
      const remainingClasses = classes.filter(item => item.classId !== classToDelete.classId);
      setClasses(remainingClasses);
      if (selectedClassId === classToDelete.classId) {
        const nextClassId = remainingClasses[0]?.classId || '';
        setSelectedClassId(nextClassId);
        if (!nextClassId) {
          setMembers([]);
          setSubmissions([]);
          setSelectedSubmissionId('');
          setSelectedMemberId('');
        }
      }
      setClassToDelete(null);
      showNotice('班级已删除。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '删除班级失败。');
    }
  };

  const handleAddMember = async () => {
    if (!selectedClassId || !studentIdentifier.trim()) {
      showNotice('请选择班级并输入学生用户名或用户 ID。');
      return;
    }
    try {
      const member = await api.classroom.addMember(selectedClassId, studentIdentifier);
      setMembers(prev => {
        if (prev.some(item => item.userId === member.userId)) return prev;
        return [...prev, member];
      });
      setStudentIdentifier('');
      setShowAddStudent(false);
      showNotice('学生已加入班级。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '添加学生失败。');
    }
  };

  const handleRemoveMember = async (member: ClassMember) => {
    if (!selectedClassId) return;
    try {
      await api.classroom.removeMember(selectedClassId, member.userId);
      setMembers(prev => prev.filter(item => item.userId !== member.userId));
      showNotice('学生已移出班级。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '移除学生失败。');
    }
  };

  const openTransferMember = (member: ClassMember) => {
    const targetClass = classes.find(classRoom => classRoom.classId !== selectedClassId);
    setOpenMemberMenuId('');
    setMemberToTransfer(member);
    setTransferTargetClassId(targetClass?.classId || '');
  };

  const handleTransferMember = async () => {
    if (!selectedClassId || !memberToTransfer) return;
    if (!transferTargetClassId || transferTargetClassId === selectedClassId) {
      showNotice('请选择要调入的目标班级。');
      return;
    }
    try {
      await api.classroom.transferMember(selectedClassId, memberToTransfer.userId, transferTargetClassId);
      setMembers(prev => prev.filter(item => item.userId !== memberToTransfer.userId));
      setMemberToTransfer(null);
      setTransferTargetClassId('');
      showNotice('学生已调班。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '调班失败。');
    }
  };

  const openEditMember = (member: ClassMember) => {
    setOpenMemberMenuId('');
    setMemberToEdit(member);
    setEditStudentName(member.displayName || member.userId);
    setEditStudentUsername(member.username || member.userId);
  };

  const handleUpdateMember = async () => {
    if (!selectedClassId || !memberToEdit) return;
    if (!editStudentName.trim() || !editStudentUsername.trim()) {
      showNotice('请填写学生姓名和学号/工号。');
      return;
    }
    try {
      const updated = await api.classroom.updateMember(selectedClassId, memberToEdit.userId, {
        displayName: editStudentName,
        username: editStudentUsername,
      });
      setMembers(prev => prev.map(item => item.userId === updated.userId ? updated : item));
      setSubmissions(prev => prev.map(item => (
        item.studentId === updated.userId
          ? { ...item, studentName: updated.displayName || updated.userId }
          : item
      )));
      setMemberToEdit(null);
      showNotice('学生信息已更新。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '更新学生信息失败。');
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedSubmission) {
      showNotice('请先选择一条学生提交。');
      return;
    }
    try {
      const updated = await api.classroom.saveFeedback(selectedSubmission.submissionId, {
        teacherFeedback: feedbackText,
        score: score === '' ? undefined : Number(score),
      });
      setSubmissions(prev => prev.map(item => item.submissionId === updated.submissionId ? updated : item));
      showNotice('教师反馈已保存。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : '保存反馈失败。');
    }
  };

  const handleRegenerateAiReview = async () => {
    if (!selectedSubmission) {
      showNotice('请先选择一条学生提交。');
      return;
    }
    setIsAiReviewing(true);
    try {
      const updated = await api.classroom.regenerateAiReview(selectedSubmission.submissionId);
      setSubmissions(prev => prev.map(item => item.submissionId === updated.submissionId ? updated : item));
      showNotice(updated.aiStatus === 'completed' ? 'AI 助教初评已生成。' : 'AI 助教初评暂未生成。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'AI 助教初评生成失败。');
    } finally {
      setIsAiReviewing(false);
    }
  };

  const adoptAiReview = () => {
    if (!selectedSubmission?.aiFeedback) return;
    setFeedbackText(selectedSubmission.aiFeedback);
    if (selectedSubmission.aiScore !== undefined) {
      setScore(String(selectedSubmission.aiScore));
    }
    showNotice('已填入 AI 初评，教师可继续修改后保存。');
  };

  const handleGeneratePortrait = async (scope: 'student' | 'class') => {
    if (!selectedClassId) {
      showNotice('请先选择一个班级。');
      return;
    }
    if (scope === 'student' && !portraitStudentId) {
      showNotice('请先选择一名学生或一条学生提交。');
      return;
    }

    setIsPortraiting(true);
    try {
      const portrait = await api.classroom.generateLearningPortrait(selectedClassId, {
        studentId: scope === 'student' ? portraitStudentId : undefined,
      });
      setLearningPortrait(portrait);
      showNotice(scope === 'student' ? '学生学习画像已生成。' : '班级学习画像已生成。');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'AI 学习画像生成失败。');
    } finally {
      setIsPortraiting(false);
    }
  };

  return (
    <section className="w-full space-y-5">
      <div className="border-b border-neutral-100 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">班级管理</h2>
          <p className="text-neutral-500 text-xs text-left mt-1">
            按班级查看学生学习任务提交，并完成过程性反馈与评分。
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectedClassId ? loadClassDetail(selectedClassId) : loadClasses()}
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
          <div className="relative min-w-0" onClick={event => event.stopPropagation()}>
            <div className="text-[10px] font-mono font-black uppercase tracking-wide text-neutral-400">
              当前班级
            </div>
            <button
              type="button"
              onClick={() => setShowClassSwitcher(prev => !prev)}
              className="mt-1 flex max-w-full items-center gap-2 rounded-xl pr-2 text-left transition hover:text-neutral-700 focus:outline-none"
              aria-expanded={showClassSwitcher}
            >
              <span className="min-w-0 truncate font-display text-lg font-extrabold leading-tight text-neutral-950">
                {selectedClass?.name || '请选择或新建班级'}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition ${showClassSwitcher ? 'rotate-180' : ''}`} />
            </button>
            {selectedClass?.description && (
              <p className="mt-1 text-xs text-neutral-500">{selectedClass.description}</p>
            )}
            {showClassSwitcher && (
              <div className="absolute left-0 top-full z-30 mt-3 w-[min(360px,calc(100vw-48px))] rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl">
                {classes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">
                    暂无班级
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {classes.map(classRoom => {
                      const active = selectedClassId === classRoom.classId;
                      return (
                        <button
                          key={classRoom.classId}
                          type="button"
                          onClick={() => {
                            setSelectedClassId(classRoom.classId);
                            setShowClassSwitcher(false);
                          }}
                          className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                            active
                              ? 'bg-neutral-900 text-white'
                              : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
                          }`}
                        >
                          <div className="truncate text-xs font-black">{classRoom.name}</div>
                          {classRoom.description && (
                            <div className={`mt-1 truncate text-[10px] ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                              {classRoom.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={openCreateClass}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                >
                  <Plus className="h-4 w-4" />
                  新建班级
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 min-w-full lg:min-w-[640px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 flex-1">
            <div className="px-1 py-1">
              <div className="text-[10px] font-mono font-black uppercase text-neutral-400">学生</div>
              <div className="mt-1 text-xl font-black text-neutral-950">{members.length}</div>
            </div>
            <div className="px-1 py-1">
              <div className="text-[10px] font-mono font-black uppercase text-neutral-400">提交</div>
              <div className="mt-1 text-xl font-black text-neutral-950">{submissions.length}</div>
            </div>
            <div className="px-1 py-1">
              <div className="text-[10px] font-mono font-black uppercase text-neutral-400">待批阅</div>
              <div className="mt-1 text-xl font-black text-amber-700">{submittedCount}</div>
            </div>
            <div className="px-1 py-1">
              <div className="text-[10px] font-mono font-black uppercase text-neutral-400">已反馈</div>
                <div className="mt-1 text-xl font-black text-emerald-700">{reviewedCount}</div>
              </div>
            </div>
            <div className="relative w-fit self-start sm:self-center group">
              <button
                type="button"
                disabled={!selectedClass}
                className="h-8 w-8 rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center"
                aria-label="班级操作"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {selectedClass && (
                <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-28 translate-y-1 rounded-xl border border-neutral-100 bg-white py-2 text-xs font-bold text-neutral-700 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={openRenameClass}
                    className="block w-full px-4 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassToDelete(selectedClass)}
                    className="block w-full px-4 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setListMode('students');
                      setShowManageClass(true);
                    }}
                    className="block w-full px-4 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                  >
                    管理
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-950">AI 学习过程画像</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                根据学生提交、客观题表现、简答反思和 AI 初评生成诊断画像，辅助教师调整讲解重点。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleGeneratePortrait('class')}
              disabled={!selectedClassId || isPortraiting}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950 disabled:opacity-50"
            >
              {isPortraiting ? '生成中...' : '生成班级画像'}
            </button>
            <button
              type="button"
              onClick={() => handleGeneratePortrait('student')}
              disabled={!portraitStudentId || isPortraiting}
              className="px-3 py-2 rounded-xl bg-sky-700 text-white text-xs font-bold transition hover:bg-sky-800 disabled:opacity-50"
            >
              生成该生画像
            </button>
          </div>
        </div>

        {learningPortrait && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[10px] font-mono font-black uppercase text-sky-700">
                  {learningPortrait.scope === 'class' ? 'Class Portrait' : 'Student Portrait'}
                </div>
                <h4 className="mt-1 text-sm font-black text-neutral-950">{learningPortrait.title}</h4>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono font-black text-sky-800">
                <span className="rounded-lg border border-sky-200 bg-white/70 px-2 py-1">提交 {learningPortrait.coverage.submissions}</span>
                <span className="rounded-lg border border-sky-200 bg-white/70 px-2 py-1">步骤 {learningPortrait.coverage.completedTasks}</span>
                {learningPortrait.coverage.averageAiScore !== undefined && (
                  <span className="rounded-lg border border-sky-200 bg-white/70 px-2 py-1">均分 {learningPortrait.coverage.averageAiScore}</span>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-sky-950">{learningPortrait.summary}</p>
            {learningPortrait.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {learningPortrait.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-sky-800">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {learningPortrait.focusItems && learningPortrait.focusItems.length > 0 && (
              <div className="rounded-lg border border-white/70 bg-white/70 p-3">
                <div className="text-[10px] font-mono font-black uppercase text-neutral-400">重点关注</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {learningPortrait.focusItems.map(item => (
                    <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {portraitDimensions.length > 0 && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
                <div className="rounded-lg border border-white/70 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <BarChart3 className="h-4 w-4 text-sky-700" />
                    <span className="text-[10px] font-mono font-black uppercase">能力概览</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-black text-neutral-950">{portraitAverageScore ?? '-'}</div>
                      <div className="mt-1 text-[10px] font-bold text-neutral-500">平均表现</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-sky-800">{learningPortrait.coverage.completedTasks}</div>
                      <div className="mt-1 text-[10px] font-bold text-neutral-500">覆盖步骤</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-amber-700">{portraitWeakCount}</div>
                      <div className="mt-1 text-[10px] font-bold text-neutral-500">需讲解</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/70 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Target className="h-4 w-4 text-sky-700" />
                    <span className="text-[10px] font-mono font-black uppercase">维度表现可视化</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {portraitDimensions.map(dimension => {
                      const score = clampPortraitScore(dimension.score);
                      return (
                        <div key={`bar-${dimension.name}`} className="grid grid-cols-[76px_1fr_42px] items-center gap-2">
                          <div className="truncate text-[11px] font-black text-neutral-700">{dimension.name}</div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className={`h-full rounded-full ${getPortraitBarStyle(dimension.level)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <div className="text-right text-[10px] font-mono font-black text-neutral-500">{score}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {portraitTeachingFocus.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <Target className="h-4 w-4 text-amber-700" />
                  <div className="text-xs font-black">课堂讲解重点</div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {portraitTeachingFocus.slice(0, 3).map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-lg border border-amber-100 bg-white/80 p-3">
                      <div className="text-[10px] font-mono font-black text-amber-700">FOCUS {index + 1}</div>
                      <div className="mt-1 text-xs font-black text-neutral-950">{item.title}</div>
                      <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">{item.reason}</p>
                      <p className="mt-2 text-[11px] leading-relaxed font-semibold text-amber-900">{item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {learningPortrait.dimensions && learningPortrait.dimensions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {learningPortrait.dimensions.map(dimension => (
                  <div key={`${dimension.name}-${dimension.level}`} className={`rounded-lg border p-3 ${getPortraitLevelStyle(dimension.level)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-black">{dimension.name}</div>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-mono font-black uppercase">
                        {dimension.level}{dimension.score === undefined ? '' : ` · ${dimension.score}`}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed">{dimension.evidence}</p>
                    <p className="mt-2 text-[11px] leading-relaxed opacity-90">{dimension.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {[
                ['优势', learningPortrait.strengths],
                ['风险', learningPortrait.risks],
                ['建议', learningPortrait.suggestions],
              ].map(([label, items]) => (
                <div key={label as string} className="rounded-lg border border-white/70 bg-white/70 p-3">
                  <div className="text-[10px] font-mono font-black uppercase text-neutral-400">{label as string}</div>
                  <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-neutral-700">
                    {(items as string[]).map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                <button
                  type="button"
                  onClick={() => setListMode('submissions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    listMode === 'submissions' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  任务提交
                </button>
                <button
                  type="button"
                  onClick={() => setListMode('students')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    listMode === 'students' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  学生
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(true)}
                disabled={!selectedClassId}
                className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                添加学生
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={listMode === 'submissions' ? '搜索学生、任务或项目' : '搜索学生姓名或账号'}
                className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>

            {listMode === 'submissions' && (
              <div className="flex gap-2">
                {[
                  ['all', '全部'],
                  ['submitted', '待批阅'],
                  ['reviewed', '已反馈'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value as SubmissionFilter)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                      filter === value
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-[650px] overflow-y-auto p-3 pb-4 space-y-2">
            {listMode === 'students' ? (
              filteredMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
                  暂无学生
                </div>
              ) : filteredMembers.map(member => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => setSelectedMemberId(member.userId)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedMemberId === member.userId
                      ? 'border-neutral-900 bg-neutral-950 text-white'
                      : 'border-neutral-150 bg-neutral-50 text-neutral-950 hover:border-neutral-300 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-black truncate">{member.displayName || member.userId}</div>
                  <div className={`mt-1 text-[10px] truncate ${selectedMemberId === member.userId ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    @{member.username || member.userId}
                  </div>
                </button>
              ))
            ) : filteredSubmissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
                暂无学生提交
              </div>
            ) : filteredSubmissions.map(submission => (
              <button
                key={submission.submissionId}
                type="button"
                onClick={() => setSelectedSubmissionId(submission.submissionId)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                  selectedSubmissionId === submission.submissionId
                    ? 'border-neutral-900 bg-neutral-950 text-white'
                    : 'border-neutral-150 bg-neutral-50 hover:bg-white hover:border-neutral-300 text-neutral-850'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">{submission.title}</div>
                    <div className={`mt-1 text-[10px] truncate ${selectedSubmissionId === submission.submissionId ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {submission.studentName} · {taskLabels[submission.taskType] || submission.taskType}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono font-black ${
                    submission.status === 'reviewed'
                      ? selectedSubmissionId === submission.submissionId ? 'bg-emerald-400/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                      : selectedSubmissionId === submission.submissionId ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {submission.status === 'reviewed' ? '已反馈' : '待批阅'}
                  </span>
                </div>
                <div className={`mt-2 flex items-center gap-1 text-[10px] ${selectedSubmissionId === submission.submissionId ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  <Clock3 className="w-3 h-3" />
                  {formatTime(submission.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm min-h-[560px]">
          {!selectedSubmission ? (
            <div className="h-full min-h-96 flex flex-col items-center justify-center text-center text-neutral-400 gap-3">
              <BookOpenCheck className="w-10 h-10" />
              <div className="text-sm font-bold text-neutral-650">请选择一条学生提交</div>
              <div className="text-xs max-w-sm leading-relaxed">
                从任务列表选择学生提交后，可在这里查看回答内容、写入反馈并评分。
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <div className="text-[10px] font-mono font-black text-neutral-400 uppercase">
                    {taskLabels[selectedSubmission.taskType] || selectedSubmission.taskType}
                  </div>
                  <h3 className="font-display font-black text-lg text-neutral-950 mt-1">{selectedSubmission.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {selectedSubmission.studentName} · {selectedSubmission.projectName || selectedSubmission.projectId || '未关联项目'} · {formatTime(selectedSubmission.createdAt)}
                  </p>
                </div>
                <span className={`w-fit rounded-lg border px-2 py-1 text-[10px] font-mono font-black uppercase ${
                  selectedSubmission.status === 'reviewed'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {selectedSubmission.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-neutral-950 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  学生提交内容
                </h4>
                {parsedContent ? (
                  <div className="space-y-3">
                    {parsedContent.task && (
                      <div className="rounded-xl border border-neutral-150 bg-neutral-50 p-4">
                        <div className="text-[10px] font-mono font-black text-neutral-400 uppercase">Task</div>
                        <div className="text-xs font-semibold text-neutral-800 leading-relaxed mt-1">{parsedContent.task}</div>
                      </div>
                    )}
                    {parsedContent.objectiveSummary && (
                      <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                        <div className="text-[10px] font-mono font-black text-sky-700 uppercase">Objective Check</div>
                        <div className="mt-1 text-xs font-black text-sky-950">
                          客观题：{parsedContent.objectiveSummary.correct}/{parsedContent.objectiveSummary.total}
                        </div>
                      </div>
                    )}
                    {parsedContent.steps?.length && currentSubmittedStep ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-150 bg-neutral-50 p-3">
                          {submittedSteps.map((step, index) => {
                            const active = index === submissionStepPage;
                            return (
                              <button
                                key={step.stepId}
                                type="button"
                                onClick={() => setSubmissionStepPage(index)}
                                className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${
                                  active
                                    ? 'bg-neutral-950 text-white'
                                    : 'bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-950'
                                }`}
                              >
                                {step.index}
                              </button>
                            );
                          })}
                          <div className="ml-auto text-[11px] font-bold text-neutral-500">
                            {submissionStepPage + 1}/{submittedStepCount}
                          </div>
                        </div>

                        {(() => {
                          const step = currentSubmittedStep;
                          const stepQuestions = step.questions || step.prompts.map(prompt => ({ type: 'short' as const, prompt }));
                          return (
                            <section className="rounded-xl border border-neutral-150 bg-white p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-[10px] font-mono font-black uppercase text-sky-700">
                                    {step.index} · {taskLabels[step.stepId] || step.title}
                                  </div>
                                  <h5 className="mt-1 text-sm font-black text-neutral-950">{step.title}</h5>
                                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">{step.task}</p>
                                </div>
                                {step.objectiveSummary && (
                                  <span className="w-fit rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-mono font-black text-sky-800">
                                    客观题 {step.objectiveSummary.correct}/{step.objectiveSummary.total}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 space-y-2">
                                {stepQuestions.map((question, index) => (
                                  <div key={`${step.stepId}-${index}`} className="rounded-lg border border-neutral-100 bg-neutral-50/70 p-3">
                                    <div className="flex flex-wrap items-start gap-2 text-[11px] font-bold text-neutral-900 leading-relaxed">
                                      <span>{index + 1}. {question.prompt}</span>
                                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-mono font-black uppercase text-neutral-500">
                                        {question.type}
                                      </span>
                                    </div>
                                    <div className="mt-2 rounded-lg border border-neutral-100 bg-white p-3 text-xs leading-relaxed text-neutral-700 whitespace-pre-wrap">
                                      {step.responses[index] || '学生未填写。'}
                                    </div>
                                    {question.options?.length && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {question.options.map(option => (
                                          <span
                                            key={option}
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                              option === step.responses[index]
                                                ? 'bg-sky-50 text-sky-800'
                                                : 'bg-white text-neutral-500'
                                            }`}
                                          >
                                            {option}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {question.answer && (
                                      <div className={`mt-2 text-[11px] font-bold ${
                                        step.responses[index] === question.answer ? 'text-emerald-700' : 'text-amber-700'
                                      }`}>
                                        标准答案：{question.answer}
                                        {step.responses[index] === question.answer ? ' · 已掌握' : ' · 需关注'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => setSubmissionStepPage(page => Math.max(0, page - 1))}
                                  disabled={submissionStepPage === 0}
                                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-950 disabled:opacity-40 disabled:hover:border-neutral-200"
                                >
                                  上一页
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSubmissionStepPage(page => Math.min(submittedStepCount - 1, page + 1))}
                                  disabled={submissionStepPage >= submittedStepCount - 1}
                                  className="rounded-lg bg-neutral-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                                >
                                  下一页
                                </button>
                              </div>
                            </section>
                          );
                        })()}
                      </div>
                    ) : (
                      (parsedContent.questions || parsedContent.prompts.map(prompt => ({ type: 'short' as const, prompt }))).map((question, index) => (
                        <div key={`${selectedSubmission.submissionId}-${index}`} className="rounded-xl border border-neutral-150 bg-white p-4">
                          <div className="flex flex-wrap items-start gap-2 text-[11px] font-bold text-neutral-900 leading-relaxed">
                            <span>{index + 1}. {question.prompt}</span>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-mono font-black uppercase text-neutral-500">
                              {question.type}
                            </span>
                          </div>
                          <div className="mt-2 rounded-lg bg-neutral-50 border border-neutral-100 p-3 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                            {parsedContent.responses[index] || '学生未填写。'}
                          </div>
                          {question.options?.length && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {question.options.map(option => (
                                <span
                                  key={option}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    option === parsedContent.responses[index]
                                      ? 'bg-sky-50 text-sky-800'
                                      : 'bg-neutral-100 text-neutral-500'
                                  }`}
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          )}
                          {question.answer && (
                            <div className={`mt-2 text-[11px] font-bold ${
                              parsedContent.responses[index] === question.answer ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              标准答案：{question.answer}
                              {parsedContent.responses[index] === question.answer ? ' · 已掌握' : ' · 需关注'}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {parsedContent.rubric && (
                      <div className="rounded-xl border border-neutral-150 bg-neutral-50 p-4">
                        <div className="text-[10px] font-mono font-black text-neutral-400 uppercase">Rubric</div>
                        <div className="text-xs text-neutral-650 leading-relaxed mt-1">{parsedContent.rubric}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <pre className="rounded-xl border border-neutral-150 bg-neutral-50 p-4 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedSubmission.content}
                  </pre>
                )}
              </div>

              <div className="border-t border-neutral-100 pt-5 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-700" />
                    <h4 className="text-xs font-black text-neutral-950">AI 助教初评</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.aiFeedback && (
                      <button
                        type="button"
                        onClick={adoptAiReview}
                        className="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-[11px] font-bold text-sky-800 transition hover:border-sky-500"
                      >
                        采用 AI 建议
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRegenerateAiReview}
                      disabled={isAiReviewing}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950 disabled:opacity-50"
                    >
                      {isAiReviewing ? '生成中...' : '重新生成'}
                    </button>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${
                  selectedSubmission.aiStatus === 'completed'
                    ? 'border-sky-200 bg-sky-50/70'
                    : selectedSubmission.aiStatus === 'failed'
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-neutral-200 bg-neutral-50'
                }`}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[10px] font-mono font-black uppercase text-neutral-500">
                      {selectedSubmission.aiStatus === 'completed'
                        ? 'Completed'
                        : selectedSubmission.aiStatus === 'failed'
                          ? 'Failed'
                          : 'Pending'}
                      {selectedSubmission.aiEvaluatedAt ? ` · ${formatTime(selectedSubmission.aiEvaluatedAt)}` : ''}
                    </div>
                    {selectedSubmission.aiScore !== undefined && (
                      <div className="text-[11px] font-black text-sky-800">
                        建议分数：{selectedSubmission.aiScore}/100
                      </div>
                    )}
                  </div>
                  {selectedSubmission.aiObjectiveTotal !== undefined && selectedSubmission.aiObjectiveTotal > 0 && (
                    <div className="mt-2 w-fit rounded-lg border border-white/70 bg-white/70 px-2.5 py-1 text-[10px] font-mono font-black text-sky-800">
                      客观题：{selectedSubmission.aiObjectiveCorrect ?? 0}/{selectedSubmission.aiObjectiveTotal}
                    </div>
                  )}
                  {selectedSubmission.aiEvidenceScope && (
                    <div className={`mt-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
                      selectedSubmission.aiEvidenceScope.isComplete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                      助评证据：已收集 {selectedSubmission.aiEvidenceScope.completedTasks}/8 个学习步骤
                      {selectedSubmission.aiEvidenceScope.isComplete
                        ? '，学习流程证据完整。'
                        : `，仍缺少 ${selectedSubmission.aiEvidenceScope.missingTasks.map(task => taskLabels[task] || task).join('、')}。当前 AI 评价仅作为阶段性参考。`}
                    </div>
                  )}
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">
                    {selectedSubmission.aiFeedback || 'AI 助教初评尚未生成。可点击“重新生成”让系统根据学生回答和评价标准生成诊断性反馈。'}
                  </p>
                  {selectedSubmission.aiRubric && (
                    <div className="mt-3 rounded-lg border border-white/70 bg-white/70 p-3">
                      <div className="text-[10px] font-mono font-black uppercase text-neutral-400">AI Rubric</div>
                      <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-600">{selectedSubmission.aiRubric}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-neutral-800" />
                  <h4 className="text-xs font-black text-neutral-950">教师反馈</h4>
                </div>
                <textarea
                  value={feedbackText}
                  onChange={event => setFeedbackText(event.target.value)}
                  placeholder="写下对该学生任务的评价、问题提醒和后续改进建议。"
                  className="w-full min-h-32 rounded-xl border border-neutral-200 p-3 text-xs leading-relaxed resize-y focus:outline-none focus:border-neutral-900"
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                    分数
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={event => setScore(event.target.value)}
                      className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:outline-none focus:border-neutral-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存反馈
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateClass && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">新建班级</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  创建后会自动加入班级切换列表，你可以继续添加学生并查看提交反馈。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateClass(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭新建班级弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-4">
              <input
                value={className}
                onChange={event => setClassName(event.target.value)}
                placeholder="班级名称"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
              <textarea
                value={classDescription}
                onChange={event => setClassDescription(event.target.value)}
                placeholder="班级说明，可选"
                className="min-h-24 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateClass(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateClass}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                创建班级
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageClass && selectedClass && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 p-5 backdrop-blur-[1px]">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
              <div className="flex items-center gap-10 text-sm font-bold text-neutral-700">
                {[
                  { id: 'classes', label: '班级管理' },
                  { id: 'teachers', label: '教师团队管理' },
                ].map(item => {
                  const active = manageTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setManageTab(item.id as ManageTab)}
                      className={`relative py-2 transition ${active ? 'text-neutral-950' : 'hover:text-neutral-950'}`}
                    >
                      {item.label}
                      {active && (
                        <span className="absolute -bottom-4 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowManageClass(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭班级管理"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {manageTab === 'classes' ? (
            <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
              <aside className="relative z-20 overflow-visible border-r border-neutral-100 bg-white">
                <div className="space-y-4 border-b border-neutral-100 p-5">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={openCreateClass}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      新建班级
                    </button>
                    <button
                      type="button"
                      onClick={openRenameClass}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700"
                    >
                      <UsersRound className="h-4 w-4" />
                      管理班级
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                    <input
                      value={manageClassQuery}
                      onChange={event => setManageClassQuery(event.target.value)}
                      placeholder="搜索班级"
                      className="w-full rounded-full border border-transparent bg-neutral-100 py-2.5 pl-4 pr-10 text-xs focus:border-blue-300 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="relative overflow-visible py-3">
                  {managedClasses.map(classRoom => {
                    const active = selectedClassId === classRoom.classId;
                    const menuOpen = openClassMenuId === classRoom.classId;
                    return (
                      <div
                        key={classRoom.classId}
                        className={`relative flex items-center gap-2 px-6 py-4 transition ${
                          menuOpen ? 'z-50' : 'z-0 focus-within:z-50'
                        } ${
                          active ? 'bg-blue-50 text-neutral-950' : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassId(classRoom.classId);
                            setManageMemberQuery('');
                            setOpenClassMenuId('');
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-bold">{classRoom.name}</span>
                        </button>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              setOpenClassMenuId(prev => prev === classRoom.classId ? '' : classRoom.classId);
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition focus:outline-none ${
                              menuOpen ? 'bg-white text-blue-600' : 'text-neutral-400 hover:bg-white hover:text-blue-600 focus:bg-white focus:text-blue-600'
                            }`}
                            aria-label={`${classRoom.name} 班级操作`}
                            aria-expanded={menuOpen}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          <div
                            onClick={event => event.stopPropagation()}
                            className={`absolute right-0 top-full z-[80] mt-1 w-28 rounded-lg border border-neutral-100 bg-white py-2 text-sm text-neutral-700 shadow-xl transition ${
                              menuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenClassMenuId('');
                                openRenameClassFor(classRoom);
                              }}
                              className="block w-full px-5 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                            >
                              重命名
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenClassMenuId('');
                                openJoinSettingsFor(classRoom);
                              }}
                              className="block w-full px-5 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                            >
                              设置
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenClassMenuId('');
                                setSelectedClassId(classRoom.classId);
                                setManageMemberQuery('');
                                setClassToDelete(classRoom);
                              }}
                              className="block w-full px-5 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <main className="min-w-0 overflow-y-auto bg-white">
                <div className="flex items-center justify-between border-b border-neutral-100 px-8 py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <UsersRound className="h-4 w-4 shrink-0 text-neutral-300" />
                    <h3 className="truncate text-base font-black text-neutral-950">{selectedClass.name}</h3>
                    <button
                      type="button"
                      onClick={() => setShowJoinClassPopup(true)}
                      className="h-7 w-7 rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-blue-600 flex items-center justify-center"
                      aria-label="学生加入班级二维码"
                      title="学生加入班级"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="px-8 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAddStudent(true)}
                      className="w-fit rounded-full bg-neutral-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"
                    >
                      添加学生
                    </button>
                    <div className="flex flex-wrap items-center gap-5">
                      <button
                        type="button"
                        onClick={handleExportMembers}
                        className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
                      >
                        导出学生名单
                      </button>
                      <div className="relative w-64">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                        <input
                          value={manageMemberQuery}
                          onChange={event => setManageMemberQuery(event.target.value)}
                          placeholder="请输入姓名或学号"
                          className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-4 pr-10 text-xs focus:border-blue-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
                    <span>全部学生</span>
                    <span>
                      {manageMemberQuery.trim()
                        ? `匹配 ${managedMembers.length} 人 / 共 ${members.length} 人`
                        : `共 ${members.length} 人`}
                    </span>
                  </div>

                  <div className="mt-6 overflow-visible">
                    <table className="w-full table-fixed text-left text-sm">
                      <thead className="bg-neutral-100 text-xs font-bold text-neutral-500">
                        <tr>
                          <th className="w-14 px-4 py-4">
                            <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" aria-label="选择全部学生" />
                          </th>
                          <th className="px-4 py-4">姓名</th>
                          <th className="px-4 py-4">学号/工号</th>
                          <th className="px-4 py-4">院系</th>
                          <th className="px-4 py-4">专业</th>
                          <th className="px-4 py-4">班级</th>
                          <th className="px-4 py-4">加入时间</th>
                          <th className="w-40 px-4 py-4">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-700">
                        {managedMembers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-xs text-neutral-400">
                              {manageMemberQuery.trim() ? '没有匹配的学生' : '暂无学生'}
                            </td>
                          </tr>
                        ) : managedMembers.map(member => {
                          const memberMenuOpen = openMemberMenuId === member.userId;
                          return (
                          <tr key={member.userId} className={`transition hover:bg-neutral-50 ${memberMenuOpen ? 'relative z-30' : ''}`}>
                            <td className="px-4 py-4">
                              <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" aria-label={`选择 ${member.displayName || member.userId}`} />
                            </td>
                            <td className="truncate px-4 py-4 font-medium text-neutral-800">{member.displayName || member.userId}</td>
                            <td className="truncate px-4 py-4">{member.username || member.userId}</td>
                            <td className="truncate px-4 py-4">智慧产业学院</td>
                            <td className="truncate px-4 py-4">物联网应用技术</td>
                            <td className="truncate px-4 py-4">{selectedClass.name}</td>
                            <td className="truncate px-4 py-4">{formatTime(member.joinedAt).split(' ')[0]}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-5">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member)}
                                  className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                                >
                                  移除
                                </button>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.stopPropagation();
                                      setOpenMemberMenuId(prev => prev === member.userId ? '' : member.userId);
                                    }}
                                    className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                                    aria-expanded={memberMenuOpen}
                                  >
                                    更多
                                  </button>
                                  <div
                                    onClick={event => event.stopPropagation()}
                                    className={`absolute right-0 top-full z-[80] mt-3 w-36 rounded-lg border border-neutral-100 bg-white py-2 text-sm text-neutral-700 shadow-xl transition ${
                                      memberMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => openTransferMember(member)}
                                      className="block w-full px-5 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                                    >
                                      调班
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditMember(member)}
                                      className="block w-full px-5 py-2 text-left transition hover:bg-neutral-50 hover:text-neutral-950"
                                    >
                                      更改学生信息
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </main>
            </div>
            ) : (
              <main className="min-h-0 flex-1 overflow-y-auto bg-white px-8 py-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    type="button"
                    onClick={() => showNotice('添加教师成员功能待接入。')}
                    className="w-fit rounded-full bg-neutral-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"
                  >
                    添加成员
                  </button>
                  <div className="flex flex-wrap items-center gap-5">
                    <button
                      type="button"
                      onClick={() => showNotice('导出教师团队功能待接入。')}
                      className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
                    >
                      导出教师团队
                    </button>
                    <div className="relative w-64">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
                      <input
                        value={manageTeacherQuery}
                        onChange={event => setManageTeacherQuery(event.target.value)}
                        placeholder="请输入姓名或工号"
                        className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-4 pr-10 text-xs focus:border-blue-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
                  <span>全体教师</span>
                  <span>共 {teacherTeam.length} 人</span>
                </div>

                <div className="mt-4 overflow-hidden">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-neutral-100 text-xs font-bold text-neutral-500">
                      <tr>
                        <th className="w-14 px-4 py-4">
                          <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" aria-label="选择全部教师" />
                        </th>
                        <th className="px-4 py-4">姓名</th>
                        <th className="px-4 py-4">角色</th>
                        <th className="px-4 py-4">学号/工号</th>
                        <th className="px-4 py-4">院系</th>
                        <th className="px-4 py-4">加入时间</th>
                        <th className="w-40 px-4 py-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      {managedTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-xs text-neutral-400">
                            暂无教师
                          </td>
                        </tr>
                      ) : managedTeachers.map(teacher => (
                        <tr key={teacher.userId} className="transition hover:bg-neutral-50">
                          <td className="px-4 py-4">
                            <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" aria-label={`选择 ${teacher.displayName || teacher.userId}`} />
                          </td>
                          <td className="truncate px-4 py-4 font-medium text-neutral-800">{teacher.displayName || teacher.userId}</td>
                          <td className="truncate px-4 py-4">{teacher.role === 'creator' ? '创建者' : '教师'}</td>
                          <td className="truncate px-4 py-4">{teacher.username || teacher.userId}</td>
                          <td className="truncate px-4 py-4">{teacher.department || '智慧产业学院'}</td>
                          <td className="truncate px-4 py-4">{formatTime(teacher.joinedAt).split(' ')[0]}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-5">
                              <button
                                type="button"
                                disabled={teacher.role === 'creator'}
                                onClick={() => showNotice('移除教师功能待接入。')}
                                className="text-sm font-bold text-blue-600 transition hover:text-blue-700 disabled:text-neutral-300"
                              >
                                移除
                              </button>
                              <button
                                type="button"
                                onClick={() => showNotice('更多教师操作待接入。')}
                                className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                              >
                                更多
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </main>
            )}
          </div>
        </div>
      )}

      {showJoinClassPopup && selectedClass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">学生加入班级</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  学生可在学生端输入加入码，也可以打开加入链接后加入当前班级。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinClassPopup(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭学生加入班级弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-5 space-y-4">
              <div className="text-sm font-black text-neutral-950">{selectedClass.name}</div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="text-[10px] font-mono font-black uppercase text-neutral-400">加入码</div>
                <div className="mt-1 font-mono text-lg font-black tracking-wider text-neutral-950">{classJoinCode}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(classJoinCode);
                  showNotice('加入码已复制。');
                }}
                className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                复制加入码
              </button>

              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="text-[10px] font-mono font-black uppercase text-neutral-400">加入链接</div>
                <div className="mt-1 break-all font-mono text-[11px] font-bold leading-relaxed text-neutral-700">{classJoinLink}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(classJoinLink);
                  showNotice('加入链接已复制。');
                }}
                className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                复制加入链接
              </button>

              <p className="text-xs leading-relaxed text-neutral-500">
                学生登录后，在学生端“学习任务评价”区域输入加入码即可加入班级。
              </p>
            </div>
          </div>
        </div>
      )}

      {false && showManageClass && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">班级管理</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  {selectedClass.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageClass(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭班级管理弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-5 space-y-5">
              <section className="rounded-xl border border-neutral-150 bg-neutral-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-black uppercase text-neutral-400">班级信息</div>
                    <div className="mt-1 truncate text-sm font-black text-neutral-950">{selectedClass.name}</div>
                    {selectedClass.description && (
                      <p className="mt-2 text-xs leading-relaxed text-neutral-500">{selectedClass.description}</p>
                    )}
                    <div className="mt-2 text-[10px] text-neutral-400">
                      创建时间：{formatTime(selectedClass.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageClass(false);
                      openRenameClass();
                    }}
                    className="w-fit rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                  >
                    编辑信息
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-neutral-150 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-xs font-black text-neutral-950">学生管理</h4>
                    <p className="mt-1 text-[11px] text-neutral-500">添加或移除当前班级学生。</p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <input
                      value={studentIdentifier}
                      onChange={event => setStudentIdentifier(event.target.value)}
                      placeholder="学生用户名或用户 ID"
                      className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none sm:w-56"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div className="mt-4 max-h-56 overflow-y-auto space-y-2">
                  {members.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-xs text-neutral-400">
                      暂无学生
                    </div>
                  ) : members.map(member => (
                    <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-150 bg-neutral-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-neutral-950">{member.displayName || member.userId}</div>
                        <div className="mt-0.5 truncate text-[10px] text-neutral-500">@{member.username || member.userId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-950"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-neutral-150 bg-neutral-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-xs font-black text-neutral-950">教学反馈概览</h4>
                    <p className="mt-1 text-[11px] text-neutral-500">查看该班级任务提交和反馈完成情况。</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left sm:grid-cols-4 lg:min-w-[420px]">
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase text-neutral-400">学生</div>
                      <div className="mt-1 text-lg font-black text-neutral-950">{members.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase text-neutral-400">提交</div>
                      <div className="mt-1 text-lg font-black text-neutral-950">{submissions.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase text-neutral-400">待批阅</div>
                      <div className="mt-1 text-lg font-black text-amber-700">{submittedCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase text-neutral-400">已反馈</div>
                      <div className="mt-1 text-lg font-black text-emerald-700">{reviewedCount}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setListMode('submissions');
                      setShowManageClass(false);
                    }}
                    className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
                  >
                    查看提交
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showRenameClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">重命名班级</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  修改后会同步更新教师端和学生端显示的班级名称。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameClass(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭重命名班级弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 pt-4">
              <input
                value={renameClassName}
                onChange={event => setRenameClassName(event.target.value)}
                placeholder="班级名称"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
              <textarea
                value={renameClassDescription}
                onChange={event => setRenameClassDescription(event.target.value)}
                placeholder="班级说明，可选"
                className="min-h-24 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenameClass(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRenameClass}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">删除班级</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  删除后将移除该班级、班级学生关系和学生提交记录。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭删除班级弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-xs font-bold text-neutral-900">
                {classToDelete.name}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteClass}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">添加学生</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  输入学生用户名或用户 ID，将其加入当前班级。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭添加学生弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              value={studentIdentifier}
              onChange={event => setStudentIdentifier(event.target.value)}
              placeholder="学生用户名或用户 ID"
              className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {memberToTransfer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">调班</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  将学生从当前班级移入你管理的其他班级。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberToTransfer(null)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭调班弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                <div className="text-[10px] font-mono font-black uppercase text-neutral-400">学生</div>
                <div className="mt-1 text-xs font-black text-neutral-950">
                  {memberToTransfer.displayName || memberToTransfer.userId}
                </div>
              </div>
              <select
                value={transferTargetClassId}
                onChange={event => setTransferTargetClassId(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              >
                <option value="">选择目标班级</option>
                {classes
                  .filter(classRoom => classRoom.classId !== selectedClassId)
                  .map(classRoom => (
                    <option key={classRoom.classId} value={classRoom.classId}>
                      {classRoom.name}
                    </option>
                  ))}
              </select>
              {classes.filter(classRoom => classRoom.classId !== selectedClassId).length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-400">
                  暂无可调入的其他班级，请先新建班级。
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToTransfer(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleTransferMember}
                disabled={!transferTargetClassId}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                确认调班
              </button>
            </div>
          </div>
        </div>
      )}

      {memberToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-display text-base font-black text-neutral-950">更改学生信息</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  修改学生姓名和学号/工号，保存后会同步更新班级名单显示。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberToEdit(null)}
                className="h-8 w-8 rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-950 flex items-center justify-center"
                aria-label="关闭更改学生信息弹窗"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-4">
              <input
                value={editStudentName}
                onChange={event => setEditStudentName(event.target.value)}
                placeholder="姓名"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
              <input
                value={editStudentUsername}
                onChange={event => setEditStudentUsername(event.target.value)}
                placeholder="学号/工号"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToEdit(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUpdateMember}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
