import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/projects';
import { toast } from 'react-hot-toast';
import type { CreateProjectData, UpdateProjectData, ProjectFilters } from '@/types';

export const useProjects = (filters?: ProjectFilters, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['projects', filters, page, size],
    queryFn: () => projectsApi.getProjects(page, size, filters),
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });
};

export const useMyProjects = () => {
  return useQuery({
    queryKey: ['myProjects'],
    queryFn: projectsApi.getMyProjects,
  });
};

export const useProjectStats = (id: string) => {
  return useQuery({
    queryKey: ['projectStats', id],
    queryFn: () => projectsApi.getProjectStats(id),
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['myProjects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project');
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['myProjects'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project');
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['myProjects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete project');
    },
  });
};

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      projectsApi.addMember(projectId, userId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      toast.success('Member added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add member');
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      projectsApi.removeMember(projectId, userId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
};