export type TrainingType = 'INTERNAL' | 'EXTERNAL' | 'ONLINE' | 'CLASSROOM';
export type TrainingStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TrainingPlanStatus =
  'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TrainingAttendanceStatus = 'REGISTERED' | 'ATTENDED' | 'ABSENT';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface TrainingCategory {
  id: number;
  name: string;
  description?: string | null;
  _count?: {
    trainings: number;
  };
}

export interface Training {
  id: number;
  title: string;
  description?: string | null;
  categoryId: number;
  departmentId?: number | null;
  provider?: string | null;
  type: TrainingType;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  cost?: number | null;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  category?: TrainingCategory;
  department?: {
    id: number;
    name: string;
    code: string;
  } | null;
  plans?: TrainingPlan[];
  sessions?: TrainingSession[];
  assignments?: TrainingAssignment[];
  evaluations?: TrainingEvaluation[];
  _count?: {
    assignments: number;
    sessions: number;
    evaluations: number;
  };
}

export interface TrainingPlan {
  id: number;
  trainingId: number;
  identifiedNeed: string;
  objective: string;
  targetEmployees?: string | null;
  priority?: string | null;
  budget?: number | null;
  plannedDate?: string | null;
  status: TrainingPlanStatus;
  createdAt: string;
  updatedAt: string;
  training?: Training;
}

export interface TrainingAssignment {
  id: number;
  trainingId: number;
  employeeId: number;
  assignedAt: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      id: number;
      name: string;
    } | null;
    position?: {
      id: number;
      title: string;
    } | null;
  };
}

export interface TrainingSession {
  id: number;
  trainingId: number;
  title: string;
  date: string;
  location?: string | null;
  attendances?: TrainingAttendance[];
}

export interface TrainingAttendance {
  id: number;
  sessionId: number;
  employeeId: number;
  status: TrainingAttendanceStatus;
  attendedAt?: string | null;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      id: number;
      name: string;
    } | null;
  };
}

export interface TrainingEvaluation {
  id: number;
  trainingId: number;
  evaluatorId: number;
  rating: number;
  feedback?: string | null;
  comments?: string | null;
  createdAt: string;
  evaluator?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export interface EmployeeSkill {
  id: number;
  employeeId: number;
  skillName: string;
  level: SkillLevel;
  acquiredAt: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      id: number;
      name: string;
    } | null;
    position?: {
      id: number;
      title: string;
    } | null;
  };
}

// Request Inputs
export interface CreateTrainingCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateTrainingCategoryInput {
  name?: string;
  description?: string;
}

export interface CreateTrainingInput {
  title: string;
  description?: string;
  categoryId: number;
  departmentId?: number | null;
  provider?: string;
  type: TrainingType;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  cost?: number;
}

export interface UpdateTrainingInput {
  title?: string;
  description?: string;
  categoryId?: number;
  departmentId?: number | null;
  provider?: string;
  type?: TrainingType;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  cost?: number;
}

export interface CreateTrainingPlanInput {
  trainingId: number;
  identifiedNeed: string;
  objective: string;
  targetEmployees?: string;
  priority?: string;
  budget?: number;
  plannedDate?: string;
}

export interface AssignTrainingInput {
  employeeIds: number[];
}

export interface CreateTrainingSessionInput {
  title: string;
  date: string;
  location?: string;
}

export interface MarkAttendanceInput {
  employeeId: number;
  status: TrainingAttendanceStatus;
}

export interface EvaluateTrainingInput {
  evaluatorId: number;
  rating: number;
  feedback?: string;
  comments?: string;
}

export interface UpdateEmployeeSkillInput {
  skillName: string;
  level: SkillLevel;
}
