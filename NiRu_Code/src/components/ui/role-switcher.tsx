import React, { useState } from 'react';
import { UserRole } from '@/types/requisition';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, User, Shield, CheckCircle, Crown } from 'lucide-react';
import { getAvailableDashboards, getPrimaryRole } from '@/utils/roleUtils';

interface RoleSwitcherProps {
  userRoles: UserRole[];
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ 
  userRoles, 
  currentRole, 
  onRoleChange, 
  className = "" 
}) => {
  const availableDashboards = getAvailableDashboards(userRoles);
  
  // Don't show switcher if user only has one role
  if (availableDashboards.length <= 1) {
    return null;
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'staff': return <User className="h-4 w-4" />;
      case 'authoriser': return <Shield className="h-4 w-4" />;
      case 'approver': return <CheckCircle className="h-4 w-4" />;
      case 'admin': return <Crown className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'authoriser': return 'bg-orange-100 text-orange-800';
      case 'approver': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentDashboard = availableDashboards.find(d => d.role === currentRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`flex items-center gap-2 ${className}`}>
          <Badge className={getRoleColor(currentRole)}>
            {getRoleIcon(currentRole)}
            {currentDashboard?.label || currentRole}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 shadow-lg border z-50">
        <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border-b">
          Switch Dashboard View
        </div>
        {availableDashboards.map((dashboard) => (
          <DropdownMenuItem
            key={dashboard.role}
            onClick={() => onRoleChange(dashboard.role)}
            className={`flex items-center gap-2 ${
              currentRole === dashboard.role ? 'bg-accent' : ''
            }`}
          >
            {getRoleIcon(dashboard.role)}
            <span>{dashboard.label}</span>
            {currentRole === dashboard.role && (
              <CheckCircle className="h-4 w-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;