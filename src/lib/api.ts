import { ClassJoinRequest, ClassMember, ClassRoom, ClassTeacherMember, IoTProject, JoinClassResponse, LearningPortrait, LearningSubmission, LearningTaskType } from '../types';

const getUserId = () => {
  const saved = localStorage.getItem('aiot_profile');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.userId || '';
    } catch {
      return '';
    }
  }
  return '';
};

async function request(url: string, options: RequestInit = {}) {
  const userId = getUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new Error('Response is not valid JSON.');
      }
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}.`);
  }
  return data;
}

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    register: async (username: string, email: string, password: string, displayName: string) => {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, displayName }),
      });
    },
  },
  projects: {
    list: async (): Promise<IoTProject[]> => {
      return request('/api/projects');
    },
    save: async (project: IoTProject): Promise<IoTProject> => {
      const data = await request('/api/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      });
      return data.project;
    },
    delete: async (projectId: string): Promise<void> => {
      return request(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
    },
  },
  classroom: {
    listTeacherClasses: async (): Promise<ClassRoom[]> => {
      return request('/api/teacher/classes');
    },
    createClass: async (payload: { name: string; description?: string }): Promise<ClassRoom> => {
      const data = await request('/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.classRoom;
    },
    updateClass: async (
      classId: string,
      payload: { name: string; description?: string }
    ): Promise<ClassRoom> => {
      const data = await request(`/api/teacher/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return data.classRoom;
    },
    deleteClass: async (classId: string): Promise<void> => {
      await request(`/api/teacher/classes/${classId}`, {
        method: 'DELETE',
      });
    },
    listMembers: async (classId: string): Promise<ClassMember[]> => {
      return request(`/api/teacher/classes/${classId}/members`);
    },
    listTeachers: async (classId: string): Promise<ClassTeacherMember[]> => {
      return request(`/api/teacher/classes/${classId}/teachers`);
    },
    addMember: async (classId: string, studentIdentifier: string): Promise<ClassMember> => {
      const data = await request(`/api/teacher/classes/${classId}/members`, {
        method: 'POST',
        body: JSON.stringify({ studentIdentifier }),
      });
      return data.member;
    },
    removeMember: async (classId: string, userId: string): Promise<void> => {
      await request(`/api/teacher/classes/${classId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    updateMember: async (
      classId: string,
      userId: string,
      payload: { displayName: string; username: string }
    ): Promise<ClassMember> => {
      const data = await request(`/api/teacher/classes/${classId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return data.member;
    },
    transferMember: async (
      classId: string,
      userId: string,
      targetClassId: string
    ): Promise<ClassMember> => {
      const data = await request(`/api/teacher/classes/${classId}/members/${userId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ targetClassId }),
      });
      return data.member;
    },
    listClassSubmissions: async (classId: string): Promise<LearningSubmission[]> => {
      return request(`/api/teacher/classes/${classId}/submissions`);
    },
    saveFeedback: async (
      submissionId: string,
      payload: { teacherFeedback: string; score?: number }
    ): Promise<LearningSubmission> => {
      const data = await request(`/api/teacher/submissions/${submissionId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.submission;
    },
    regenerateAiReview: async (submissionId: string): Promise<LearningSubmission> => {
      const data = await request(`/api/teacher/submissions/${submissionId}/ai-review`, {
        method: 'POST',
      });
      return data.submission;
    },
    generateLearningPortrait: async (
      classId: string,
      payload: { studentId?: string } = {}
    ): Promise<LearningPortrait> => {
      const data = await request(`/api/teacher/classes/${classId}/ai-portrait`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.portrait;
    },
    listStudentClasses: async (): Promise<ClassRoom[]> => {
      return request('/api/student/classes');
    },
    joinClass: async (joinCode: string): Promise<JoinClassResponse> => {
      return request('/api/student/classes/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode }),
      });
    },
    listMyJoinRequests: async (): Promise<ClassJoinRequest[]> => {
      return request('/api/student/class-join-requests');
    },
    listPendingJoinRequests: async (): Promise<ClassJoinRequest[]> => {
      return request('/api/teacher/class-join-requests');
    },
    reviewJoinRequest: async (
      requestId: string,
      payload: { decision: 'approved' | 'rejected'; message?: string }
    ): Promise<ClassJoinRequest> => {
      const data = await request(`/api/teacher/class-join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.request;
    },
    submitLearningTask: async (payload: {
      classId: string;
      projectId?: string;
      projectName?: string;
      taskType: LearningTaskType;
      title: string;
      content: string;
      attachments?: string;
    }): Promise<LearningSubmission> => {
      const data = await request('/api/student/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.submission;
    },
    listStudentSubmissions: async (): Promise<LearningSubmission[]> => {
      return request('/api/student/submissions');
    },
  },
  admin: {
    listMcus: async (): Promise<any[]> => {
      return request('/api/admin/mcus');
    },
    saveMcu: async (mcu: any): Promise<any> => {
      return request('/api/admin/mcus', {
        method: 'POST',
        body: JSON.stringify(mcu),
      });
    },
    deleteMcu: async (mcuId: string): Promise<void> => {
      return request(`/api/admin/mcus/${mcuId}`, {
        method: 'DELETE',
      });
    },
    listComponents: async (): Promise<any[]> => {
      return request('/api/admin/components');
    },
    saveComponent: async (component: any): Promise<any> => {
      return request('/api/admin/components', {
        method: 'POST',
        body: JSON.stringify(component),
      });
    },
    deleteComponent: async (compId: string): Promise<void> => {
      return request(`/api/admin/components/${compId}`, {
        method: 'DELETE',
      });
    },
    listUsers: async (): Promise<any[]> => {
      return request('/api/admin/users');
    },
    saveUser: async (user: any): Promise<any> => {
      return request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    },
    deleteUser: async (userId: string): Promise<void> => {
      return request(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
  },
  hardware: {
    listComponents: async (): Promise<any[]> => {
      return request('/api/components');
    },
    listMcus: async (): Promise<any[]> => {
      return request('/api/mcus');
    },
  },
};
