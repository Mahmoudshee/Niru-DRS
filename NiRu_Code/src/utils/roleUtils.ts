import { UserRole } from '@/types/requisition';

/**
 * Utility functions for handling multi-role users
 */

/**
 * Get the primary role for dashboard selection
 * Priority: admin > approver > authoriser > staff
 */
export const getPrimaryRole = (roles: UserRole[]): UserRole | null => {
  if (!roles || roles.length === 0) return null;
  
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('approver')) return 'approver';
  if (roles.includes('authoriser')) return 'authoriser';
  if (roles.includes('staff')) return 'staff';
  
  return null;
};

/**
 * Check if user has permission for a specific action
 */
export const hasPermission = (userRoles: UserRole[], requiredRole: UserRole): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Admin has all permissions
  if (userRoles.includes('admin')) return true;
  
  // Check for specific role
  return userRoles.includes(requiredRole);
};

/**
 * Get role for performing an action (used for audit trails)
 * Returns the most specific role for the action
 */
export const getActionRole = (userRoles: UserRole[], action: 'authorize' | 'approve' | 'admin' | 'staff'): UserRole => {
  if (!userRoles || userRoles.length === 0) return 'staff';
  
  switch (action) {
    case 'authorize':
      return userRoles.includes('authoriser') ? 'authoriser' : 'admin';
    case 'approve':
      return userRoles.includes('approver') ? 'approver' : 'admin';
    case 'admin':
      return 'admin';
    case 'staff':
    default:
      return userRoles.includes('staff') ? 'staff' : 'admin';
  }
};

/**
 * Get all available dashboards for a user
 */
export const getAvailableDashboards = (roles: UserRole[]): { role: UserRole; label: string }[] => {
  const dashboards = [];
  
  if (roles.includes('staff')) {
    dashboards.push({ role: 'staff' as UserRole, label: 'Staff Dashboard' });
  }
  if (roles.includes('authoriser')) {
    dashboards.push({ role: 'authoriser' as UserRole, label: 'Authoriser Dashboard' });
  }
  if (roles.includes('approver')) {
    dashboards.push({ role: 'approver' as UserRole, label: 'Approver Dashboard' });
  }
  if (roles.includes('admin')) {
    dashboards.push({ role: 'admin' as UserRole, label: 'Admin Dashboard' });
  }
  
  return dashboards;
};