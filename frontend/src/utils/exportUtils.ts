import fileDownload from 'js-file-download';
import type { TimeEntry, Project, Task } from '@/types';

// Convert data to CSV format
export const convertToCSV = (data: Record<string, unknown>[]): string => {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or newline
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value || '');
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

// Export time entries to CSV
export const exportTimeEntriesToCSV = (entries: TimeEntry[], filename = 'time-entries.csv'): void => {
  const csvData = entries.map(entry => ({
    'Date': entry.start_time.split('T')[0],
    'Start Time': entry.start_time.split('T')[1]?.split('.')[0] || '',
    'End Time': entry.end_time ? entry.end_time.split('T')[1]?.split('.')[0] || '' : '',
    'Duration (minutes)': entry.duration_minutes || 0,
    'Task': entry.task?.title || '',
    'Project': entry.project?.name || '',
    'User': `${entry.user.first_name} ${entry.user.last_name}`,
    'Description': entry.description,
  }));

  const csv = convertToCSV(csvData);
  fileDownload(csv, filename);
};

// Export projects to CSV
export const exportProjectsToCSV = (projects: Project[], filename = 'projects.csv'): void => {
  const csvData = projects.map(project => ({
    'Name': project.name,
    'Description': project.description,
    'Status': project.status,
    'Owner': `${project.owner.first_name} ${project.owner.last_name}`,
    'Start Date': project.start_date.split('T')[0],
    'End Date': project.end_date ? project.end_date.split('T')[0] : '',
    'Total Hours': project.total_hours,
    'Total Tasks': project.tasks?.length || 0,
    'Created': project.created_at.split('T')[0],
  }));

  const csv = convertToCSV(csvData);
  fileDownload(csv, filename);
};

// Export tasks to CSV
export const exportTasksToCSV = (tasks: Task[], filename = 'tasks.csv'): void => {
  const csvData = tasks.map(task => ({
    'Title': task.title,
    'Description': task.description,
    'Status': task.status,
    'Priority': task.priority,
    'Project': task.project?.name || '',
    'Assignee': task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : '',
    'Creator': `${task.creator.first_name} ${task.creator.last_name}`,
    'Estimated Hours': task.estimated_hours || 0,
    'Actual Hours': task.actual_hours || 0,
    'Due Date': task.due_date ? task.due_date.split('T')[0] : '',
    'Completed': task.completed_at ? task.completed_at.split('T')[0] : '',
    'Tags': task.tags.join('; '),
    'Created': task.created_at.split('T')[0],
  }));

  const csv = convertToCSV(csvData);
  fileDownload(csv, filename);
};

// Generate time report data
export const generateTimeReportData = (entries: TimeEntry[]) => {
  const projectTotals = new Map<string, number>();
  const userTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();

  entries.forEach(entry => {
    const duration = entry.duration_minutes || 0;
    const date = entry.start_time.split('T')[0];
    const projectName = entry.project?.name || 'No Project';
    const userName = `${entry.user.first_name} ${entry.user.last_name}`;

    // Project totals
    projectTotals.set(projectName, (projectTotals.get(projectName) || 0) + duration);

    // User totals
    userTotals.set(userName, (userTotals.get(userName) || 0) + duration);

    // Daily totals
    dailyTotals.set(date, (dailyTotals.get(date) || 0) + duration);
  });

  return {
    projectTotals: Array.from(projectTotals.entries()).map(([name, minutes]) => ({
      name,
      hours: Math.round((minutes / 60) * 100) / 100,
      minutes,
    })),
    userTotals: Array.from(userTotals.entries()).map(([name, minutes]) => ({
      name,
      hours: Math.round((minutes / 60) * 100) / 100,
      minutes,
    })),
    dailyTotals: Array.from(dailyTotals.entries()).map(([date, minutes]) => ({
      date,
      hours: Math.round((minutes / 60) * 100) / 100,
      minutes,
    })),
    totalMinutes: entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
  };
};