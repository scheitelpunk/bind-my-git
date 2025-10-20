import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/services/tasks';
import { toast } from 'react-hot-toast';
import type { CreateTaskData, UpdateTaskData, TaskFilters, TaskStatus } from '@/types';

export const useTasks = (filters?: TaskFilters, page = 0, size = 10) => {
  return useQuery({
    queryKey: ['tasks', filters, page, size],
    queryFn: () => tasksApi.getTasks(page, size, filters),
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });
};

export const useTasksByProject = (projectId: string) => {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: () => tasksApi.getTasksByProject(projectId),
    enabled: !!projectId,
  });
};

export const useMyTasks = () => {
  return useQuery({
    queryKey: ['myTasks'],
    queryFn: tasksApi.getMyTasks,
  });
};

export const useCreatedTasks = () => {
  return useQuery({
    queryKey: ['createdTasks'],
    queryFn: tasksApi.getCreatedTasks,
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: tasksApi.getTags,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskData) => tasksApi.createTask(data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', task.project_id] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['createdTasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) =>
      tasksApi.updateTask(id, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', task.project_id] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['createdTasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.updateTaskStatus(id, status),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', task.project_id] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task status');
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['createdTasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });
};

export const useAssignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      tasksApi.assignTask(id, assigneeId),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      toast.success('Task assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign task');
    },
  });
};

export const useReorderTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tasks: { id: string; status: TaskStatus; order: number }[]) =>
      tasksApi.reorderTasks(tasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder tasks');
    },
  });
};