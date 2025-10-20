// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: Role[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  keycloak_id: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

// Customer Types
export interface Customer {
  id: string;
  customer_name: string;
}

// Order Types
export interface Order {
  id: string;
  order_id: string | null;
  description: string | null;
  comment: string | null;
  customer: Customer;
  created_at: string;
  updated_at: string;
}

// Item Types
export interface Item {
  id: string;
  order_id: string;
  price_per_unit: number | null;
  units: number | null;
  description: string | null;
  comment: string | null;
  material_number: string | null;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  end_date?: string;
  ownerId: string;
  owner: User;
  members: ProjectMember[];
  tasks: Task[];
  total_hours: number;
  customer_id?: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  user: User;
  project_id: string;
  role: ProjectRole;
  joined_at: string;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER'
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  project?: Project;
  assigned_to?: string;
  assignee?: User;
  item_id?: string;
  item?: Item;
  created_by: string;
  creator: User;
  estimated_hours?: number;
  actual_hours: number;
  due_date?: string;
  completed_at?: string;
  external: boolean;
  billable: boolean;
  tags: string[];
  time_entries: TimeEntry[];
  created_at: string;
  updated_at: string;
}

export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'review',
  DONE = 'done'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Comment Types
export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  content: string;
  created_at: string;
  updated_at: string;
}

// Notification Types
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_UPDATED = 'task_updated',
  COMMENT_ADDED = 'comment_added',
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_UPDATED = 'project_updated',
  MENTION = 'mention',
  DEADLINE_APPROACHING = 'deadline_approaching',
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_task_id?: string;
  related_project_id?: string;
  related_comment_id?: string;
  actor_id?: string;
  actor?: User;
  created_at: string;
  read_at?: string;
}

// Time Tracking Types
export interface TimeEntry {
  id: string;
  description: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number; // in minutes
  task_id: string;
  task?: Task;
  user_id: string;
  user: User;
  project_id: string;
  project?: Project;
  external: boolean;
  billable: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: string;
  task_id: string;
  task: Task;
  start_time: string;
  description: string;
}

// Report Types
export interface ProjectReport {
  projectId: string;
  projectName: string;
  totalHours: number;
  completedTasks: number;
  totalTasks: number;
  progress: number;
  members: ProjectMemberReport[];
}

export interface ProjectMemberReport {
  userId: string;
  userName: string;
  totalHours: number;
  completedTasks: number;
  activeTasks: number;
}

export interface TimeReport {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  totalHours: number;
  entries: TimeEntry[];
}

// Form Types
export interface CreateProjectData {
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  members: string[];
  customer_id?: string;
  order_id: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  customer_id?: string;
  order_id?: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  project_id: string;
  assigned_to?: string;
  item_id?: string;
  priority: TaskPriority;
  estimated_hours?: number;
  due_date?: string;
  external?: boolean;
  billable?: boolean;
  tags: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  item_id?: string;
  estimated_hours?: number;
  due_date?: string;
  external?: boolean;
  billable?: boolean;
  tags?: string[];
}

export interface StartTimerData {
  task_id: string;
  description: string;
}

export interface StopTimerData {
  description?: string;
}

// Filter Types
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigned_to?: string;
  project_id?: string;
  search?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  owner_id?: string;
  member_id?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface TimeEntryFilters {
  user_id?: string;
  project_id?: string;
  task_id?: string;
  start_time?: string;
  end_time?: string;
}

// Authentication Types
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

// UI Types
export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}