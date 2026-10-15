import { Department, Position } from './organization';

export type EmployeeStatus =
  | 'PENDING_ONBOARDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TERMINATED';

export type OnboardingStatus =
  | 'PENDING_ONBOARDING'
  | 'DOCUMENT_COLLECTION'
  | 'PROFILE_COMPLETED'
  | 'ACTIVE';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP';

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  documentType: string;
  fileName: string;
  storageKey: string;
  uploadedById: number;
  uploadedAt: string;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePositionHistory {
  id: number;
  employeeId: number;
  positionId: number;
  departmentId: number;
  startDate: string;
  endDate?: string | null;
  changedById?: number | null;
  notes?: string | null;
  createdAt: string;
  department?: Department;
  position?: Position;
}

export interface EmployeeSalaryHistory {
  id: number;
  employeeId: number;
  baseSalary: number;
  currency: string;
  effectiveDate: string;
  endDate?: string | null;
  changeReason?: string | null;
  changedById?: number | null;
  createdAt: string;
}

export interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  departmentId: number;
  positionId: number;
  managerId?: number | null;
  employmentType: EmploymentType;
  hireDate?: string | null;
  status: EmployeeStatus;
  onboardingStatus: OnboardingStatus;
  userId?: number | null;
  createdAt: string;
  updatedAt: string;
  department?: Department;
  position?: Position;
  manager?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
  } | null;
  documents?: EmployeeDocument[];
  positionHistory?: EmployeePositionHistory[];
  salaryHistory?: EmployeeSalaryHistory[];
}

export interface CreateEmployeeInput {
  applicationId: number;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  departmentId: number;
  positionId: number;
  managerId?: number;
  employmentType?: EmploymentType;
  hireDate?: string;
  baseSalary?: number;
}

export interface UpdateEmployeePositionInput {
  departmentId?: number;
  positionId?: number;
}

export interface EmployeeFilterQuery {
  departmentId?: number;
  status?: EmployeeStatus;
  onboardingStatus?: OnboardingStatus;
  search?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID_PROOF: 'Government ID / Passport',
  EMPLOYMENT_CONTRACT: 'Employment Contract',
  EDUCATIONAL_DEGREE: 'Degree / Certificate',
  RESUME_CV: 'Resume / Curriculum Vitae',
  TAX_FORM: 'Tax Document / W-4',
  BACKGROUND_CHECK: 'Background Verification',
  OTHER: 'Other Supporting Document',
};

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB matching backend Multer limit
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
