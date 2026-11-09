import { apiClient } from './client';
import {
  PerformanceCycle,
  Goal,
  KPI,
  EmployeeGoalKPI,
  PerformanceReview,
  PromotionRequest,
  ImprovementPlan,
  CreateCycleInput,
  CreateGoalInput,
  AssignKPIInput,
  CreateReviewInput,
  SubmitEvaluationInput,
  CreatePromotionInput,
  CreatePipInput,
  AddPipItemInput,
  UpdatePipProgressInput,
} from '../types/performance';

export const performanceApi = {
  // Cycles
  getCycles: async (): Promise<PerformanceCycle[]> => {
    const res = await apiClient.get<PerformanceCycle[] | { success: boolean; data: PerformanceCycle[] }>(
      '/performance/cycles'
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createCycle: async (payload: CreateCycleInput): Promise<PerformanceCycle> => {
    const res = await apiClient.post<PerformanceCycle | { success: boolean; data: PerformanceCycle }>(
      '/performance/cycles',
      payload
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceCycle;
  },

  // Goals & KPIs
  getGoals: async (cycleId?: number, employeeId?: number): Promise<Goal[]> => {
    const params: Record<string, any> = {};
    if (cycleId) params.cycleId = cycleId;
    if (employeeId) params.employeeId = employeeId;
    const res = await apiClient.get<Goal[] | { success: boolean; data: Goal[] }>('/performance/goals', {
      params,
    });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createGoal: async (payload: CreateGoalInput): Promise<Goal> => {
    const res = await apiClient.post<Goal | { success: boolean; data: Goal }>('/performance/goals', payload);
    return ((res.data as any)?.data ?? res.data) as Goal;
  },

  getKPIs: async (): Promise<KPI[]> => {
    const res = await apiClient.get<KPI[] | { success: boolean; data: KPI[] }>('/performance/kpis');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createKPI: async (payload: { name: string; description?: string; metric?: string }): Promise<KPI> => {
    const res = await apiClient.post<KPI | { success: boolean; data: KPI }>('/performance/kpis', payload);
    return ((res.data as any)?.data ?? res.data) as KPI;
  },

  assignKPI: async (goalId: number, payload: AssignKPIInput): Promise<EmployeeGoalKPI> => {
    const res = await apiClient.post<EmployeeGoalKPI | { success: boolean; data: EmployeeGoalKPI }>(
      `/performance/goals/${goalId}/kpi`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as EmployeeGoalKPI;
  },

  // Reviews
  getReviews: async (filters?: {
    cycleId?: number;
    employeeId?: number;
    status?: string;
  }): Promise<PerformanceReview[]> => {
    const res = await apiClient.get<PerformanceReview[] | { success: boolean; data: PerformanceReview[] }>(
      '/performance/reviews',
      { params: filters }
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getReviewById: async (id: number): Promise<PerformanceReview> => {
    const res = await apiClient.get<PerformanceReview | { success: boolean; data: PerformanceReview }>(
      `/performance/reviews/${id}`
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceReview;
  },

  createReview: async (payload: CreateReviewInput): Promise<PerformanceReview> => {
    const res = await apiClient.post<PerformanceReview | { success: boolean; data: PerformanceReview }>(
      '/performance/reviews',
      payload
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceReview;
  },

  evaluateReview: async (id: number, payload: SubmitEvaluationInput): Promise<PerformanceReview> => {
    const res = await apiClient.post<PerformanceReview | { success: boolean; data: PerformanceReview }>(
      `/performance/reviews/${id}/evaluate`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceReview;
  },

  approveReview: async (id: number): Promise<PerformanceReview> => {
    const res = await apiClient.post<PerformanceReview | { success: boolean; data: PerformanceReview }>(
      `/performance/reviews/${id}/approve`
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceReview;
  },

  finalizeReview: async (id: number): Promise<PerformanceReview> => {
    const res = await apiClient.post<PerformanceReview | { success: boolean; data: PerformanceReview }>(
      `/performance/reviews/${id}/finalize`
    );
    return ((res.data as any)?.data ?? res.data) as PerformanceReview;
  },

  // Promotion Requests
  getPromotions: async (filters?: { employeeId?: number; status?: string }): Promise<PromotionRequest[]> => {
    const res = await apiClient.get<PromotionRequest[] | { success: boolean; data: PromotionRequest[] }>(
      '/promotions/requests',
      { params: filters }
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  requestPromotion: async (payload: CreatePromotionInput): Promise<PromotionRequest> => {
    const res = await apiClient.post<PromotionRequest | { success: boolean; data: PromotionRequest }>(
      '/promotions/requests',
      payload
    );
    return ((res.data as any)?.data ?? res.data) as PromotionRequest;
  },

  approvePromotion: async (id: number): Promise<PromotionRequest> => {
    const res = await apiClient.post<PromotionRequest | { success: boolean; data: PromotionRequest }>(
      `/promotions/requests/${id}/approve`
    );
    return ((res.data as any)?.data ?? res.data) as PromotionRequest;
  },

  rejectPromotion: async (id: number): Promise<PromotionRequest> => {
    const res = await apiClient.post<PromotionRequest | { success: boolean; data: PromotionRequest }>(
      `/promotions/requests/${id}/reject`
    );
    return ((res.data as any)?.data ?? res.data) as PromotionRequest;
  },

  // Performance Improvement Plans (PIPs)
  getPips: async (filters?: { employeeId?: number; status?: string }): Promise<ImprovementPlan[]> => {
    const res = await apiClient.get<ImprovementPlan[] | { success: boolean; data: ImprovementPlan[] }>(
      '/promotions/pips',
      { params: filters }
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getPipById: async (id: number): Promise<ImprovementPlan> => {
    const res = await apiClient.get<ImprovementPlan | { success: boolean; data: ImprovementPlan }>(
      `/promotions/pips/${id}`
    );
    return ((res.data as any)?.data ?? res.data) as ImprovementPlan;
  },

  createPip: async (payload: CreatePipInput): Promise<ImprovementPlan> => {
    const res = await apiClient.post<ImprovementPlan | { success: boolean; data: ImprovementPlan }>(
      '/promotions/pips',
      payload
    );
    return ((res.data as any)?.data ?? res.data) as ImprovementPlan;
  },

  addPipItem: async (pipId: number, payload: AddPipItemInput) => {
    const res = await apiClient.post(`/promotions/pips/${pipId}/items`, payload);
    return (res.data as any)?.data ?? res.data;
  },

  updatePipProgress: async (itemId: number, payload: UpdatePipProgressInput) => {
    const res = await apiClient.put(`/promotions/pips/items/${itemId}/progress`, payload);
    return (res.data as any)?.data ?? res.data;
  },
};
