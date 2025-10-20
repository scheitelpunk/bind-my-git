import { api } from './api';
import type {
  TimeEntry,
  ActiveTimer,
  StartTimerData,
  StopTimerData,
  TimeEntryFilters,
  PaginatedResponse,
  TimeReport,
} from '@/types';

export const timeTrackingApi = {
  // Get current active timer
  getActiveTimer: (): Promise<ActiveTimer | null> => {
    return api.get<ActiveTimer | null>('/time-tracking/active');
  },

  // Start timer for a task
  startTimer: (data: StartTimerData): Promise<ActiveTimer> => {
    return api.post<ActiveTimer>('/time-tracking/start', data);
  },

  // Stop current timer
  stopTimer: (data?: StopTimerData): Promise<TimeEntry> => {
    return api.post<TimeEntry>('/time-tracking/stop', data);
  },

  // Get time entries with pagination and filters
  getTimeEntries: (
    page = 0,
    size = 10,
    filters?: TimeEntryFilters
  ): Promise<PaginatedResponse<TimeEntry>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.task_id) params.append('task_id', filters.task_id);
      if (filters.start_time) params.append('start_time', filters.start_time);
      if (filters.end_time) params.append('end_time', filters.end_time);
    }

    return api.getPaginated<TimeEntry>(`/time-entries?${params.toString()}`);
  },

  // Get time entry by ID
  getTimeEntry: (id: string): Promise<TimeEntry> => {
    return api.get<TimeEntry>(`/time-entries/${id}`);
  },

  // Create manual time entry
  createTimeEntry: (data: {
    task_id: string;
    description: string;
    start_time: string;
    end_time: string;
    external?: boolean;
    billable?: boolean;
  }): Promise<TimeEntry> => {
    return api.post<TimeEntry>('/time-entries', data);
  },

  // Update time entry
  updateTimeEntry: (id: string, data: {
    description?: string;
    start_time?: string;
    end_time?: string;
    external?: boolean;
    billable?: boolean;
  }): Promise<TimeEntry> => {
    return api.put<TimeEntry>(`/time-entries/${id}`, data);
  },

  // Delete time entry
  deleteTimeEntry: (id: string): Promise<void> => {
    return api.delete<void>(`/time-entries/${id}`);
  },

  // Get user's time entries
  getMyTimeEntries: (dateFrom?: string, dateTo?: string, projectId?: string): Promise<TimeEntry[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (projectId) params.append('project_id', projectId);

    return api.get<TimeEntry[]>(`/time-entries/my?${params.toString()}`);
  },

  // Get time report for project
  getProjectTimeReport: (projectId: string, dateFrom?: string, dateTo?: string): Promise<TimeReport[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    return api.get<TimeReport[]>(`/time-tracking/reports/project/${projectId}?${params.toString()}`);
  },

  // Get time report for user
  getUserTimeReport: (userId: string, dateFrom?: string, dateTo?: string): Promise<TimeReport[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    return api.get<TimeReport[]>(`/time-tracking/reports/user/${userId}?${params.toString()}`);
  },

  // Get time summary
  getTimeSummary: (filters?: {
    project_id?: string;
    user_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<{
    total_hours: number;
    totalEntries: number;
    averageHoursPerDay: number;
    project_breakdown: { project_id: string; projectName: string; hours: number }[];
  }> => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.start_time) params.append('start_time', filters.start_time);
    if (filters?.end_time) params.append('end_time', filters.end_time);

    return api.get(`/time-tracking/summary?${params.toString()}`);
  },
};