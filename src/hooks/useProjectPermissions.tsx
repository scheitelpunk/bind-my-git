/**
 * Custom hook for checking project-level permissions
 *
 * This hook enables hierarchical permission checking:
 * 1. Global roles (admin, project_manager) - full access to all projects
 * 2. Project ownership - full access to owned projects
 * 3. Project-level roles - members with MANAGER role have project_manager capabilities on their project
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { Project, ProjectRole } from '@/types';

interface ProjectPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canViewProject: boolean;
  isProjectManager: boolean;
}

/**
 * Check if a user has project manager capabilities on a specific project
 * This includes:
 * - Users with global 'admin' role
 * - Users with global 'project_manager' role
 * - Project owners
 * - Project members with MANAGER role
 */
export const useProjectPermissions = (project: Project | null | undefined): ProjectPermissions => {
  const { user, hasRole } = useAuth();

  const permissions = useMemo(() => {
    // Default permissions when project or user is not available
    const defaultPermissions = {
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canViewProject: false,
      isProjectManager: false,
    };

    if (!project || !user) {
      return defaultPermissions;
    }

    // Check if user has global admin or project_manager role
    const hasGlobalAdminRole = hasRole('admin');
    const hasGlobalProjectManagerRole = hasRole('project_manager');

    // Check if user is the project owner
    // Need to compare with keycloak_id since that's the actual identifier
    const isOwner = project.ownerId === user.id || project.ownerId === user.keycloak_id;

    // Check if user is a project member with MANAGER role
    // Match by user_id (which is the internal DB id) or by keycloak_id
    const projectMember = project.members?.find(
      (member) => {
        // Try matching by internal DB id
        if (member.user_id === user.id) return true;
        // Try matching by keycloak_id on the user object
        if (member.user?.keycloak_id === user.keycloak_id) return true;
        // Try matching user.id with keycloak_id
        if (member.user?.id === user.id) return true;
        return false;
      }
    );
    const isProjectLevelManager = projectMember?.role === ProjectRole.MANAGER;

    // Debug logging (remove after testing)
    if (import.meta.env.DEV && project && user) {
      console.log('🔍 Permission Debug:', {
        projectId: project.id,
        projectName: project.name,
        userId: user.id,
        userKeycloakId: user.keycloak_id,
        projectOwnerId: project.ownerId,
        isOwner,
        projectMember,
        isProjectLevelManager,
        hasGlobalAdminRole,
        hasGlobalProjectManagerRole,
      });
    }

    // A user is considered a project manager if they have any of these:
    const isProjectManager =
      hasGlobalAdminRole ||
      hasGlobalProjectManagerRole ||
      isOwner ||
      isProjectLevelManager;

    // Check if user is any member of the project (for view access)
    const isMember = !!projectMember;

    return {
      // Can edit project details
      canEdit: isProjectManager,

      // Only admins and project_managers can delete projects
      canDelete: hasGlobalAdminRole || hasGlobalProjectManagerRole,

      // Can manage team members (add/remove)
      canManageMembers: isProjectManager,

      // Can view the project (any member or manager)
      canViewProject: isProjectManager || isMember,

      // Has project manager capabilities
      isProjectManager,
    };
  }, [project, user, hasRole]);

  return permissions;
};

/**
 * Check if a user can edit a task
 * This includes:
 * - Users with project manager capabilities on the task's project
 * - Task assignee
 * - Task creator
 */
export const useTaskPermissions = (
  task: {
    project?: Project | null;
    assigned_to?: string;
    created_by: string;
  } | null | undefined
) => {
  const { user, hasAnyRole } = useAuth();
  const projectPermissions = useProjectPermissions(task?.project);

  const permissions = useMemo(() => {
    // Default permissions when task or user is not available
    const defaultPermissions = {
      canEdit: false,
      canDelete: false,
      canStartTimer: false,
      canEditTimeEntries: false,
    };

    if (!task || !user) {
      return defaultPermissions;
    }

    // Check if user has project manager capabilities on the task's project
    const hasProjectManagerAccess = projectPermissions.isProjectManager;

    // Check if user is the task assignee or creator
    const isAssignee = task.assigned_to === user.id;
    const isCreator = task.created_by === user.id;

    // Can edit task if: project manager, assignee, or creator
    const canEdit = hasProjectManagerAccess || isAssignee || isCreator;

    // Only project managers and global admins can delete tasks
    const canDelete = hasAnyRole(['admin', 'project_manager']) || projectPermissions.isProjectManager;

    // Can start timer if: assignee or creator
    const canStartTimer = isAssignee || isCreator;

    // Can edit time entries if: project manager or entry owner
    const canEditTimeEntries = hasProjectManagerAccess || hasAnyRole(['admin', 'project_manager']);

    return {
      canEdit,
      canDelete,
      canStartTimer,
      canEditTimeEntries,
    };
  }, [task, user, projectPermissions, hasAnyRole]);

  return permissions;
};
