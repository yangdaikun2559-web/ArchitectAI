export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: 'user' | 'teacher' | 'admin' | 'superadmin';
  createdAt: string;
  updatedAt: string;
}

export interface FileEntry {
  path: string;
  content: string;
  language: string;
}

export interface PinConnection {
  fromPin: string;
  toComponent: string;
  toPin: string;
  signalType: 'VCC' | 'GND' | 'I2C_SDA' | 'I2C_SCL' | 'GPIO' | 'ADC' | 'PWM' | 'UART_TX' | 'UART_RX';
  color?: string;
  description?: string;
}

export interface ComponentItem {
  id: string;
  name: string;
  type: 'I2C' | 'Analog' | 'Digital' | 'PWM' | 'SPI' | 'UART';
  category: 'Sensor' | 'Display' | 'Alert' | 'Actuator' | 'Other';
  pinsUsed: number;
  voltage: '3.3V' | '5V' | 'Both';
  active: boolean;
  description: string;
  macroPrefix?: string;
  cadLayout?: {
    width: number;
    height: number;
    renderType: string;
    pins: { name: string; offsetY: number; type: string }[];
  };
  drivers?: {
    platformioLibs: string[];
    includes: string[];
    defines: string[];
    globalInstantiation: string;
    setupCode: string;
    apiDocumentation: string;
  };
}

export interface IoTProject {
  projectId: string;
  userId: string;
  name: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  rawInput: string;
  optimizedPrompt: string;
  recommendedPlatform: string;
  recommendedSensors: string;
  recommendedDisplays: string;
  recommendedAlerts: string;
  recommendedNetwork: string;
  recommendedPower: string;
  diagramSvg?: string;
  readmeText?: string;
  codeFiles?: string; // Serialized string representation of FileEntry[]
  logs?: string; // Serialized list of logs
  errorMessage?: string;
  selectedProvider?: 'gemini' | 'deepseek';
  selectedModel?: string;
  createdAt: string;
  updatedAt: string;
}

export type LearningTaskType =
  | 'requirement'
  | 'components'
  | 'interfaces'
  | 'wiring'
  | 'safety'
  | 'code'
  | 'export'
  | 'reflection';

export interface LearningQuestion {
  type: 'choice' | 'judge' | 'short';
  prompt: string;
  options?: string[];
  answer?: string;
  explanation?: string;
}

export interface LearningPortrait {
  scope: 'student' | 'class';
  title: string;
  summary: string;
  tags: string[];
  strengths: string[];
  risks: string[];
  suggestions: string[];
  dimensions?: Array<{
    name: string;
    level: 'strong' | 'stable' | 'developing' | 'risk';
    score?: number;
    evidence: string;
    suggestion: string;
  }>;
  focusItems?: string[];
  teachingFocus?: Array<{
    title: string;
    reason: string;
    action: string;
  }>;
  updatedAt: string;
  coverage: {
    submissions: number;
    completedTasks: number;
    averageAiScore?: number;
  };
}

export interface ClassRoom {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassMember {
  classId: string;
  userId: string;
  role: 'student';
  joinedAt: string;
  displayName?: string;
  username?: string;
}

export interface ClassTeacherMember {
  classId: string;
  userId: string;
  role: 'creator' | 'teacher';
  joinedAt: string;
  displayName?: string;
  username?: string;
  department?: string;
}

export interface ClassJoinRequest {
  requestId: string;
  classId: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  className?: string;
  studentName?: string;
  username?: string;
}

export interface JoinClassResponse {
  status: 'joined' | 'pending';
  classRoom: ClassRoom;
  request?: ClassJoinRequest;
  member?: ClassMember;
}

export interface LearningSubmission {
  submissionId: string;
  classId: string;
  studentId: string;
  projectId?: string;
  taskType: LearningTaskType;
  title: string;
  content: string;
  attachments?: string;
  aiFeedback?: string;
  aiScore?: number;
  aiRubric?: string;
  aiSuggestions?: string;
  aiStatus?: 'pending' | 'completed' | 'failed';
  aiEvaluatedAt?: string;
  aiObjectiveCorrect?: number;
  aiObjectiveTotal?: number;
  aiEvidenceScope?: {
    submissions: number;
    completedTasks: number;
    missingTasks: LearningTaskType[];
    isComplete: boolean;
  };
  teacherFeedback?: string;
  score?: number;
  status: 'submitted' | 'reviewed';
  createdAt: string;
  updatedAt: string;
  studentName?: string;
  className?: string;
  projectName?: string;
}

export interface GenerationStepLog {
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'warn' | 'error';
}
