import { api } from './api';
import type { Notification, NotificationType } from '@/types';

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_task_id?: string;
  related_project_id?: string;
  related_comment_id?: string;
  actor_id?: string;
}

export interface NotificationFilters {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export const notificationsApi = {
  // Get notifications for the current user
  getNotifications: (filters?: NotificationFilters): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.unread_only !== undefined) {
      params.append('unread_only', String(filters.unread_only));
    }
    if (filters?.limit !== undefined) {
      params.append('limit', String(filters.limit));
    }
    if (filters?.offset !== undefined) {
      params.append('offset', String(filters.offset));
    }

    const queryString = params.toString();
    return api.get<Notification[]>(`/notifications${queryString ? `?${queryString}` : ''}`);
  },

  // Get unread notification count
  getUnreadCount: (): Promise<{ count: number }> => {
    return api.get<{ count: number }>('/notifications/unread-count');
  },

  // Create a new notification (admin only)
  createNotification: (data: CreateNotificationData): Promise<Notification> => {
    return api.post<Notification>('/notifications', data);
  },

  // Mark a notification as read
  markAsRead: (notificationId: string): Promise<Notification> => {
    return api.patch<Notification>(`/notifications/${notificationId}/read`, {});
  },

  // Mark all notifications as read
  markAllAsRead: (): Promise<{ count: number }> => {
    return api.post<{ count: number }>('/notifications/mark-all-read', {});
  },

  // Delete a notification
  deleteNotification: (notificationId: string): Promise<void> => {
    return api.delete(`/notifications/${notificationId}`);
  },
};
