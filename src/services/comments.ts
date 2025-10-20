import { api } from './api';
import type { Comment } from '@/types';

export interface CreateCommentData {
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

export const commentsApi = {
  // Get comments for a task
  getTaskComments: (taskId: string): Promise<Comment[]> => {
    return api.get<Comment[]>(`/comments/${taskId}`);
  },

  // Create a new comment
  createComment: (taskId: string, data: CreateCommentData): Promise<Comment> => {
    return api.post<Comment>(`/comments/${taskId}`, data);
  },

  // Update a comment
  updateComment: (commentId: string, data: UpdateCommentData): Promise<Comment> => {
    return api.put<Comment>(`/comments/${commentId}`, data);
  },

  // Delete a comment
  deleteComment: (commentId: string): Promise<void> => {
    return api.delete(`/comments/${commentId}`);
  },
};
