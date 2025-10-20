import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, CreateCommentData, UpdateCommentData } from '@/services/comments';
import type { Comment } from '@/types';
import { toast } from 'react-hot-toast';

export const useTaskComments = (taskId: string | undefined) => {
  return useQuery<Comment[], Error>({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.getTaskComments(taskId!),
    enabled: !!taskId,
  });
};

export const useCreateComment = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentData) => commentsApi.createComment(taskId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments', taskId], refetchType: 'active' });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add comment');
    },
  });
};

export const useUpdateComment = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentData }) =>
      commentsApi.updateComment(commentId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments', taskId], refetchType: 'active' });
      toast.success('Comment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update comment');
    },
  });
};

export const useDeleteComment = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsApi.deleteComment(commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments', taskId], refetchType: 'active' });
      toast.success('Comment deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete comment');
    },
  });
};
