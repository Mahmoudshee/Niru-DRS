
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'authoriser': return 'bg-orange-100 text-orange-800';
      case 'approver': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              NiRu DRS - Digital Requisition System
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex gap-1">
              {user.roles.map((role) => (
                <Badge key={role} className={getRoleColor(role)}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              ))}
            </div>
            
            <div className="text-sm text-gray-600">
              Welcome, {user.name}
            </div>
            
            <a
              href="/manual"
              className="inline-flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              title="Open System Manual"
            >
              <strong>System Manual</strong>
            </a>

            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
