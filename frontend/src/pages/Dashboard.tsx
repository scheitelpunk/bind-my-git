import React from 'react';
import {FolderOpen, CheckSquare, Clock, AlertCircle} from 'lucide-react';
import {useMyProjects} from '@/hooks/useProjects';
import {useMyTasks} from '@/hooks/useTasks';
import {useAuth} from '@/hooks/useAuth';
import Card, {CardHeader, CardTitle, CardContent} from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Badge from '@/components/ui/Badge';
import {isOverdue, isDueSoon} from '@/utils/dateUtils';
import {Link} from 'react-router-dom';
import {ProjectStatus, TaskStatus} from "@/types";
import {useTranslation} from 'react-i18next';

const Dashboard: React.FC = () => {
    const {user} = useAuth();
    const {t} = useTranslation();
    const {data: projects = [], isLoading: projectsLoading} = useMyProjects();
    const {data: tasks = [], isLoading: tasksLoading} = useMyTasks();

    const activeTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
    tasks.filter(task => task.status === TaskStatus.TODO);
    const overdueTasks = tasks.filter(task => task.due_date && isOverdue(task.due_date));
    const dueSoonTasks = tasks.filter(task => task.due_date && isDueSoon(task.due_date));

    const stats = [
        {
            name: t('dashboard.activeProjects'),
            value: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
            icon: FolderOpen,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            name: t('dashboard.activeTasks'),
            value: activeTasks.length,
            icon: CheckSquare,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            name: t('dashboard.overdueTasks'),
            value: overdueTasks.length,
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
        },
        {
            name: t('dashboard.dueSoon'),
            value: dueSoonTasks.length,
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
        },
    ];

    if (projectsLoading || tasksLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg"/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
                <h1 className="text-2xl font-bold">
                    {user?.first_name ? t('dashboard.welcome', {name: user.first_name}) : t('dashboard.welcomeGuest')}
                </h1>
                <p className="mt-2 text-primary-100">
                    {t('dashboard.subtitle')}
                </p>
                {user?.roles && user.roles.length > 0 && (
                    <div className="mt-4 flex items-center flex-wrap gap-2">
                        <span className="text-primary-100 mr-2">{t('dashboard.yourRoles')}</span>
                        {user.roles.map((role) => (
                            <Badge key={role.id || role.name} variant="info" size="sm">
                                {role.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.name} className="p-6">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`}/>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.recentTasks')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">{t('dashboard.noTasks')}</p>
                        ) : (
                            <div className="space-y-3">
                                {tasks.slice(0, 5).map((task) => (
                                    <Link
                                        key={task.id}
                                        to={`/tasks/${task.id}`}
                                        className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {task.title}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {task.project?.name || t('dashboard.noProject')}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <Badge
                                                    variant={
                                                        task.status === TaskStatus.DONE
                                                            ? 'success'
                                                            : task.status === TaskStatus.IN_PROGRESS
                                                                ? 'info'
                                                                : 'default'
                                                    }
                                                    size="sm"
                                                >
                                                    {task.status.replace('_', ' ')}
                                                </Badge>
                                                {task.due_date && isOverdue(task.due_date) && (
                                                    <Badge variant="danger" size="sm">
                                                        {t('dashboard.overdue')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {tasks.length > 5 && (
                                    <Link
                                        to="/tasks"
                                        className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                                    >
                                        {t('dashboard.viewAllTasks')}
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Projects */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.activeProjects')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {projects.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">{t('dashboard.noProjects')}</p>
                        ) : (
                            <div className="space-y-3">
                                {projects
                                    .filter(p => p.status === ProjectStatus.ACTIVE)
                                    .slice(0, 5)
                                    .map((project) => (
                                        <Link
                                            key={project.id}
                                            to={`/projects/${project.id}`}
                                            className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {project.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {project.members.length} {t('dashboard.members')} • {project.total_hours}{t('dashboard.hoursLogged')}
                                                    </p>
                                                </div>
                                                <Badge variant="success" size="sm">
                                                    {project.status}
                                                </Badge>
                                            </div>
                                        </Link>
                                    ))}
                                {projects.filter(p => p.status === ProjectStatus.ACTIVE).length > 5 && (
                                    <Link
                                        to="/projects"
                                        className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                                    >
                                        {t('dashboard.viewAllProjects')}
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Link
                            to="/projects"
                            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FolderOpen className="h-8 w-8 text-primary-600"/>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{t('dashboard.viewProjects')}</p>
                                <p className="text-sm text-gray-500">{t('dashboard.manageProjects')}</p>
                            </div>
                        </Link>
                        <Link
                            to="/tasks"
                            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <CheckSquare className="h-8 w-8 text-green-600"/>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{t('dashboard.viewTasks')}</p>
                                <p className="text-sm text-gray-500">{t('dashboard.checkTasks')}</p>
                            </div>
                        </Link>
                        <Link
                            to="/time-tracking"
                            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Clock className="h-8 w-8 text-blue-600"/>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{t('nav.timeTracking')}</p>
                                <p className="text-sm text-gray-500">{t('dashboard.trackTime')}</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;