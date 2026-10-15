import { apiClient } from './client';
import {
  Employee,
  EmployeeDocument,
  CreateEmployeeInput,
  UpdateEmployeePositionInput,
} from '../types/employee';

export const employeeApi = {
  list: async (): Promise<Employee[]> => {
    const res = await apiClient.get<Employee[] | { success: boolean; data: Employee[] }>('/employees');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getById: async (id: number): Promise<Employee> => {
    const res = await apiClient.get<Employee | { success: boolean; data: Employee }>(`/employees/${id}`);
    const data = (res.data as any)?.data ?? res.data;
    return data as Employee;
  },

  create: async (payload: CreateEmployeeInput): Promise<Employee> => {
    const res = await apiClient.post<Employee | { success: boolean; data: Employee }>('/employees', payload);
    const data = (res.data as any)?.data ?? res.data;
    return data as Employee;
  },

  generateId: async (): Promise<string> => {
    try {
      const res = await apiClient.get<{ success: boolean; data: { employeeId: string } } | { employeeId: string }>(
        '/employees/generate-id',
      );
      const data = (res.data as any)?.data ?? res.data;
      return data?.employeeId || `EMP-${Date.now().toString().slice(-4)}`;
    } catch {
      return `EMP-${Date.now().toString().slice(-4)}`;
    }
  },

  updatePosition: async (
    id: number,
    payload: UpdateEmployeePositionInput,
  ): Promise<Employee> => {
    const res = await apiClient.put<Employee | { success: boolean; data: Employee }>(
      `/employees/${id}/position`,
      payload,
    );
    const data = (res.data as any)?.data ?? res.data;
    return data as Employee;
  },

  uploadDocument: async (
    id: number,
    file: File,
    documentType: string,
    onProgress?: (percent: number) => void,
  ): Promise<EmployeeDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const res = await apiClient.post<EmployeeDocument | { success: boolean; data: EmployeeDocument }>(
      `/employees/${id}/documents`,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      },
    );
    const data = (res.data as any)?.data ?? res.data;
    return data as EmployeeDocument;
  },

  completeOnboarding: async (id: number): Promise<Employee> => {
    const res = await apiClient.post<Employee | { success: boolean; data: Employee }>(
      `/employees/${id}/onboarding/complete`,
    );
    const data = (res.data as any)?.data ?? res.data;
    return data as Employee;
  },

  activate: async (id: number): Promise<Employee> => {
    const res = await apiClient.post<Employee | { success: boolean; data: Employee }>(
      `/employees/${id}/activate`,
    );
    const data = (res.data as any)?.data ?? res.data;
    return data as Employee;
  },
};
