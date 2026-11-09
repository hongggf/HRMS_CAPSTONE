import { apiClient } from './client';
import {
  TrainingCategory,
  Training,
  TrainingStatus,
  TrainingPlan,
  TrainingPlanStatus,
  TrainingSession,
  TrainingAttendance,
  TrainingEvaluation,
  EmployeeSkill,
  CreateTrainingCategoryInput,
  CreateTrainingInput,
  CreateTrainingPlanInput,
  AssignTrainingInput,
  CreateTrainingSessionInput,
  MarkAttendanceInput,
  EvaluateTrainingInput,
  UpdateEmployeeSkillInput,
} from '../types/lnd';

export const lndApi = {
  // Categories
  getCategories: async (): Promise<TrainingCategory[]> => {
    const res = await apiClient.get<TrainingCategory[] | { success: boolean; data: TrainingCategory[] }>(
      '/lnd/categories'
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createCategory: async (payload: CreateTrainingCategoryInput): Promise<TrainingCategory> => {
    const res = await apiClient.post<TrainingCategory | { success: boolean; data: TrainingCategory }>(
      '/lnd/categories',
      payload
    );
    return ((res.data as any)?.data ?? res.data) as TrainingCategory;
  },

  // Trainings
  getTrainings: async (params?: { departmentId?: number }): Promise<Training[]> => {
    const res = await apiClient.get<Training[] | { success: boolean; data: Training[] }>('/lnd/trainings', {
      params,
    });
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getTrainingById: async (id: number): Promise<Training> => {
    const res = await apiClient.get<Training | { success: boolean; data: Training }>(`/lnd/trainings/${id}`);
    return ((res.data as any)?.data ?? res.data) as Training;
  },

  createTraining: async (payload: CreateTrainingInput): Promise<Training> => {
    const res = await apiClient.post<Training | { success: boolean; data: Training }>('/lnd/trainings', payload);
    return ((res.data as any)?.data ?? res.data) as Training;
  },

  updateTrainingStatus: async (id: number, status: TrainingStatus): Promise<Training> => {
    const res = await apiClient.patch<Training | { success: boolean; data: Training }>(
      `/lnd/trainings/${id}/status`,
      { status }
    );
    return ((res.data as any)?.data ?? res.data) as Training;
  },

  joinTraining: async (id: number): Promise<{ message: string; assignment: any }> => {
    const res = await apiClient.post(`/lnd/trainings/${id}/join`);
    return (res.data as any)?.data ?? res.data;
  },

  assignEmployees: async (trainingId: number, payload: AssignTrainingInput) => {
    const res = await apiClient.post(`/lnd/trainings/${trainingId}/assignments`, payload);
    return (res.data as any)?.data ?? res.data;
  },

  // Plans
  getPlans: async (): Promise<TrainingPlan[]> => {
    const res = await apiClient.get<TrainingPlan[] | { success: boolean; data: TrainingPlan[] }>('/lnd/plans');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createPlan: async (payload: CreateTrainingPlanInput): Promise<TrainingPlan> => {
    const res = await apiClient.post<TrainingPlan | { success: boolean; data: TrainingPlan }>('/lnd/plans', payload);
    return ((res.data as any)?.data ?? res.data) as TrainingPlan;
  },

  updatePlanStatus: async (id: number, status: TrainingPlanStatus): Promise<TrainingPlan> => {
    const res = await apiClient.patch<TrainingPlan | { success: boolean; data: TrainingPlan }>(
      `/lnd/plans/${id}/status`,
      { status }
    );
    return ((res.data as any)?.data ?? res.data) as TrainingPlan;
  },

  // Sessions & Attendance
  getSessions: async (trainingId: number): Promise<TrainingSession[]> => {
    const res = await apiClient.get<TrainingSession[] | { success: boolean; data: TrainingSession[] }>(
      `/lnd/trainings/${trainingId}/sessions`
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  createSession: async (trainingId: number, payload: CreateTrainingSessionInput): Promise<TrainingSession> => {
    const res = await apiClient.post<TrainingSession | { success: boolean; data: TrainingSession }>(
      `/lnd/trainings/${trainingId}/sessions`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as TrainingSession;
  },

  getSessionAttendance: async (sessionId: number): Promise<TrainingAttendance[]> => {
    const res = await apiClient.get<TrainingAttendance[] | { success: boolean; data: TrainingAttendance[] }>(
      `/lnd/sessions/${sessionId}/attendance`
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  markAttendance: async (sessionId: number, payload: MarkAttendanceInput): Promise<TrainingAttendance> => {
    const res = await apiClient.post<TrainingAttendance | { success: boolean; data: TrainingAttendance }>(
      `/lnd/sessions/${sessionId}/attendance`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as TrainingAttendance;
  },

  // Evaluations
  getEvaluations: async (trainingId: number): Promise<TrainingEvaluation[]> => {
    const res = await apiClient.get<TrainingEvaluation[] | { success: boolean; data: TrainingEvaluation[] }>(
      `/lnd/trainings/${trainingId}/evaluations`
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  evaluateTraining: async (trainingId: number, payload: EvaluateTrainingInput): Promise<TrainingEvaluation> => {
    const res = await apiClient.post<TrainingEvaluation | { success: boolean; data: TrainingEvaluation }>(
      `/lnd/trainings/${trainingId}/evaluations`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as TrainingEvaluation;
  },

  // Employee Skills
  getAllSkills: async (): Promise<EmployeeSkill[]> => {
    const res = await apiClient.get<EmployeeSkill[] | { success: boolean; data: EmployeeSkill[] }>('/lnd/skills');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getEmployeeSkills: async (employeeId: number): Promise<EmployeeSkill[]> => {
    const res = await apiClient.get<EmployeeSkill[] | { success: boolean; data: EmployeeSkill[] }>(
      `/lnd/employees/${employeeId}/skills`
    );
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  updateSkill: async (employeeId: number, payload: UpdateEmployeeSkillInput): Promise<EmployeeSkill> => {
    const res = await apiClient.post<EmployeeSkill | { success: boolean; data: EmployeeSkill }>(
      `/lnd/employees/${employeeId}/skills`,
      payload
    );
    return ((res.data as any)?.data ?? res.data) as EmployeeSkill;
  },
};
