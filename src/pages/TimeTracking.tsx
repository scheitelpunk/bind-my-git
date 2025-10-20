import React, {useState} from 'react';
import {Calendar, Clock, Download, Filter, Play, User} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {timeTrackingApi} from '@/services/timeTracking';
import {useTimer} from '@/hooks/useTimer';
import {useMyProjects} from '@/hooks/useProjects';
import {useTranslation} from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card, {CardHeader, CardTitle, CardContent} from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {formatDate, formatDuration} from '@/utils/dateUtils';
import {exportTimeEntriesToCSV, generateTimeReportData} from '@/utils/exportUtils';
import type {TimeEntryFilters} from '@/types';

const TimeTracking: React.FC = () => {
    const {t} = useTranslation();
    const [filters, setFilters] = useState<TimeEntryFilters>({
        start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end_time: new Date().toISOString().split('T')[0], // today
    });

    const {activeTimer, isRunning, formattedElapsedTime} = useTimer();
    const {data: projects = []} = useMyProjects();

    const {data: timeEntries = [], isLoading} = useQuery({
        queryKey: ['myTimeEntries', filters],
        queryFn: () => timeTrackingApi.getMyTimeEntries(filters.start_time, filters.end_time, filters.project_id),
    });

    const {data: timeSummary, isLoading: summaryLoading} = useQuery({
        queryKey: ['timeSummary', filters],
        queryFn: () => timeTrackingApi.getTimeSummary({
            start_time: filters.start_time,
            end_time: filters.end_time,
            project_id: filters.project_id,
        }),
    });

    const projectOptions = [
        {value: '', label: t('tasks.allProjects')},
        ...projects.map(project => ({
            value: project.id,
            label: project.name,
        })),
    ];

    const handleFilterChange = (key: keyof TimeEntryFilters, value: string) => {
        setFilters({
            ...filters,
            [key]: value || undefined,
        });
    };

    const handleExport = () => {
        if (timeEntries.length > 0) {
            const filename = `time-entries-${filters.start_time}-to-${filters.end_time}.csv`;
            exportTimeEntriesToCSV(timeEntries, filename);
        }
    };

    const reportData = generateTimeReportData(timeEntries);

    if (isLoading || summaryLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg"/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('timeTracking.title')}</h1>
                    <p className="text-gray-600">{t('timeTracking.subtitle')}</p>
                </div>
                <Button onClick={handleExport} variant="secondary" disabled={timeEntries.length === 0}>
                    <Download className="h-4 w-4 mr-2"/>
                    {t('timeTracking.exportCSV')}
                </Button>
            </div>

            {/* Active Timer */}
            {isRunning && activeTimer && (
                <Card className="border-primary-200 bg-primary-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"/>
                                    <span
                                        className="font-medium text-primary-900">{t('timeTracking.timerRunning')}</span>
                                </div>
                                <div className="text-2xl font-mono font-bold text-primary-900">
                                    {formattedElapsedTime}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-primary-900">{activeTimer.task.title}</p>
                                <p className="text-sm text-primary-700">{activeTimer.description}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            {timeSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <Clock className="h-8 w-8 text-blue-600"/>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">{t('timeTracking.totalHours')}</p>
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
                                <Calendar className="h-8 w-8 text-green-600"/>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">{t('timeTracking.entries')}</p>
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
                                <User className="h-8 w-8 text-purple-600"/>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">{t('timeTracking.avgPerDay')}</p>
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
                                <Filter className="h-8 w-8 text-orange-600"/>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">{t('timeTracking.projects')}</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {timeSummary.project_breakdown?.length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            label={t('timeTracking.fromDate')}
                            type="date"
                            value={filters.start_time || ''}
                            onChange={(e) => handleFilterChange('start_time', e.target.value)}
                        />
                        <Input
                            label={t('timeTracking.toDate')}
                            type="date"
                            value={filters.end_time || ''}
                            onChange={(e) => handleFilterChange('end_time', e.target.value)}
                        />
                        <Select
                            label={t('timeTracking.project')}
                            options={projectOptions}
                            value={filters.project_id || ''}
                            onChange={(e) => handleFilterChange('project_id', e.target.value)}
                        />
                        <div className="flex items-end">
                            <Button variant="secondary" className="w-full">
                                <Filter className="h-4 w-4 mr-2"/>
                                {t('timeTracking.applyFilters')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Time Entries */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('timeTracking.timeEntries')} ({timeEntries.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeEntries.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                    <p className="text-gray-500">{t('timeTracking.noEntriesFound')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {timeEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                                        {entry.task?.title || t('timeTracking.unknownTask')}
                                                    </h4>
                                                    {entry.project && (
                                                        <span
                                                            className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {entry.project.name}
                            </span>
                                                    )}
                                                    {entry.external && (
                                                        <span
                                                            className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                              External
                            </span>
                                                    )}
                                                    {!entry.billable && (
                                                        <span
                                                            className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                              Non-billable
                            </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 truncate mt-1">
                                                    {entry.description}
                                                </p>
                                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                    <span>{formatDate(entry.start_time)}</span>
                                                    {entry.end_time && (
                                                        <span>
                              {formatDate(entry.start_time, 'HH:mm')} - {formatDate(entry.end_time, 'HH:mm')}
                            </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {entry.duration_minutes ? formatDuration(entry.duration_minutes) : (
                                                        <span className="flex items-center text-green-600">
                              <Play className="h-3 w-3 mr-1"/>
                                                            {t('timeTracking.running')}
                            </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Project Breakdown */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('timeTracking.projectBreakdown')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {reportData.projectTotals.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">{t('timeTracking.noDataAvailable')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {reportData.projectTotals.map((project) => (
                                        <div key={project.name} className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {project.name}
                                                </p>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-primary-600 h-2 rounded-full"
                                                        style={{
                                                            width: `${(project.minutes / reportData.totalMinutes) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {project.hours}h
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {Math.round((project.minutes / reportData.totalMinutes) * 100)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Daily Breakdown */}
                    {reportData.dailyTotals.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>{t('timeTracking.dailyHours')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {reportData.dailyTotals.slice(-7).map((day) => (
                                        <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {formatDate(day.date, 'MMM dd')}
                      </span>
                                            <span className="text-sm font-medium text-gray-900">
                        {day.hours}h
                      </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeTracking;