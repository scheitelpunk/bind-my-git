import React, { useState } from 'react';
import {
  Users,
  Settings,
  BarChart3,
  Database,
  Shield,
  Clock,
  FolderOpen,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyProjects } from '@/hooks/useProjects';
import { useMyTasks } from '@/hooks/useTasks';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatRelativeTime } from '@/utils/dateUtils';
import {ProjectStatus, TaskPriority, TaskStatus} from "@/types";

const Admin: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useMyTasks();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate system statistics
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === TaskStatus.DONE).length,
    totalUsers: projects.reduce((acc, project) => {
      const uniqueUsers = new Set([
        project.ownerId,
        ...project.members.map(m => m.id)
      ]);
      return Math.max(acc, uniqueUsers.size);
    }, 0),
    totalHours: projects.reduce((acc, project) => acc + project.total_hours, 0),
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'projects', name: 'Projects', icon: FolderOpen },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  if (!hasRole('admin')) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System administration and management</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FolderOpen className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Projects</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckSquare className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalHours}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          Created {formatRelativeTime(project.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          project.status === ProjectStatus.ACTIVE
                            ? 'success'
                            : project.status === ProjectStatus.COMPLETED
                            ? 'info'
                            : 'default'
                        }
                        size="sm"
                      >
                        {project.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500">
                          {task.project?.name || 'No Project'} • Created {formatRelativeTime(task.created_at)}
                        </p>
                      </div>
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">
                User management is handled by Keycloak. Please use the Keycloak admin console to manage users, roles, and permissions.
              </p>
              <div className="mt-4">
                <a
                  href={`${import.meta.env.VITE_KEYCLOAK_URL}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Open Keycloak Admin
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'projects' && (
        <Card>
          <CardHeader>
            <CardTitle>Project Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {formatRelativeTime(project.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            project.status === ProjectStatus.ACTIVE
                              ? 'success'
                              : project.status === ProjectStatus.COMPLETED
                              ? 'info'
                              : 'default'
                          }
                          size="sm"
                        >
                          {project.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.owner.first_name} {project.owner.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.members.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.tasks?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.total_hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.slice(0, 20).map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {formatRelativeTime(task.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.project?.name || 'No Project'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            task.priority === TaskPriority.URGENT
                              ? 'danger'
                              : task.priority === TaskPriority.HIGH
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.assignee
                          ? `${task.assignee.first_name} ${task.assignee.last_name}`
                          : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.actual_hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Configuration</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Environment</dt>
                      <dd className="text-sm text-gray-900">{import.meta.env.MODE}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">API URL</dt>
                      <dd className="text-sm text-gray-900">
                        {import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Keycloak URL</dt>
                      <dd className="text-sm text-gray-900">
                        {import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Keycloak Realm</dt>
                      <dd className="text-sm text-gray-900">
                        {import.meta.env.VITE_KEYCLOAK_REALM || 'project-management'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Database className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">Database</p>
                        <p className="text-sm text-green-600">Connected</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Shield className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">Authentication</p>
                        <p className="text-sm text-green-600">Active</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Settings className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">API</p>
                        <p className="text-sm text-green-600">Operational</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Admin;