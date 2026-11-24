export type ModuleId =
  | 'acceso'
  | 'matriculas'
  | 'horarios'
  | 'aula_virtual'
  | 'certificados';

export interface PublicChallenge {
  _id: string;
  order: number;
  title: string;
  question: string;
  options: string[];
  points: number;
  moduleId: ModuleId;
  moduleName: string;
}

export interface HealthResponse {
  server: 'ok';
  mongodb: 'connected' | 'disconnected';
  message?: string;
}

export interface RunStartResponse {
  runId: string;
  player: string;
  startedAt: string;
  score: number;
  correctAnswers: number;
  hintsUsed: number;
  restoredModules: ModuleId[];
}

export interface HintResponse {
  hint: string;
  hintsUsed: number;
  score: number;
  alreadyUsed: boolean;
}

export interface AnswerResponse {
  correct: boolean;
  score: number;
  correctAnswers: number;
  hintsUsed: number;
  restoredModules: ModuleId[];
  moduleId: ModuleId;
  moduleName: string;
  restoredMessage?: string;
  explanation?: string;
}

export interface RunFinishResponse {
  player: string;
  correctAnswers: number;
  hintsUsed: number;
  restoredModules: ModuleId[];
  durationSeconds: number;
  score: number;
  startedAt: string;
  finishedAt: string;
  completed: boolean;
}

export interface LeaderboardEntry {
  player: string;
  score: number;
  correctAnswers: number;
  hintsUsed: number;
  durationSeconds: number;
  restoredModules: ModuleId[];
  finishedAt: string;
}
