import React, {useState, useMemo} from 'react';
import {useParams, Link, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
    ArrowLeft,
    Edit,
    Users,
    Calendar,
    Clock,
    CheckSquare,
    Plus,

} from 'lucide-react';
import {
    useProject,
    useUpdateProject,
    useDeleteProject,
    useAddProjectMember,
    useRemoveProjectMember
} from '@/hooks/useProjects';
import {useUsers} from '@/hooks/useUsers';
import {useTasksByProject} from '@/hooks/useTasks';
import {useAuth} from '@/hooks/useAuth';
import {useProjectPermissions} from '@/hooks/useProjectPermissions';
import {useCustomer, useCustomers} from '@/hooks/useCustomers';
import {useOrder} from '@/hooks/useOrders';
import Button from '@/components/ui/Button';
import Card, {CardHeader, CardTitle, CardContent} from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {formatDate, calculateDurationInHours} from '@/utils/dateUtils';
import {ProjectStatus, ProjectRole, type UpdateProjectData} from '@/types';

const ProjectDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    useAuth();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const {data: project, isLoading: projectLoading} = useProject(id!);
    const {data: tasks = [], isLoading: tasksLoading} = useTasksByProject(id!);

    // Note: Hook is called with potentially undefined project (required by React hooks rules)
    // The hook safely returns false permissions until project loads
    const permissions = useProjectPermissions(project);
    // Only use permissions after project has loaded
    const canEdit = !projectLoading && project ? permissions.canEdit : false;
    const canManageMembers = !projectLoading && project ? permissions.canManageMembers : false;

    const {data: customer} = useCustomer(project?.customer_id);
    const {data: customers = [], isLoading: customersLoading} = useCustomers();
    const {data: order} = useOrder(project?.order_id);
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();
    const addMemberMutation = useAddProjectMember();
    const removeMemberMutation = useRemoveProjectMember();
    const {data: allUsers = [], isLoading: usersLoading} = useUsers();

    const [editForm, setEditForm] = useState<UpdateProjectData>({});
    const [newMemberId, setNewMemberId] = useState<string>('');
    const [newMemberRole, setNewMemberRole] = useState<ProjectRole>(ProjectRole.MEMBER);

    // Calculate total hours from all time entries across all tasks
    const totalHours = useMemo(() => {
        if (!tasks || tasks.length === 0) return 0;

        const totalMinutes = tasks.reduce((projectTotal, task) => {
            if (!task.time_entries || task.time_entries.length === 0) return projectTotal;

            const taskMinutes = task.time_entries.reduce((taskTotal, entry) => {
                const duration = calculateDurationInHours(entry.start_time, entry.end_time);
                return taskTotal + duration;
            }, 0);

            return projectTotal + taskMinutes;
        }, 0);

        return Math.round(totalMinutes * 100) / 100; // Round to 2 decimal places
    }, [tasks]);

    React.useEffect(() => {
        if (project) {
            setEditForm({
                name: project.name,
                description: project.description,
                status: project.status,
                startDate: project.start_date.split('T')[0],
                endDate: project.end_date ? project.end_date.split('T')[0] : '',
                customer_id: project.customer_id || '',
            });
        }
    }, [project]);

    const statusOptions = [
        {value: ProjectStatus.PLANNING, label: t('projectStatus.planning')},
        {value: ProjectStatus.ACTIVE, label: t('projectStatus.active')},
        {value: ProjectStatus.ON_HOLD, label: t('projectStatus.onHold')},
        {value: ProjectStatus.COMPLETED, label: t('projectStatus.completed')},
        {value: ProjectStatus.CANCELLED, label: t('projectStatus.cancelled')},
    ];

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        try {
            await updateProjectMutation.mutateAsync({
                id: project.id,
                data: editForm,
            });
            setShowEditModal(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const getStatusVariant = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.ACTIVE:
                return 'success';
            case ProjectStatus.PLANNING:
                return 'info';
            case ProjectStatus.ON_HOLD:
                return 'warning';
            case ProjectStatus.COMPLETED:
                return 'success';
            case ProjectStatus.CANCELLED:
                return 'danger';
            default:
                return 'default';
        }
    };

    if (projectLoading || tasksLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg"/>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.projectNotFound')}</h3>
                <Link to="/projects" className="text-primary-600 hover:text-primary-700">
                    {t('projects.backToProjects')}
                </Link>
            </div>
        );
    }

    // Prepare user options for adding a member (exclude current members and owner)
    const memberIds = new Set(project.members.map(m => m.id));
    if (project.ownerId) memberIds.add(project.ownerId);
    const availableUsers = (allUsers || []).filter(u => !memberIds.has(u.id));
    const userOptions = availableUsers.map(u => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name} (${u.email})`,
    }));

    const tasksByStatus = {
        TODO: tasks.filter(t => t.status === 'todo'),
        IN_PROGRESS: tasks.filter(t => t.status === 'in_progress'),
        IN_REVIEW: tasks.filter(t => t.status === 'review'),
        DONE: tasks.filter(t => t.status === 'done'),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        to="/projects"
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1"/>
                        {t('projects.backToProjects')}
                    </Link>
                </div>
                {canEdit && (
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => setShowEditModal(true)} variant="secondary">
                            <Edit className="h-4 w-4 mr-2"/>
                            {t('projects.editProject')}
                        </Button>
                        <Button
                            onClick={() => setShowDeleteModal(true)}
                            variant="danger"
                        >
                            {t('projects.deleteProject')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Project Info */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
                            <p className="text-gray-600 mb-4">{project.description}</p>
                            <Badge variant={getStatusVariant(project.status)}>
                                {project.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {customer && (
                            <div className="flex items-center">
                                <Users className="h-5 w-5 text-gray-400 mr-2"/>
                                <div>
                                    <p className="text-sm text-gray-500">{t('projects.customer')}</p>
                                    <p className="font-medium">
                                        {customer.customer_name}
                                        {order?.order_id && (
                                            <span className="text-sm text-gray-500 ml-2">({order.order_id})</span>
                                        )}
                                    </p>
                                    {order?.description && (
                                        <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-2"/>
                            <div>
                                <p className="text-sm text-gray-500">{t('projects.startDate')}</p>
                                <p className="font-medium">{formatDate(project.start_date)}</p>
                            </div>
                        </div>

                        {project.end_date && (
                            <div className="flex items-center">
                                <Calendar className="h-5 w-5 text-gray-400 mr-2"/>
                                <div>
                                    <p className="text-sm text-gray-500">{t('projects.endDate')}</p>
                                    <p className="font-medium">{formatDate(project.end_date)}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center">
                            <Clock className="h-5 w-5 text-gray-400 mr-2"/>
                            <div>
                                <p className="text-sm text-gray-500">{t('projects.totalHours')}</p>
                                <p className="font-medium">{totalHours}h</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project Members */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Users className="h-5 w-5 mr-2"/>
                            {t('projects.teamMembers')} ({project.members.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {project.members.map((member) => (
                                <div key={member.user.id} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div
                                            className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {member.user.first_name[0] || '?'}{member.user.last_name[0] || '?'}
                      </span>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">
                                                {member.user.first_name} {member.user.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">{member.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge size="sm" variant="default">
                                            {member?.role ?? t('projects.member')}
                                        </Badge>
                                        {canManageMembers && member.user.id !== project.ownerId && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                loading={removeMemberMutation.isPending}
                                                onClick={async () => {
                                                    try {
                                                        await removeMemberMutation.mutateAsync({
                                                            projectId: project.id,
                                                            userId: member.user.id
                                                        });
                                                    } catch (e) {
                                                        // toast handled in hook
                                                    }
                                                }}
                                            >
                                                {t('projects.remove')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {canManageMembers && (
                            <div className="mt-4 border-t pt-4 space-y-3">
                                <h4 className="text-sm font-medium text-gray-900">{t('projects.addTeamMember')}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                                    <div className="sm:col-span-3">
                                        <Select
                                            label={t('projects.user')}
                                            value={newMemberId}
                                            onChange={(e) => setNewMemberId(e.target.value)}
                                            options={userOptions}
                                            placeholder={usersLoading ? t('common.loadingUsers') : t('common.selectUser')}
                                            disabled={usersLoading || userOptions.length === 0}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Select
                                            label={t('projects.role')}
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                                            options={[
                                                {value: ProjectRole.MANAGER, label: t('projects.manager')},
                                                {value: ProjectRole.MEMBER, label: t('projects.member')},
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={async () => {
                                            if (!newMemberId.trim()) return;
                                            try {
                                                await addMemberMutation.mutateAsync({
                                                    projectId: project.id,
                                                    userId: newMemberId.trim(),
                                                    role: newMemberRole
                                                });
                                                setNewMemberId('');
                                                setNewMemberRole(ProjectRole.MEMBER);
                                            } catch (e) {
                                                // toast handled in hook
                                            }
                                        }}
                                        disabled={usersLoading || !newMemberId.trim()}
                                        loading={addMemberMutation.isPending}
                                    >
                                        <Plus className="h-4 w-4 mr-2"/> {t('projects.addMember')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Task Overview */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center">
                                    <CheckSquare className="h-5 w-5 mr-2"/>
                                    {t('projects.tasksOverview')} ({tasks.length})
                                </CardTitle>
                                <Link to={`/tasks?projectId=${project.id}`}>
                                    <Button variant="secondary" size="sm">
                                        <Plus className="h-4 w-4 mr-2"/>
                                        {t('projects.addTask')}
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-900">{tasksByStatus.TODO.length}</p>
                                    <p className="text-sm text-gray-500">{t('projects.toDo')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{tasksByStatus.IN_PROGRESS.length}</p>
                                    <p className="text-sm text-gray-500">{t('projects.inProgress')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-yellow-600">{tasksByStatus.IN_REVIEW.length}</p>
                                    <p className="text-sm text-gray-500">{t('projects.inReview')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{tasksByStatus.DONE.length}</p>
                                    <p className="text-sm text-gray-500">{t('projects.done')}</p>
                                </div>
                            </div>

                            {tasks.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                    <p className="text-gray-500">{t('projects.noTasksFound')}</p>
                                    <Link to={`/tasks?projectId=${project.id}`} className="mt-2 inline-block">
                                        <Button size="sm">{t('projects.createFirstTask')}</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
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
                                                        {task.assignee
                                                            ? `${t('projects.assignedTo')} ${task.assignee.first_name} ${task.assignee.last_name}`
                                                            : t('projects.unassigned')}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        task.status === 'done'
                                                            ? 'success'
                                                            : task.status === 'in_progress'
                                                                ? 'info'
                                                                : 'default'
                                                    }
                                                    size="sm"
                                                >
                                                    {task.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </Link>
                                    ))}
                                    {tasks.length > 5 && (
                                        <Link
                                            to={`/tasks?projectId=${project.id}`}
                                            className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                                        >
                                            {t('projects.viewAll', {count: tasks.length})}
                                        </Link>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Project Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={t('projects.editProject')}
                size="lg"
            >
                <form onSubmit={handleUpdateProject} className="space-y-4">
                    <Input
                        label={t('projects.projectName')}
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        required
                    />

                    <div>
                        <label className="label">{t('projects.description')}</label>
                        <textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                            className="input"
                            rows={3}
                            required
                        />
                    </div>

                    <Select
                        label={t('projects.status')}
                        value={editForm.status || ''}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value as ProjectStatus})}
                        options={statusOptions}
                        required
                    />

                    <Select
                        label={t('projects.customer')}
                        value={editForm.customer_id || ''}
                        onChange={(e) => setEditForm({...editForm, customer_id: e.target.value})}
                        options={[
                            {value: '', label: t('projects.selectCustomer')},
                            ...customers.map(c => ({value: c.id, label: c.customer_name}))
                        ]}
                        disabled={customersLoading}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={t('projects.startDate')}
                            type="date"
                            value={editForm.startDate || ''}
                            onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                            required
                        />

                        <Input
                            label={t('projects.endDate')}
                            type="date"
                            value={editForm.endDate || ''}
                            onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowEditModal(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            loading={updateProjectMutation.isPending}
                            disabled={updateProjectMutation.isPending || !editForm.startDate || editForm.startDate.trim() === ''}
                        >
                            {t('projects.updateProject')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Project Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={t('projects.deleteProject')}
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {t('projects.deleteConfirm')}
                        <span className="font-semibold"> {project.name}</span>? {t('projects.deleteWarning')}
                    </p>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            loading={deleteProjectMutation.isPending}
                            onClick={async () => {
                                try {
                                    await deleteProjectMutation.mutateAsync(project.id);
                                    setShowDeleteModal(false);
                                    navigate('/projects');
                                } catch (e) {
                                    // toast handled in hook
                                }
                            }}
                        >
                            {t('projects.deleteProject')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectDetail;