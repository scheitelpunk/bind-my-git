import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, NotificationFilters } from '@/services/notifications';
import type { Notification } from '@/types';
import { toast } from 'react-hot-toast';

export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery<Notification[], Error>({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.getNotifications(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useUnreadCount = () => {
  return useQuery<{ count: number }, Error>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'], refetchType: 'active' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to mark notification as read');
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'], refetchType: 'active' });
      toast.success(`Marked ${data.count} notifications as read`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to mark all notifications as read');
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'], refetchType: 'active' });
      toast.success('Notification deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete notification');
    },
  });
};
