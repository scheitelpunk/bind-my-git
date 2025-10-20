import React, {useState} from 'react';
import {
    Plus,
    Search,
    Filter,
    Grid,
    List,
    Calendar,
    User,
    CheckSquare,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useTasks, useCreateTask, useTags} from '@/hooks/useTasks';
import {useMyProjects} from '@/hooks/useProjects';
import {useUsers} from '@/hooks/useUsers';
import {useAuth} from '@/hooks/useAuth';
import {useItemsByOrder} from '@/hooks/useItems';
import {useTranslation} from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Card, {CardContent} from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import {formatDate, isOverdue, isDueSoon} from '@/utils/dateUtils';
import {
    TaskStatus,
    TaskPriority,
    type TaskFilters,
    type CreateTaskData,
} from '@/types';

const Tasks: React.FC = () => {
    useAuth();
    const {t} = useTranslation();
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<TaskFilters>({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [, setDefaultStatus] = useState<TaskStatus>(TaskStatus.TODO);

    const {data: tasksData, isLoading} = useTasks(filters, page, viewMode === 'list' ? 20 : 100);
    const {data: projects = []} = useMyProjects();
    useTags();
    const {data: users = []} = useUsers();
    const createTaskMutation = useCreateTask();

    const [createForm, setCreateForm] = useState<CreateTaskData>({
        title: '',
        description: '',
        project_id: projects.length > 0 ? projects[0].id : '',
        assigned_to: '',
        item_id: '',
        priority: TaskPriority.MEDIUM,
        estimated_hours: 0,
        due_date: '',
        external: false,
        billable: true,
        tags: [],
    });

    // Get the selected project to find its order_id
    const selectedProject = projects.find(p => p.id === createForm.project_id);
    const {data: items = []} = useItemsByOrder(selectedProject?.order_id);

    const statusOptions = [
        {value: '', label: t('tasks.allStatuses')},
        {value: TaskStatus.BACKLOG, label: t('taskStatus.backlog')},
        {value: TaskStatus.TODO, label: t('taskStatus.todo')},
        {value: TaskStatus.IN_PROGRESS, label: t('taskStatus.inProgress')},
        {value: TaskStatus.IN_REVIEW, label: t('taskStatus.inReview')},
        {value: TaskStatus.DONE, label: t('taskStatus.done')},
    ];

    const priorityOptions = [
        {value: '', label: t('tasks.allPriorities')},
        {value: TaskPriority.LOW, label: t('priority.low')},
        {value: TaskPriority.MEDIUM, label: t('priority.medium')},
        {value: TaskPriority.HIGH, label: t('priority.high')},
        {value: TaskPriority.URGENT, label: t('priority.urgent')},
    ];

    const projectOptions = [
        {value: '', label: t('tasks.allProjects')},
        ...projects.map(project => ({
            value: project.id,
            label: project.name,
        })),
    ];

    const createTaskOptions = projects.map(project => ({
        value: project.id,
        label: project.name,
    }));

    // Update project_id when projects load and it's not set
    React.useEffect(() => {
        if (projects.length > 0 && !createForm.project_id) {
            setCreateForm(prev => ({...prev, project_id: projects[0].id}));
        }
    }, [projects, createForm.project_id]);

    const createPriorityOptions = [
        {value: TaskPriority.LOW, label: t('priority.low')},
        {value: TaskPriority.MEDIUM, label: t('priority.medium')},
        {value: TaskPriority.HIGH, label: t('priority.high')},
        {value: TaskPriority.URGENT, label: t('priority.urgent')},
    ];

    const assigneeOptions = [
        {value: '', label: t('projects.unassigned')},
        ...users.map(u => ({value: u.id, label: `${u.first_name} ${u.last_name}`}))
    ];

    const itemOptions = items.map(item => ({
        value: item.id,
        label: `${item.description || 'Item'} ${item.material_number ? `(${item.material_number})` : ''}`
    }));

    const handleSearch = () => {
        setFilters({...filters, search: searchTerm});
        setPage(0);
    };

    const handleFilterChange = (key: keyof TaskFilters, value: any) => {
        setFilters({
            ...filters,
            [key]: value || undefined,
        });
        setPage(0);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that project_id is set
        if (!createForm.project_id) {
            console.error('Project ID is required');
            return;
        }

        // Validate that item_id is set
        if (!createForm.item_id) {
            console.error('Item ID is required');
            return;
        }

        try {
            await createTaskMutation.mutateAsync({
                ...createForm,
                assigned_to: createForm.assigned_to || undefined,
                item_id: createForm.item_id,
                estimated_hours: createForm.estimated_hours || undefined,
                due_date: createForm.due_date || undefined,
            });
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                description: '',
                project_id: projects.length > 0 ? projects[0].id : '',
                assigned_to: '',
                item_id: '',
                priority: TaskPriority.MEDIUM,
                estimated_hours: 0,
                due_date: '',
                external: false,
                billable: true,
                tags: [],
            });
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleAddTask = (status: TaskStatus) => {
        setDefaultStatus(status);
        setShowCreateModal(true);
    };

    const getPriorityVariant = (priority: TaskPriority) => {
        switch (priority) {
            case TaskPriority.URGENT:
                return 'danger';
            case TaskPriority.HIGH:
                return 'warning';
            case TaskPriority.MEDIUM:
                return 'info';
            case TaskPriority.LOW:
                return 'success';
            default:
                return 'default';
        }
    };

    const getStatusVariant = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.DONE:
                return 'success';
            case TaskStatus.IN_PROGRESS:
                return 'info';
            case TaskStatus.IN_REVIEW:
                return 'warning';
            default:
                return 'default';
        }
    };

    if (isLoading) {
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
                    <p className="text-gray-600">{t('tasks.subtitle')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === 'kanban'
                                    ? 'bg-white shadow-sm text-primary-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Grid className="h-4 w-4"/>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-white shadow-sm text-primary-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <List className="h-4 w-4"/>
                        </button>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
                        <Plus className="h-4 w-4 mr-2"/>
                        {t('tasks.createTask')}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                            <Input
                                placeholder={t('tasks.searchTasks')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                        </div>
                        <Select
                            options={statusOptions}
                            value={filters.status?.[0] || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value as TaskStatus] : undefined)}
                            placeholder={t('tasks.filterByStatus')}
                        />
                        <Select
                            options={priorityOptions}
                            value={filters.priority?.[0] || ''}
                            onChange={(e) => handleFilterChange('priority', e.target.value ? [e.target.value as TaskPriority] : undefined)}
                            placeholder={t('tasks.filterByPriority')}
                        />
                        <Select
                            options={projectOptions}
                            value={filters.project_id || ''}
                            onChange={(e) => handleFilterChange('project_id', e.target.value)}
                            placeholder={t('tasks.filterByProject')}
                        />
                        <Button onClick={handleSearch} variant="secondary">
                            <Filter className="h-4 w-4 mr-2"/>
                            {t('common.filter')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tasks Content */}
            {tasksData && tasksData.data && tasksData.data.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tasks.noTasksFound')}</h3>
                        <p className="text-gray-600 mb-4">
                            {Object.keys(filters).some(key => filters[key as keyof TaskFilters])
                                ? t('tasks.tryAdjustingFilters')
                                : t('tasks.getStarted')}
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2"/>
                            {t('tasks.createTask')}
                        </Button>
                    </CardContent>
                </Card>
            ) : viewMode === 'kanban' ? (
                <KanbanBoard
                    tasks={tasksData?.data || []}
                    onAddTask={handleAddTask}
                />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-200">
                            {tasksData?.data.map((task) => (
                                <Link
                                    key={task.id}
                                    to={`/tasks/${task.id}`}
                                    className="block p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                    {task.title}
                                                </h3>
                                                <Badge variant={getPriorityVariant(task.priority)} size="sm">
                                                    {t(`priority.${task.priority.toLowerCase()}`)}
                                                </Badge>
                                                <Badge variant={getStatusVariant(task.status)} size="sm">
                                                    {t(`taskStatus.${task.status.toLowerCase()}`)}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                                {task.project && (
                                                    <span className="flex items-center">
                            <CheckSquare className="h-3 w-3 mr-1"/>
                                                        {task.project.name}
                          </span>
                                                )}
                                                {task.assignee && (
                                                    <span className="flex items-center">
                            <User className="h-3 w-3 mr-1"/>
                                                        {task.assignee.first_name} {task.assignee.last_name}
                          </span>
                                                )}
                                                {task.due_date && (
                                                    <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1"/>
                            <span
                                className={
                                    isOverdue(task.due_date)
                                        ? 'text-red-600'
                                        : isDueSoon(task.due_date)
                                            ? 'text-yellow-600'
                                            : ''
                                }
                            >
                              {formatDate(task.due_date)}
                            </span>
                          </span>
                                                )}
                                            </div>
                                        </div>
                                        {task.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 ml-4">
                                                {task.tags.slice(0, 2).map((tag) => (
                                                    <Badge key={tag} variant="default" size="sm">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {task.tags.length > 2 && (
                                                    <Badge variant="default" size="sm">
                                                        +{task.tags.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination for List View */}
            {viewMode === 'list' && tasksData && tasksData.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                        {t('common.showing', {
                            from: tasksData.page * tasksData.size + 1,
                            to: Math.min((tasksData.page + 1) * tasksData.size, tasksData.totalElements),
                            total: tasksData.totalElements
                        })}
                    </p>
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            disabled={!tasksData.hasPrevious}
                            onClick={() => setPage(page - 1)}
                        >
                            {t('common.previous')}
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={!tasksData.hasNext}
                            onClick={() => setPage(page + 1)}
                        >
                            {t('common.next')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={t('tasks.createNewTask')}
                size="lg"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <Input
                        label={t('tasks.taskTitle')}
                        value={createForm.title}
                        onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                        required
                    />

                    <div>
                        <label className="label">{t('tasks.description')}</label>
                        <textarea
                            value={createForm.description}
                            onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                            className="input"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label={t('tasks.project')}
                            options={createTaskOptions}
                            value={createForm.project_id}
                            onChange={(e) => setCreateForm({...createForm, project_id: e.target.value})}
                            required
                        />

                        <Select
                            label={t('tasks.priority')}
                            options={createPriorityOptions}
                            value={createForm.priority}
                            onChange={(e) => setCreateForm({...createForm, priority: e.target.value as TaskPriority})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label={t('tasks.assignee')}
                            options={assigneeOptions}
                            value={createForm.assigned_to || ''}
                            onChange={(e) => setCreateForm({...createForm, assigned_to: e.target.value || ''})}
                        />

                        <Select
                            label="Item"
                            options={itemOptions}
                            value={createForm.item_id || ''}
                            onChange={(e) => setCreateForm({...createForm, item_id: e.target.value || ''})}
                            disabled={!selectedProject?.order_id || items.length === 0}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={t('tasks.estimatedHours')}
                            type="number"
                            min="0"
                            step="0.5"
                            value={createForm.estimated_hours}
                            onChange={(e) => setCreateForm({
                                ...createForm,
                                estimated_hours: parseFloat(e.target.value) || 0
                            })}
                        />

                        <Input
                            label={t('tasks.dueDate')}
                            type="date"
                            value={createForm.due_date}
                            onChange={(e) => setCreateForm({...createForm, due_date: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="external"
                                checked={createForm.external}
                                onChange={(e) => setCreateForm({...createForm, external: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="external" className="ml-2 block text-sm text-gray-900">
                                External Task
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="billable"
                                checked={createForm.billable}
                                onChange={(e) => setCreateForm({...createForm, billable: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="billable" className="ml-2 block text-sm text-gray-900">
                                Billable
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowCreateModal(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            loading={createTaskMutation.isPending}
                            disabled={createTaskMutation.isPending}
                        >
                            {t('tasks.createTask')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tasks;