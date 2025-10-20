import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from '@/services/timeTracking';
import { toast } from 'react-hot-toast';
import type { ActiveTimer, StartTimerData, StopTimerData } from '@/types';

export const useTimer = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const queryClient = useQueryClient();

  // Get active timer
  const { data: activeTimer, isLoading, error } = useQuery({
    queryKey: ['activeTimer'],
    queryFn: timeTrackingApi.getActiveTimer,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: (data: StartTimerData) => timeTrackingApi.startTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
      toast.success('Timer started successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start timer');
    },
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: (data?: StopTimerData) => timeTrackingApi.stopTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success('Timer stopped successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop timer');
    },
  });

  // Calculate elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTimer) {
      const startTime = new Date(activeTimer.start_time).getTime();

      const updateElapsedTime = () => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsedTime(); // Initial calculation
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTimer]);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Start timer function
  const startTimer = useCallback((data: StartTimerData) => {
    if (activeTimer) {
      toast.error('Timer is already running. Stop the current timer first.');
      return;
    }
    startTimerMutation.mutate(data);
  }, [activeTimer, startTimerMutation]);

  // Stop timer function
  const stopTimer = useCallback((data?: StopTimerData) => {
    if (!activeTimer) {
      toast.error('No timer is currently running.');
      return;
    }
    stopTimerMutation.mutate(data);
  }, [activeTimer, stopTimerMutation]);

  // Check if timer is running
  const isRunning = Boolean(activeTimer);

  // Get formatted elapsed time
  const formattedElapsedTime = formatTime(elapsedTime);

  return {
    activeTimer,
    isRunning,
    isLoading,
    error,
    elapsedTime,
    formattedElapsedTime,
    startTimer,
    stopTimer,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    formatTime,
  };
};