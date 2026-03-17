
export type UserRole = 'student' | 'teacher';

export interface StudentInfo {
  name: string;
  rollNo: string;
}

export interface TeacherInfo {
  name: string;
  teacherId: string;
}

export interface Submission {
  id: string;
  student: StudentInfo;
  experimentName: string;
  result: PhysicsResult;
  timestamp: number;
}

export interface PhysicsResult {
  integrity: {
    score: number;
    note: string;
    tag: 'ok' | 'warn' | 'bad';
  };
  calculatedValues: number[];
  studentValues: number[];
  meanCalculated: number;
  meanStudent: number;
  ok: boolean;
  fMarks: number;
  cMarks: number;
  total: number;
  parsedFormula: {
    type: string;
    display: string;
  };
  unit: string;
  label: string;
  instructorInsights?: {
    authenticityScore: 'High' | 'Medium' | 'Low';
    similarityIndex: number;
    sourceMatch: string;
    timeOnTask: number;
    clipboardUsed: boolean;
    flag: 'authentic' | 'caution' | 'flagged';
  };
}

export interface CodeErrorInfo {
  type: string;
  msg: string;
  concept: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: CodeErrorInfo;
}

export interface AiExplanation {
  what_happened: string;
  why_it_happened: string;
  concept: string;
  how_to_fix: string;
  deeper_note?: string;
}

export interface QuizQuestion {
  id: number;
  difficulty: string;
  title: string;
  description: string;
  starter_code: string;
  expected_behavior: string;
  hint: string;
}

export interface Quiz {
  concept: string;
  language: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  correct: boolean;
  output_simulation: string;
  feedback: string;
  improvement: string;
  correct_code?: string;
}

export interface UserProfile {
  totalRuns: number;
  successRuns: number;
  quizTotal: number;
  quizCorrect: number;
  currentProfile?: string;
  conceptStats: Record<string, { count: number; improved: boolean; lastSeen?: number }>;
}
