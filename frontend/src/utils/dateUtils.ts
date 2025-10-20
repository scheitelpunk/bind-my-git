import { format, parseISO, isValid, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

export const formatDate = (date: string | Date, formatString = 'MMM dd, yyyy'): string => {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObject) ? format(dateObject, formatString) : '';
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTime = (date: string | Date): string => {
  return formatDate(date, 'HH:mm');
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();

  if (!isValid(dateObject)) return '';

  const daysDiff = differenceInDays(now, dateObject);
  const hoursDiff = differenceInHours(now, dateObject);
  const minutesDiff = differenceInMinutes(now, dateObject);

  if (daysDiff > 7) {
    return formatDate(dateObject);
  } else if (daysDiff > 0) {
    return `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
  } else if (hoursDiff > 0) {
    return `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
  } else if (minutesDiff > 0) {
    return `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const parseDateForInput = (date: string | Date): string => {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObject) ? format(dateObject, 'yyyy-MM-dd') : '';
};

export const parseDateTimeForInput = (date: string | Date): string => {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObject) ? format(dateObject, "yyyy-MM-dd'T'HH:mm") : '';
};

export const isOverdue = (dueDate: string | Date | undefined): boolean => {
  if (!dueDate) return false;
  const dateObject = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isValid(dateObject) && differenceInDays(new Date(), dateObject) > 0;
};

export const isDueSoon = (dueDate: string | Date | undefined, days = 3): boolean => {
  if (!dueDate) return false;
  const dateObject = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  if (!isValid(dateObject)) return false;

  const daysDiff = differenceInDays(dateObject, new Date());
  return daysDiff >= 0 && daysDiff <= days;
};

export const calculateDurationInMinutes = (startTime: string, endTime?: string): number => {
  if (!endTime) return 0;

  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;

  if (!isValid(start) || !isValid(end)) return 0;

  return differenceInMinutes(end, start);
};

export const calculateDurationInHours = (startTime: string, endTime?: string): number => {
  const minutes = calculateDurationInMinutes(startTime, endTime);
  return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
};