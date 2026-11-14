export interface AuditLog {
  id: number;
  actorId: number | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  oldValues?: any;
  newValues?: any;
  requestId?: string | null;
  timestamp: string;
  user?: {
    email: string;
  } | null;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  actorId?: number;
  module?: string;
  action?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}
