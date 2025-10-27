
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/requisition';
import { getPrimaryRole } from '@/utils/roleUtils';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import AuthoriserDashboard from '@/components/dashboard/AuthoriserDashboard';
import ApproverDashboard from '@/components/dashboard/ApproverDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import RoleSwitcher from '@/components/ui/role-switcher';
import RoleHelp from '@/components/ui/role-help';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [showRoleHelp, setShowRoleHelp] = useState(false);
  
  // Don't render dashboard if no user (should be handled by App.tsx routing, but safety check)
  if (!user) {
    return null;
  }
  
  // Initialize current role with persistence
  const primaryRole = getPrimaryRole(user?.roles || []);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    // Try to get saved role from localStorage first
    const savedRole = localStorage.getItem('selectedRole') as UserRole;
    if (savedRole && user?.roles?.includes(savedRole)) {
      return savedRole;
    }
    return primaryRole || 'staff';
  });

  // Update current role when user changes, but preserve selection if still valid
  React.useEffect(() => {
    if (user?.roles) {
      const savedRole = localStorage.getItem('selectedRole') as UserRole;
      if (savedRole && user.roles.includes(savedRole)) {
        // Keep the saved role if user still has it
        setCurrentRole(savedRole);
      } else if (primaryRole && !user.roles.includes(currentRole)) {
        // Only reset if current role is no longer valid
        setCurrentRole(primaryRole);
        localStorage.removeItem('selectedRole');
      }
    }
  }, [user?.roles, primaryRole]);

  // Save role selection to localStorage
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    localStorage.setItem('selectedRole', newRole);
  };

  // Show help automatically for users with multiple roles (first time)
  React.useEffect(() => {
    if (user?.roles && user.roles.length > 1 && !showRoleHelp) {
      const hasSeenHelp = localStorage.getItem('hasSeenRoleHelp');
      if (!hasSeenHelp) {
        setShowRoleHelp(true);
        localStorage.setItem('hasSeenRoleHelp', 'true');
      }
    }
  }, [user?.roles]);

  const renderDashboard = () => {
    if (!user?.roles || user.roles.length === 0) {
      return <div>No roles assigned</div>;
    }

    // Show dashboard based on current selected role
    switch (currentRole) {
      case 'admin':
        return user.roles.includes('admin') ? <AdminDashboard /> : <div>Access denied</div>;
      case 'approver':
        return user.roles.includes('approver') ? <ApproverDashboard /> : <div>Access denied</div>;
      case 'authoriser':
        return user.roles.includes('authoriser') ? <AuthoriserDashboard /> : <div>Access denied</div>;
      case 'staff':
        return user.roles.includes('staff') ? <StaffDashboard /> : <div>Access denied</div>;
      default:
        return <div>Unknown role configuration</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Help - shows automatically for multi-role users */}
        {user && user.roles.length > 1 && showRoleHelp && (
          <RoleHelp 
            userRoles={user.roles} 
            onClose={() => setShowRoleHelp(false)} 
          />
        )}
        
        {/* Role Switcher for multi-role users */}
        {user && user.roles.length > 1 && (
          <div className="mb-6 flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              👤 You have access to multiple dashboards
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRoleHelp(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                Show Help
              </Button>
            </div>
            <RoleSwitcher
              userRoles={user.roles}
              currentRole={currentRole}
              onRoleChange={handleRoleChange}
            />
          </div>
        )}
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;
