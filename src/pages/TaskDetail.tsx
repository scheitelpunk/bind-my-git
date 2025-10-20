import React, {useState} from 'react';
import {useParams, Link} from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    Calendar,
    Clock,
    Tag,
    Flag,
    Play,
    Square,
    Trash,
    Plus,
    MessageSquare,
} from 'lucide-react';
import {useTask, useUpdateTask, useDeleteTask, useAssignTask} from '@/hooks/useTasks';
import {useTimer} from '@/hooks/useTimer';
import {useAuth} from '@/hooks/useAuth';
import {useTaskPermissions} from '@/hooks/useProjectPermissions';
import {useTaskComments, useCreateComment, useUpdateComment, useDeleteComment} from '@/hooks/useComments';
import {useItemsByOrder} from '@/hooks/useItems';
import {useTranslation} from 'react-i18next';
import Button from '@/components/ui/Button';
import Card, {CardHeader, CardTitle, CardContent} from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {useUsers} from '@/hooks/useUsers';
import {formatDate, formatRelativeTime} from '@/utils/dateUtils';
import {TaskStatus, TaskPriority, type UpdateTaskData} from '@/types';
import {timeTrackingApi} from '@/services/timeTracking';
import {useQueryClient} from '@tanstack/react-query';
import {toast} from 'react-hot-toast';

const TaskDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const {user} = useAuth();
    const {t} = useTranslation();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');

    const {data: task, isLoading: taskLoading} = useTask(id!);

    // Note: Hook is called with potentially undefined task (required by React hooks rules)
    // The hook safely returns false permissions until task loads
    const permissions = useTaskPermissions(task);
    // Only use permissions after task has loaded
    const canEdit = !taskLoading && task ? permissions.canEdit : false;
    const canDelete = !taskLoading && task ? permissions.canDelete : false;
    const canStartTimer = !taskLoading && task ? permissions.canStartTimer : false;
    const canEditTimeEntries = !taskLoading && task ? permissions.canEditTimeEntries : false;

    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();
    const assignTaskMutation = useAssignTask();
    const {data: usersData} = useUsers();
    const {data: items = [], isLoading: itemsLoading} = useItemsByOrder(task?.project?.order_id);
    const {startTimer, stopTimer, activeTimer, isRunning} = useTimer();
    const {data: comments, isLoading: commentsLoading} = useTaskComments(id);
    const createCommentMutation = useCreateComment(id!);
    const updateCommentMutation = useUpdateComment(id!);
    const deleteCommentMutation = useDeleteComment(id!);

    const [editForm, setEditForm] = useState<UpdateTaskData>({});
    const [commentText, setCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    React.useEffect(() => {
        if (task) {
            setEditForm({
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                estimated_hours: task.estimated_hours,
                due_date: task.due_date ? task.due_date.split('T')[0] : '',
                external: task.external,
                billable: task.billable,
                tags: task.tags,
                item_id: task.item_id || '',
            });
            setSelectedAssigneeId(task.assigned_to || '');
        }
    }, [task]);

    const statusOptions = [
        {value: TaskStatus.BACKLOG, label: t('taskStatus.backlog')},
        {value: TaskStatus.TODO, label: t('taskStatus.todo')},
        {value: TaskStatus.IN_PROGRESS, label: t('taskStatus.inProgress')},
        {value: TaskStatus.IN_REVIEW, label: t('taskStatus.inReview')},
        {value: TaskStatus.DONE, label: t('taskStatus.done')},
    ];

    const priorityOptions = [
        {value: TaskPriority.LOW, label: t('priority.low')},
        {value: TaskPriority.MEDIUM, label: t('priority.medium')},
        {value: TaskPriority.HIGH, label: t('priority.high')},
        {value: TaskPriority.URGENT, label: t('priority.urgent')},
    ];

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;

        try {
            await updateTaskMutation.mutateAsync({
                id: task.id,
                data: {
                    ...editForm,
                    assigned_to: selectedAssigneeId || undefined,
                    due_date: editForm.due_date || undefined,
                    estimated_hours: editForm.estimated_hours || undefined,
                    item_id: editForm.item_id || undefined,
                },
            });
            setShowEditModal(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleDeleteTask = async () => {
        if (!task) return;

        try {
            await deleteTaskMutation.mutateAsync(task.id);
            // Navigate back to tasks list
            window.history.back();
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleStartTimer = () => {
        if (!task) return;
        startTimer({
            task_id: task.id,
            description: `Working on ${task.title}`,
        });
    };

    const handleStopTimer = () => {
        stopTimer();
    };

    const handleCreateComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            await createCommentMutation.mutateAsync({content: commentText});
            setCommentText('');
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleUpdateComment = async (commentId: string) => {
        if (!editingCommentText.trim()) return;

        try {
            await updateCommentMutation.mutateAsync({
                commentId,
                data: {content: editingCommentText},
            });
            setEditingCommentId(null);
            setEditingCommentText('');
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await deleteCommentMutation.mutateAsync(commentId);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const startEditingComment = (commentId: string, content: string) => {
        setEditingCommentId(commentId);
        setEditingCommentText(content);
    };

    const cancelEditingComment = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };



    // Time Entries management state
    const queryClient = useQueryClient();
    const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [timeEntryForm, setTimeEntryForm] = useState<{
        description: string;
        start: string;
        end: string;
        external: boolean;
        billable: boolean;
    }>({
        description: '',
        start: '',
        end: '',
        external: false,
        billable: true,
    });

    const openCreateTimeEntry = () => {
        setEditingEntryId(null);
        setTimeEntryForm({
            description: '',
            start: '',
            end: '',
            external: false,
            billable: true,
        });
        setShowTimeEntryModal(true);
    };

    const openEditTimeEntry = (entry: any) => {
        // Convert ISO to datetime-local value (YYYY-MM-DDTHH:mm)
        const toLocalInput = (iso?: string) =>
            iso ? new Date(iso).toISOString().slice(0, 16) : '';
        setEditingEntryId(entry.id);
        setTimeEntryForm({
            description: entry.description || '',
            start: toLocalInput(entry.start_time),
            end: toLocalInput(entry.end_time),
            external: entry.external || false,
            billable: entry.billable !== undefined ? entry.billable : true,
        });
        setShowTimeEntryModal(true);
    };

    const handleSaveTimeEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;
        try {
            const toISO = (val: string) => (val ? new Date(val).toISOString() : undefined);
            if (editingEntryId) {
                await timeTrackingApi.updateTimeEntry(editingEntryId, {
                    description: timeEntryForm.description || undefined,
                    start_time: toISO(timeEntryForm.start),
                    end_time: toISO(timeEntryForm.end),
                    external: timeEntryForm.external,
                    billable: timeEntryForm.billable,
                });
                toast.success('Time entry updated');
            } else {
                if (!timeEntryForm.start || !timeEntryForm.end) {
                    toast.error('Start and end time are required');
                    return;
                }
                await timeTrackingApi.createTimeEntry({
                    task_id: task.id,
                    description: timeEntryForm.description,
                    start_time: new Date(timeEntryForm.start).toISOString(),
                    end_time: new Date(timeEntryForm.end).toISOString(),
                    external: timeEntryForm.external,
                    billable: timeEntryForm.billable,
                });
                toast.success('Time entry created');
            }
            setShowTimeEntryModal(false);
            setEditingEntryId(null);
            await queryClient.invalidateQueries({queryKey: ['task', task.id]});
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save time entry');
        }
    };

    const handleDeleteTimeEntry = async (entryId: string) => {
        if (!task) return;
        try {
            await timeTrackingApi.deleteTimeEntry(entryId);
            toast.success('Time entry deleted');
            await queryClient.invalidateQueries({queryKey: ['task', task.id]});
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete time entry');
        }
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

    if (taskLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg"/>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tasks.taskNotFound')}</h3>
                <Link to="/tasks" className="text-primary-600 hover:text-primary-700">
                    {t('tasks.backToTasks')}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        to="/tasks"
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1"/>
                        {t('tasks.backToTasks')}
                    </Link>
                </div>
                <div className="flex items-center space-x-2">
                    {canStartTimer && (
                        <>
                            {!isRunning || activeTimer?.task_id !== task.id ? (
                                <Button
                                    onClick={handleStartTimer}
                                    variant="secondary"
                                    size="sm"
                                    disabled={isRunning && activeTimer?.task_id !== task.id}
                                >
                                    <Play className="h-4 w-4 mr-2"/>
                                    {t('taskDetail.startTimer')}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleStopTimer}
                                    variant="danger"
                                    size="sm"
                                >
                                    <Square className="h-4 w-4 mr-2"/>
                                    {t('taskDetail.stopTimer')}
                                </Button>
                            )}
                        </>
                    )}
                    {canEdit && (
                        <>
                            <Button onClick={() => setShowEditModal(true)} variant="secondary">
                                <Edit className="h-4 w-4 mr-2"/>
                                {t('tasks.editTask')}
                            </Button>
                            {canDelete && (
                                <Button onClick={() => setShowDeleteModal(true)} variant="danger">
                                    <Trash className="h-4 w-4 mr-2"/>
                                    {t('tasks.deleteTask')}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Task Info */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <Badge variant={getStatusVariant(task.status)}>
                                            {task.status.replace('_', ' ')}
                                        </Badge>
                                        <Badge variant={getPriorityVariant(task.priority)}>
                                            <Flag className="h-3 w-3 mr-1"/>
                                            {task.priority}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="prose max-w-none">
                                <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                            </div>

                            {/* Tags */}
                            {task.tags.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">{t('tasks.tags')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map((tag) => (
                                            <Badge key={tag} variant="default" className="flex items-center">
                                                <Tag className="h-3 w-3 mr-1"/>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Time Entries */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t('tasks.timeEntries')}</CardTitle>
                                {(
                                    <Button size="sm" onClick={openCreateTimeEntry}>
                                        <Plus className="h-4 w-4 mr-1"/> {t('taskDetail.addTimeEntry')}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {task.time_entries.length === 0 ? (
                                <p className="text-gray-500">{t('taskDetail.noTimeEntries')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {task.time_entries.map((entry) => (
                                        <div key={entry.id}
                                             className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900">{entry.description || t('taskDetail.noDescription')}</p>
                                                    {entry.external && (
                                                        <Badge variant="default" size="sm">External</Badge>
                                                    )}
                                                    {!entry.billable && (
                                                        <Badge variant="warning" size="sm">Non-billable</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(entry.start_time)} - {entry.end_time ? formatDate(entry.end_time) : t('taskDetail.inProgress')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {entry.duration_minutes ? `${Math.round((entry.duration_minutes / 60) * 100) / 100}h` : t('taskDetail.running')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {entry.user.first_name} {entry.user.last_name}
                                                    </p>
                                                </div>
                                                {(canEditTimeEntries || entry.user.keycloak_id === user?.id) && (
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm"
                                                                onClick={() => openEditTimeEntry(entry)}
                                                                aria-label="Edit time entry">
                                                            <Edit className="h-4 w-4"/>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteTimeEntry(entry.id)}
                                                            aria-label="Delete time entry"
                                                        >
                                                            <Trash className="h-4 w-4 text-red-600"/>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Comments */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('tasks.comments')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add Comment Form */}
                            <form onSubmit={handleCreateComment} className="space-y-2">
                <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t('taskDetail.addCommentPlaceholder')}
                    className="input w-full"
                    rows={3}
                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!commentText.trim() || createCommentMutation.isPending}
                                        loading={createCommentMutation.isPending}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2"/>
                                        {t('tasks.addComment')}
                                    </Button>
                                </div>
                            </form>

                            {/* Comments List */}
                            {commentsLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <LoadingSpinner size="sm"/>
                                </div>
                            ) : !comments || comments.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">{t('tasks.noComments')}</p>
                            ) : (
                                <div className="space-y-4 border-t pt-4">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div
                                                className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-white">
                          {comment.user?.first_name?.[0]}{comment.user?.last_name?.[0]}
                        </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user?.first_name} {comment.user?.last_name}
                          </span>
                                                    <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                                                    {comment.updated_at !== comment.created_at && (
                                                        <span
                                                            className="text-xs text-gray-400">({t('taskDetail.edited')})</span>
                                                    )}
                                                </div>

                                                {editingCommentId === comment.id ? (
                                                    <div className="space-y-2">
                            <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="input w-full"
                                rows={3}
                            />
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleUpdateComment(comment.id)}
                                                                disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                                                                loading={updateCommentMutation.isPending}
                                                            >
                                                                {t('common.save')}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={cancelEditingComment}
                                                            >
                                                                {t('common.cancel')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                                                        {comment.user?.email === user?.email && (
                                                            <div className="flex gap-2 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => startEditingComment(comment.id, comment.content)}
                                                                >
                                                                    <Edit className="h-3 w-3 mr-1"/>
                                                                    {t('common.edit')}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    disabled={deleteCommentMutation.isPending}
                                                                >
                                                                    <Trash className="h-3 w-3 mr-1 text-red-600"/>
                                                                    {t('common.delete')}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Task Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('taskDetail.taskDetails')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Project */}
                            {task.project && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">{t('tasks.project')}</p>
                                    <Link
                                        to={`/projects/${task.project.id}`}
                                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        {task.project.name}
                                    </Link>
                                </div>
                            )}

                            {/* Assignee */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">{t('tasks.assignee')}</p>
                                {canEdit ? (
                                    <Select
                                        value={selectedAssigneeId}
                                        onChange={async (e) => {
                                            const newAssigneeId = e.target.value;
                                            setSelectedAssigneeId(newAssigneeId);
                                            if (newAssigneeId && task) {
                                                try {
                                                    await assignTaskMutation.mutateAsync({
                                                        id: task.id,
                                                        assigneeId: newAssigneeId
                                                    });
                                                } catch (err) {
                                                    // Error handled by mutation
                                                }
                                            }
                                        }}
                                        options={[
                                            {value: '', label: t('projects.unassigned')},
                                            ...(usersData || []).map((u: any) => ({
                                                value: u.id,
                                                label: `${u.first_name} ${u.last_name}`
                                            }))
                                        ]}
                                    />
                                ) : (
                                    task.assignee ? (
                                        <div className="flex items-center">
                                            <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                                                <span className="text-xs font-medium text-white">
                                                    {task.assignee.first_name[0]}{task.assignee.last_name[0]}
                                                </span>
                                            </div>
                                            <span className="ml-2 text-sm text-gray-900">
                                                {task.assignee.first_name} {task.assignee.last_name}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">{t('projects.unassigned')}</p>
                                    )
                                )}
                            </div>

                            {/* Creator */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">{t('taskDetail.createdBy')}</p>
                                <div className="flex items-center">
                                    <div className="h-5 w-5 rounded-full bg-gray-600 flex items-center justify-center">
                                        <span className="text-xs font-medium text-white">
                                            {task.creator.first_name[0]}{task.creator.last_name[0]}
                                        </span>
                                    </div>
                                    <span className="ml-2 text-sm text-gray-900">
                                        {task.creator.first_name} {task.creator.last_name}
                                    </span>
                                </div>
                            </div>

                            {/* Due Date */}
                            {task.due_date && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">{t('tasks.dueDate')}</p>
                                    <div className="flex items-center">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1.5"/>
                                        <span className="text-sm text-gray-900">{formatDate(task.due_date)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Time Tracking */}
                            <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-500 mb-2">Time Tracking</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {task.estimated_hours && (
                                        <div className="bg-gray-50 rounded p-2">
                                            <p className="text-xs text-gray-500 mb-0.5">{t('tasks.estimatedHours')}</p>
                                            <p className="text-sm font-semibold text-gray-900">{task.estimated_hours}h</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-500 mb-0.5">{t('tasks.actualHours')}</p>
                                        <p className="text-sm font-semibold text-gray-900">{Math.round(task.actual_hours * 100) / 100}h</p>
                                    </div>
                                    {task.estimated_hours && (
                                        <div className="bg-gray-50 rounded p-2">
                                            <p className="text-xs text-gray-500 mb-0.5">{t('tasks.remainingHours')}</p>
                                            <p className={`text-sm font-semibold ${task.estimated_hours - task.actual_hours < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {Math.round((task.estimated_hours - task.actual_hours) * 100) / 100}h
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Item */}
                            {task.item && (
                                <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 mb-1">{t('taskDetail.item')}</p>
                                    <p className="text-sm text-gray-900">{task.item.description || t('taskDetail.noDescription')}</p>
                                    {task.item.material_number && (
                                        <p className="text-xs text-gray-500 mt-0.5">{t('taskDetail.materialNumber')}: {task.item.material_number}</p>
                                    )}
                                </div>
                            )}

                            {/* Properties */}
                            <div className="pt-2 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 mb-0.5">External</p>
                                        <p className="text-sm text-gray-900">{task.external ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 mb-0.5">Billable</p>
                                        <p className="text-sm text-gray-900">{task.billable ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="pt-2 border-t border-gray-200">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500">{t('taskDetail.created')}</p>
                                        <p className="text-xs text-gray-900">{formatRelativeTime(task.created_at)}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500">{t('taskDetail.lastUpdated')}</p>
                                        <p className="text-xs text-gray-900">{formatRelativeTime(task.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Task Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={t('tasks.editTask')}
                size="lg"
            >
                <form onSubmit={handleUpdateTask} className="space-y-4">
                    <Input
                        label={t('tasks.taskTitle')}
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        required
                    />

                    <div>
                        <label className="label">{t('tasks.description')}</label>
                        <textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                            className="input"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label={t('tasks.status')}
                            value={editForm.status || ''}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value as TaskStatus})}
                            options={statusOptions}
                            required
                        />

                        <Select
                            label={t('tasks.priority')}
                            value={editForm.priority || ''}
                            onChange={(e) => setEditForm({...editForm, priority: e.target.value as TaskPriority})}
                            options={priorityOptions}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label={t('tasks.assignee')}
                            value={selectedAssigneeId}
                            onChange={(e) => setSelectedAssigneeId(e.target.value)}
                            options={[
                                {value: '', label: t('projects.unassigned')},
                                ...(usersData || []).map((u: any) => ({value: u.id, label: `${u.first_name} ${u.last_name}`}))
                            ]}
                        />

                        <Select
                            label={t('taskDetail.item')}
                            value={editForm.item_id || ''}
                            onChange={(e) => setEditForm({...editForm, item_id: e.target.value})}
                            options={[
                                {value: '', label: itemsLoading ? 'Loading items...' : t('taskDetail.noItem')},
                                ...items.map(item => ({
                                    value: item.id,
                                    label: `${item.description || t('taskDetail.item')} ${item.material_number ? `(${item.material_number})` : ''}`
                                }))
                            ]}
                            disabled={!task?.project?.order_id || itemsLoading}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={t('tasks.estimatedHours')}
                            type="number"
                            min="0"
                            step="0.5"
                            value={editForm.estimated_hours || ''}
                            onChange={(e) => setEditForm({
                                ...editForm,
                                estimated_hours: parseFloat(e.target.value) || undefined
                            })}
                        />

                        <Input
                            label={t('tasks.dueDate')}
                            type="date"
                            value={editForm.due_date || ''}
                            onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="edit-external"
                                checked={editForm.external || false}
                                onChange={(e) => setEditForm({...editForm, external: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-external" className="ml-2 block text-sm text-gray-900">
                                External Task
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="edit-billable"
                                checked={editForm.billable !== undefined ? editForm.billable : true}
                                onChange={(e) => setEditForm({...editForm, billable: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-billable" className="ml-2 block text-sm text-gray-900">
                                Billable
                            </label>
                        </div>
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
                            loading={updateTaskMutation.isPending}
                            disabled={updateTaskMutation.isPending}
                        >
                            {t('tasks.updateTask')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Time Entry Modal */}
            <Modal
                isOpen={showTimeEntryModal}
                onClose={() => setShowTimeEntryModal(false)}
                title={editingEntryId ? t('taskDetail.editTimeEntry') : t('taskDetail.addTimeEntry')}
            >
                <form onSubmit={handleSaveTimeEntry} className="space-y-4">
                    <div>
                        <label className="label">{t('tasks.description')}</label>
                        <textarea
                            value={timeEntryForm.description}
                            onChange={(e) => setTimeEntryForm({...timeEntryForm, description: e.target.value})}
                            placeholder={t('taskDetail.whatDidYouWorkOn')}
                            className="input w-full"
                            rows={4}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={t('taskDetail.startTime')}
                            type="datetime-local"
                            value={timeEntryForm.start}
                            onChange={(e) => setTimeEntryForm({...timeEntryForm, start: e.target.value})}
                            required={!editingEntryId}
                        />
                        <Input
                            label={t('taskDetail.endTime')}
                            type="datetime-local"
                            value={timeEntryForm.end}
                            onChange={(e) => setTimeEntryForm({...timeEntryForm, end: e.target.value})}
                            required={!editingEntryId}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="time-entry-external"
                                checked={timeEntryForm.external}
                                onChange={(e) => setTimeEntryForm({...timeEntryForm, external: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="time-entry-external" className="ml-2 block text-sm text-gray-900">
                                External
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="time-entry-billable"
                                checked={timeEntryForm.billable}
                                onChange={(e) => setTimeEntryForm({...timeEntryForm, billable: e.target.checked})}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="time-entry-billable" className="ml-2 block text-sm text-gray-900">
                                Billable
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowTimeEntryModal(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit">{editingEntryId ? t('taskDetail.updateEntry') : t('taskDetail.createEntry')}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={t('tasks.deleteTask')}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        {t('taskDetail.deleteConfirmation')}
                    </p>
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteTask}
                            loading={deleteTaskMutation.isPending}
                            disabled={deleteTaskMutation.isPending}
                        >
                            {t('tasks.deleteTask')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskDetail;