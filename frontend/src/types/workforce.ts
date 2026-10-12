import { PaginationMeta } from './api';

export type WorkforceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface WorkforceRequest {
  id: number;
  departmentId: number;
  positionId: number;
  requestedBy: number;
  headcount: number;
  justification: string;
  status: WorkforceStatus;
  approvedBy?: number | null;
  approvedAt?: string | null;
  rejectedBy?: number | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: number;
    name: string;
    code: string;
  };
  position?: {
    id: number;
    title: string;
    code: string;
  };
  requester?: {
    id: number;
    email: string;
  };
  approver?: {
    id: number;
    email: string;
  } | null;
  rejector?: {
    id: number;
    email: string;
  } | null;
}

export interface CreateWorkforceRequestInput {
  departmentId: number;
  positionId: number;
  headcount: number;
  justification: string;
}

export interface UpdateWorkforceRequestInput {
  departmentId?: number;
  positionId?: number;
  headcount?: number;
  justification?: string;
}

export interface RejectWorkforceRequestInput {
  rejectionReason: string;
}

export interface ListWorkforceRequestsQuery {
  page?: number;
  limit?: number;
  status?: WorkforceStatus;
  departmentId?: number;
}

export interface WorkforceRequestsResponse {
  workforceRequests: WorkforceRequest[];
  meta: PaginationMeta;
}
