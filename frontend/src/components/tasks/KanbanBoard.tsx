import React, { useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, User, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatDate, isOverdue, isDueSoon } from '@/utils/dateUtils';
import { cn } from '@/utils/cn';
import type { Task, TaskPriority } from '@/types';
import { TaskStatus } from '@/types';

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

interface KanbanBoardProps {
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
}

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = () => {
    if (!isDragging) {
      navigate(`/tasks/${task.id}`);
    }
  };

  return (
    <div onClick={handleClick}>
      <Card
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer',
          isDragging && 'shadow-lg opacity-50'
        )}
      >
      {/* Priority Indicator */}
      <div
        className={cn(
          'h-1 w-full rounded-t-md',
          getPriorityColor(task.priority)
        )}
      />

      <div className="p-4">
        {/* Task Title */}
        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {task.title}
        </h4>

        {/* Task Description */}
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Task Meta */}
        <div className="space-y-2">
          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-3 w-3 mr-1" />
              <span>
                {task.assignee.first_name} {task.assignee.last_name}
              </span>
            </div>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              <span
                className={cn(
                  isOverdue(task.due_date)
                    ? 'text-red-600'
                    : isDueSoon(task.due_date)
                    ? 'text-yellow-600'
                    : 'text-gray-500'
                )}
              >
                {formatDate(task.due_date)}
              </span>
            </div>
          )}

          {/* Estimated Hours */}
          {task.estimated_hours && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>{task.estimated_hours}{t('kanban.hoursEstimated')}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="default"
                size="sm"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="default" size="sm" className="text-xs">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Project */}
        {task.project && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {task.project.name}
            </p>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
};

interface SortableTaskCardProps {
  task: Task;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('transition-shadow', isDragging && 'z-50')}
    >
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
};

interface DroppableColumnProps {
  column: KanbanColumn;
  onAddTask: (status: TaskStatus) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, onAddTask }) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-50 rounded-lg p-4">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="font-medium text-gray-900">{column.title}</h3>
            <Badge variant="default" size="sm" className="ml-2">
              {column.tasks.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Droppable Area */}
        <SortableContext
          items={column.tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={cn(
              'space-y-3 min-h-[200px] transition-colors rounded-md',
              isOver && 'bg-primary-50'
            )}
          >
            {column.tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}

            {/* Empty State */}
            {column.tasks.length === 0 && (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-md">
                <p className="text-gray-500 text-sm">
                  {t('kanban.dropTasksHere')}{' '}
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {t('kanban.addNewTask')}
                  </button>
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onAddTask }) => {
  const { t } = useTranslation();
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns: KanbanColumn[] = useMemo(
    () => [
      {
        id: TaskStatus.BACKLOG,
        title: t('taskStatus.backlog'),
        tasks: tasks.filter(task => task.status === TaskStatus.BACKLOG),
      },
      {
        id: TaskStatus.TODO,
        title: t('taskStatus.todo'),
        tasks: tasks.filter(task => task.status === TaskStatus.TODO),
      },
      {
        id: TaskStatus.IN_PROGRESS,
        title: t('taskStatus.inProgress'),
        tasks: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS),
      },
      {
        id: TaskStatus.IN_REVIEW,
        title: t('taskStatus.inReview'),
        tasks: tasks.filter(task => task.status === TaskStatus.IN_REVIEW),
      },
      {
        id: TaskStatus.DONE,
        title: t('taskStatus.done'),
        tasks: tasks.filter(task => task.status === TaskStatus.DONE),
      },
    ],
    [tasks, t]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find the dragged task
    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    // Check if dropped over a column (droppable area)
    const targetColumn = columns.find(col => col.id === overId);
    if (targetColumn && draggedTask.status !== targetColumn.id) {
      updateTaskStatusMutation.mutate({
        id: taskId,
        status: targetColumn.id,
      });
      return;
    }

    // Check if dropped over another task
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== draggedTask.status) {
      updateTaskStatusMutation.mutate({
        id: taskId,
        status: overTask.status,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <DroppableColumn key={column.id} column={column} onAddTask={onAddTask} />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
