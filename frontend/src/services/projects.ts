import { api } from './api';
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters,
  PaginatedResponse,
  User,
} from '@/types';

export const projectsApi = {
  // Get all projects with pagination and filters
  getProjects: (
    page = 0,
    size = 10,
    filters?: ProjectFilters
  ): Promise<PaginatedResponse<Project>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.owner_id) params.append('ownerId', filters.owner_id);
      if (filters.member_id) params.append('memberId', filters.member_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
      if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    }

    return api.getPaginated<Project>(`/projects?${params.toString()}`);
  },

  // Get project by ID
  getProject: (id: string): Promise<Project> => {
    return api.get<Project>(`/projects/${id}`);
  },

  // Create new project
  createProject: (data: CreateProjectData): Promise<Project> => {
    return api.post<Project>('/projects', data);
  },

  // Update project
  updateProject: (id: string, data: UpdateProjectData): Promise<Project> => {
    return api.put<Project>(`/projects/${id}`, data);
  },

  // Delete project
  deleteProject: (id: string): Promise<void> => {
    return api.delete<void>(`/projects/${id}`);
  },

  // Add member to project
  addMember: (projectId: string, userId: string, role: string): Promise<void> => {
    // Backend expects snake_case fields and requires project_id in the body
    return api.post<void>(`/projects/${projectId}/members`, { project_id: projectId, user_id: userId, role: role });
  },

  // Remove member from project
  removeMember: (projectId: string, userId: string): Promise<void> => {
    return api.delete<void>(`/projects/${projectId}/members/${userId}`);
  },

  // Update member role
  updateMemberRole: (projectId: string, userId: string, role: string): Promise<void> => {
    return api.put<void>(`/projects/${projectId}/members/${userId}`, { role });
  },

  // Get project members
  getProjectMembers: (projectId: string): Promise<User[]> => {
    return api.get<User[]>(`/projects/${projectId}/members`);
  },

  // Get projects where user is a member
  getMyProjects: (): Promise<Project[]> => {
    return api.get<Project[]>('/projects/my');
  },

  // Get project statistics
  getProjectStats: (projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    progress: number;
  }> => {
    return api.get(`/projects/${projectId}/stats`);
  },
};