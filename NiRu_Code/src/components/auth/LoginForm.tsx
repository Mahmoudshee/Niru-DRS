
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import StaffRegistration from './StaffRegistration';

const LoginForm = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [showRegistration, setShowRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting login for:', formData.email);
      const success = await login(formData.email, formData.password);
      
      console.log('Login result:', success);

      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome to the Digital Requisition System"
        });
        // The auth context will handle the redirect automatically
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <StaffRegistration onBackToLogin={() => setShowRegistration(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img
              src="https://new.elimu.ca/wp-content/uploads/2020/07/logo-2.png"
              alt="Elimu Logo"
              style={{ maxHeight: '60px' }}
            />
          </div>
          <h3 className="tracking-tight text-2xl font-bold bg-gradient-to-r from-organization-blue to-organization-maroon bg-clip-text text-transparent">
            Digital Requisition System
          </h3>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                placeholder="Enter your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-organization-blue hover:bg-organization-blue/90"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Button
                onClick={() => setShowRegistration(true)}
                variant="link"
                className="text-organization-blue hover:text-organization-blue/80"
                disabled={isLoading}
              >
                Register as Staff Member
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
