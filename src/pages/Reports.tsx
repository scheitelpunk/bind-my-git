import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/services/timeTracking';
import { useMyProjects } from '@/hooks/useProjects';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { exportTimeEntriesToCSV, exportProjectsToCSV } from '@/utils/exportUtils';
import {ProjectStatus, TaskStatus} from "@/types";
import { useTranslation } from 'react-i18next';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { data: projects = [] } = useMyProjects();

  const { data: timeSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['timeSummary', dateFrom, dateTo, selectedProjectId],
    queryFn: () => timeTrackingApi.getTimeSummary({
      start_time: dateFrom,
      end_time: dateTo,
      project_id: selectedProjectId || undefined,
    }),
  });

  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['timeEntries', dateFrom, dateTo, selectedProjectId],
    queryFn: () => timeTrackingApi.getMyTimeEntries(dateFrom, dateTo),
  });

  const projectOptions = [
    { value: '', label: t('reports.allProjects') },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
    })),
  ];

  // Prepare chart data
  const projectChartData = timeSummary?.project_breakdown.map((project, index) => ({
    name: project.projectName,
    hours: Math.round(project.hours * 100) / 100,
    color: COLORS[index % COLORS.length],
  })) || [];

  // Daily hours data for line chart
  const dailyHoursData = React.useMemo(() => {
    const dailyTotals = new Map<string, number>();

    timeEntries.forEach(entry => {
      if (entry.duration_minutes) {
        const date = entry.start_time.split('T')[0];
        const hours = entry.duration_minutes / 60;
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + hours);
      }
    });

    const result = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: formatDate(dateStr, 'MMM dd'),
        hours: Math.round((dailyTotals.get(dateStr) || 0) * 100) / 100,
      });
    }

    return result;
  }, [timeEntries, dateFrom, dateTo]);

  // Task completion data
  const taskStatusData = React.useMemo(() => {
    const statusCounts = new Map<string, number>();

    projects.forEach(project => {
      project.tasks?.forEach(task => {
        const status = task.status.replace('_', ' ');
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
    });

    return Array.from(statusCounts.entries()).map(([status, count], index) => ({
      name: status,
      value: count,
      color: COLORS[index % COLORS.length],
    }));
  }, [projects]);

  const handleExportTimeEntries = () => {
    if (timeEntries.length > 0) {
      const filename = `time-report-${dateFrom}-to-${dateTo}.csv`;
      exportTimeEntriesToCSV(timeEntries, filename);
    }
  };

  const handleExportProjects = () => {
    if (projects.length > 0) {
      const filename = `projects-report-${new Date().toISOString().split('T')[0]}.csv`;
      exportProjectsToCSV(projects, filename);
    }
  };

  if (summaryLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
          <p className="text-gray-600">{t('reports.subtitle')}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportTimeEntries} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('reports.exportTime')}
          </Button>
          <Button onClick={handleExportProjects} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('reports.exportProjects')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label={t('reports.fromDate')}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label={t('reports.toDate')}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              label={t('reports.project')}
              options={projectOptions}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="secondary" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                {t('reports.applyFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {timeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">{t('reports.totalHours')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(timeSummary.total_hours * 100) / 100}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">{t('reports.timeEntries')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {timeSummary.totalEntries}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">{t('reports.avgHoursPerDay')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(timeSummary.averageHoursPerDay * 100) / 100}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">{t('reports.activeProjects')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {projects.filter(p => p.status === ProjectStatus.ACTIVE).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.timeByProject')}</CardTitle>
          </CardHeader>
          <CardContent>
            {projectChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                {t('reports.noDataAvailable')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name={t('reports.hours')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.taskStatusDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                {t('reports.noTasksAvailable')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Hours Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('reports.dailyHoursTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyHoursData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                {t('reports.noDataAvailable')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name={t('reports.hours')}
                    dot={{ fill: '#3b82f6' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.projectSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('reports.noProjectsAvailable')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.project')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.members')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.tasks')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.hours')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.progress')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => {
                    const totalTasks = project.tasks?.length || 0;
                    const completedTasks = project.tasks?.filter(t => t.status === TaskStatus.DONE).length || 0;
                    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                    return (
                      <tr key={project.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {project.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {project.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            project.status === ProjectStatus.ACTIVE
                              ? 'bg-green-100 text-green-800'
                              : project.status === ProjectStatus.COMPLETED
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.members.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {completedTasks}/{totalTasks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.total_hours}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-900">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;