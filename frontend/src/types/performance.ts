export type CycleStatus = 'DRAFT' | 'OPEN' | 'IN_REVIEW' | 'CLOSED';
export type GoalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type ReviewStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'HEAD_OF_HR_REVIEW'
  | 'FINALIZED'
  | 'REJECTED';
export type PromotionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';
export type PIPStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PerformanceCycle {
  id: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reviews: number;
    goals: number;
  };
}

export interface KPI {
  id: number;
  name: string;
  description?: string | null;
  metric?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeGoalKPI {
  id: number;
  goalId: number;
  kpiId: number;
  targetValue?: number | null;
  actualValue?: number | null;
  kpi: KPI;
}

export interface Goal {
  id: number;
  cycleId: number;
  employeeId: number;
  title: string;
  description?: string | null;
  weight: number;
  target?: string | null;
  measurement?: string | null;
  dueDate: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  kpis?: EmployeeGoalKPI[];
}

export interface PerformanceRating {
  id: number;
  reviewId: number;
  goalId: number;
  rating: number;
  comment?: string | null;
  goal?: Goal;
}

export interface Feedback {
  id: number;
  reviewId: number;
  providerId: number;
  content: string;
  createdAt: string;
  provider?: {
    id: number;
    email: string;
  };
}

export interface PerformanceReview {
  id: number;
  cycleId: number;
  employeeId: number;
  reviewerId?: number | null;
  status: ReviewStatus;
  overallScore?: number | null;
  comments?: string | null;
  employeeFeedback?: string | null;
  managerFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
  cycle?: PerformanceCycle;
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
  reviewer?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
  } | null;
  ratings?: PerformanceRating[];
  feedbacks?: Feedback[];
}

export interface PromotionRequest {
  id: number;
  employeeId: number;
  currentPositionId: number;
  proposedPositionId: number;
  currentSalary?: number | null;
  proposedSalary?: number | null;
  reason: string;
  performanceReviewId?: number | null;
  effectiveDate: string;
  status: PromotionStatus;
  requestedById: number;
  approvedById?: number | null;
  createdAt: string;
  updatedAt: string;
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
  currentPosition?: {
    id: number;
    title: string;
    code: string;
  };
  proposedPosition?: {
    id: number;
    title: string;
    code: string;
  };
  requestedBy?: {
    id: number;
    email: string;
  };
  approvedBy?: {
    id: number;
    email: string;
  } | null;
  performanceReview?: {
    id: number;
    overallScore?: number | null;
    status: ReviewStatus;
  } | null;
}

export interface ImprovementPlanItem {
  id: number;
  planId: number;
  action: string;
  target: string;
  owner: string;
  dueDate: string;
  progress: number;
  completionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImprovementPlan {
  id: number;
  employeeId: number;
  reason: string;
  startDate: string;
  endDate: string;
  objective: string;
  status: PIPStatus;
  createdAt: string;
  updatedAt: string;
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
  items?: ImprovementPlanItem[];
}

// Request Inputs
export interface CreateCycleInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface CreateGoalInput {
  cycleId: number;
  employeeId: number;
  title: string;
  description?: string;
  weight: number;
  target?: string;
  measurement?: string;
  dueDate: string;
}

export interface AssignKPIInput {
  kpiId: number;
  targetValue?: number;
}

export interface CreateReviewInput {
  cycleId: number;
  employeeId: number;
  reviewerId?: number;
}

export interface RatingInput {
  goalId: number;
  rating: number;
  comment?: string;
}

export interface SubmitEvaluationInput {
  ratings: RatingInput[];
  comments?: string;
  employeeFeedback?: string;
  managerFeedback?: string;
}

export interface CreatePromotionInput {
  employeeId: number;
  proposedPositionId: number;
  proposedSalary?: number;
  reason: string;
  performanceReviewId?: number;
  effectiveDate: string;
}

export interface CreatePipInput {
  employeeId: number;
  reason: string;
  startDate: string;
  endDate: string;
  objective: string;
}

export interface AddPipItemInput {
  action: string;
  target: string;
  owner: string;
  dueDate: string;
}

export interface UpdatePipProgressInput {
  progress: number;
  completionDate?: string | null;
}
