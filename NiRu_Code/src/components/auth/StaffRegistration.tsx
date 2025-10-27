
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StaffRegistrationProps {
  onBackToLogin?: () => void;
}

const StaffRegistration = ({ onBackToLogin }: StaffRegistrationProps) => {
  const { toast } = useToast();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check password length first
    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please login to continue."
      });
      // Reset form
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      // Redirect to login instead of auto-logging in
      if (onBackToLogin) {
        onBackToLogin();
      }
    } else {
      toast({
        title: "Registration Failed",
        description: result.error || "Registration failed. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
    <Card className="w-full min-w-[320px] min-h-[500px] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-lg mx-4 sm:mx-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-organization-blue to-organization-maroon bg-clip-text text-transparent">
          Staff Registration
        </CardTitle>
        <p className="text-muted-foreground">Create your account</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email address"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create a password"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-organization-blue to-organization-maroon hover:from-organization-blue/90 hover:to-organization-maroon/90 text-white font-semibold"
          >
            Register
          </Button>
        </form>
        
        <div className="mt-6 space-y-4">
          <div className="text-center">
            {onBackToLogin && (
              <Button
                onClick={onBackToLogin}
                variant="link"
                className="text-organization-blue hover:text-organization-blue/80"
              >
                Back to Login
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

};

export default StaffRegistration;
