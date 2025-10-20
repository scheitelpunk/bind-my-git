import { api } from './api';
import type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  PaginatedResponse,
  TaskStatus,
} from '@/types';

export const tasksApi = {
  // Get all tasks with pagination and filters
  getTasks: (
    page = 0,
    size = 10,
    filters?: TaskFilters
  ): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(priority => params.append('priority', priority));
      }
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.tags?.length) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
      if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    }

    return api.getPaginated<Task>(`/tasks?${params.toString()}`);
  },

  // Get task by ID
  getTask: (id: string): Promise<Task> => {
    return api.get<Task>(`/tasks/${id}`);
  },

  // Create new task
  createTask: (data: CreateTaskData): Promise<Task> => {
    return api.post<Task>('/tasks', data);
  },

  // Update task
  updateTask: (id: string, data: UpdateTaskData): Promise<Task> => {
    return api.put<Task>(`/tasks/${id}`, data);
  },

  // Update task status
  updateTaskStatus: (id: string, status: TaskStatus): Promise<Task> => {
    return api.patch<Task>(`/tasks/${id}/status`, { status });
  },

  // Delete task
  deleteTask: (id: string): Promise<void> => {
    return api.delete<void>(`/tasks/${id}`);
  },

  // Assign task to user
  assignTask: (id: string, assigneeId: string): Promise<Task> => {
    return api.patch<Task>(`/tasks/${id}/assign`, { assignee_id: assigneeId });
  },

  // Unassign task
  unassignTask: (id: string): Promise<Task> => {
    return api.patch<Task>(`/tasks/${id}/unassign`, {});
  },

  // Get tasks by project
  getTasksByProject: (projectId: string): Promise<Task[]> => {
    return api.get<Task[]>(`/projects/${projectId}/tasks`);
  },

  // Get assigned tasks for current user
  getMyTasks: (): Promise<Task[]> => {
    return api.get<Task[]>('/tasks/my');
  },

  // Get tasks created by current user
  getCreatedTasks: (): Promise<Task[]> => {
    return api.get<Task[]>('/tasks/created');
  },

  // Reorder tasks (for Kanban)
  reorderTasks: (tasks: { id: string; status: TaskStatus; order: number }[]): Promise<void> => {
    return api.post<void>('/tasks/reorder', { tasks });
  },

  // Get available tags
  getTags: (): Promise<string[]> => {
    return api.get<string[]>('/tasks/tags');
  },
};