
import React, { useState, useCallback, memo } from 'react';
import { Requisition } from '@/types/requisition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitions } from '@/hooks/useRequisitions';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Download, Trash2 } from 'lucide-react';
import { generateRequisitionPDF } from '@/utils/pdfGenerator';

interface RequisitionCardProps {
  requisition: Requisition;
  showDelete?: boolean;
  // When true, hides authorize/approve/reject controls regardless of user role/status
  disableActions?: boolean;
}

const RequisitionCard: React.FC<RequisitionCardProps> = memo(({ requisition, showDelete = false, disableActions = false }) => {
  const { user } = useAuth();
  const { updateRequisitionStatus, deleteRequisition } = useRequisitions();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'authorized': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'authorized': return <FileText className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const canTakeAction = () => {
    if (disableActions) return false;
    return (
      (user?.roles?.includes('authoriser') && requisition.status === 'pending') ||
      (user?.roles?.includes('approver') && requisition.status === 'authorized')
    );
  };

  const handleApprove = useCallback(() => {
    const newStatus = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authorized' : 'approved';
    const actionRole = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authoriser' : 'approver';
    updateRequisitionStatus(requisition.id, newStatus, notes, user?.id, actionRole);
    
    toast({
      title: "Action Completed",
      description: `Requisition ${requisition.id} has been ${newStatus}.`
    });
    
    setShowActions(false);
    setNotes('');
  }, [user, requisition.status, requisition.id, notes, updateRequisitionStatus, toast]);

  const handleReject = useCallback(() => {
    const actionRole = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authoriser' : 'approver';
    updateRequisitionStatus(requisition.id, 'rejected', notes, user?.id, actionRole);
    
    toast({
      title: "Requisition Rejected",
      description: `Requisition ${requisition.id} has been rejected.`
    });
    
    setShowActions(false);
    setNotes('');
  }, [user, requisition.status, requisition.id, notes, updateRequisitionStatus, toast]);

  const handleDownload = useCallback(async () => {
    try {
      // Determine user role for PDF generation
      const userRole = user?.roles?.[0]; // Get the first role (primary role)
      const blob = await generateRequisitionPDF(requisition, undefined, undefined, userRole, user?.id);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `requisition-${requisition.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: `Requisition ${requisition.id} has been downloaded as PDF.`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  }, [requisition, user?.roles, user?.id, toast]);

  const handleDelete = useCallback(() => {
    if (user?.id) {
      deleteRequisition(requisition.id, user.id, user.roles?.includes('admin') ? 'admin' : 'staff');
      toast({
        title: "Requisition Archived",
        description: `Requisition ${requisition.id} has been archived for compliance.`
      });
    }
  }, [user, requisition.id, deleteRequisition, toast]);

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{requisition.id}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {requisition.staffName} • {new Date(requisition.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(requisition.status)} flex items-center gap-1`}>
              {getStatusIcon(requisition.status)}
              {requisition.status.toUpperCase()}
            </Badge>
            <Button onClick={handleDownload} size="sm" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
            {showDelete && user?.roles?.includes('staff') && (
              <Button onClick={handleDelete} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <strong>Activity:</strong> {requisition.activity}
          </div>
          
          <div>
            <strong>Items:</strong>
            <div className="mt-2 space-y-2">
              {requisition.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{item.description}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      (Qty: {item.quantity} × KSH{item.unitPrice})
                    </span>
                  </div>
                  <span className="font-medium">KSH{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <strong>Total Amount:</strong>
            <span className="text-xl font-bold text-green-600">
              KSH{requisition.totalAmount.toFixed(2)}
            </span>
          </div>

          {/* Show feedback to staff members */}
          {user?.roles?.includes('staff') && (requisition.authoriserNotes || requisition.approverNotes) && (
            <div className="space-y-2">
              {requisition.authoriserNotes && (
                <div className="p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <strong className="text-orange-800">Authoriser Feedback:</strong>
                  </div>
                  <p className="text-orange-700">{requisition.authoriserNotes}</p>
                </div>
              )}

              {requisition.approverNotes && (
                <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <strong className="text-blue-800">Approver Feedback:</strong>
                  </div>
                  <p className="text-blue-700">{requisition.approverNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Show notes to non-staff users */}
          {!user?.roles?.includes('staff') && requisition.authoriserNotes && (
            <div className="p-3 bg-blue-50 rounded">
              <strong>Authoriser Notes:</strong>
              <p className="mt-1">{requisition.authoriserNotes}</p>
            </div>
          )}

          {!user?.roles?.includes('staff') && requisition.approverNotes && (
            <div className="p-3 bg-green-50 rounded">
              <strong>Approver Notes:</strong>
              <p className="mt-1">{requisition.approverNotes}</p>
            </div>
          )}

          {canTakeAction() && (
            <div className="pt-4 border-t">
              {!showActions ? (
                <Button onClick={() => setShowActions(true)} className="w-full">
                  Take Action
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any comments or notes..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'Authorize' : 'Approve'}
                    </Button>
                    <Button onClick={handleReject} variant="destructive" className="flex-1">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={() => setShowActions(false)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

RequisitionCard.displayName = 'RequisitionCard';

export default RequisitionCard;
