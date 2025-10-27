import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Info, User, Shield, CheckCircle, Crown } from 'lucide-react';

interface RoleHelpProps {
  userRoles: string[];
  onClose: () => void;
}

const RoleHelp: React.FC<RoleHelpProps> = ({ userRoles, onClose }) => {
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'staff':
        return {
          icon: <User className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800',
          description: 'Submit and manage your own requisitions'
        };
      case 'authoriser':
        return {
          icon: <Shield className="h-4 w-4" />,
          color: 'bg-orange-100 text-orange-800',
          description: 'Review and authorize pending requisitions'
        };
      case 'approver':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800',
          description: 'Approve authorized requisitions for final processing'
        };
      case 'admin':
        return {
          icon: <Crown className="h-4 w-4" />,
          color: 'bg-purple-100 text-purple-800',
          description: 'Full system access - view, download, and manage all data'
        };
      default:
        return {
          icon: <User className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800',
          description: 'Unknown role'
        };
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Multiple Role Access</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-800">
          You have access to multiple dashboards. Use the dropdown in the top-right to switch between different views and responsibilities.
        </p>
        
        <div className="space-y-2">
          <h4 className="font-medium text-blue-900">Your Available Roles:</h4>
          {userRoles.map((role) => {
            const roleInfo = getRoleInfo(role);
            return (
              <div key={role} className="flex items-center gap-3 p-2 bg-white rounded border">
                <Badge className={roleInfo.color}>
                  {roleInfo.icon}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <span className="text-sm text-gray-700">{roleInfo.description}</span>
              </div>
            );
          })}
        </div>
        
        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          💡 <strong>Tip:</strong> The role switcher dropdown appears in the top-right corner. Click it to change your current dashboard view.
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleHelp;