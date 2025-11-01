import React, { useState } from 'react';
import { Requisition } from '@/types/requisition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitions } from '@/hooks/useRequisitions';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertCircle, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  DollarSign 
} from 'lucide-react';
import { generateRequisitionPDF } from '@/utils/pdfGenerator';
import ApprovalAssistant from '@/components/ai/ApprovalAssistant';

interface CollapsibleRequisitionProps {
  requisition: Requisition;
  showDelete?: boolean;
  onDelete?: () => void;
  onToggleLiquidation?: () => void;
  // When true, hides authorize/approve/reject controls regardless of user role/status
  disableActions?: boolean;
}

const CollapsibleRequisition: React.FC<CollapsibleRequisitionProps> = ({ 
  requisition, 
  showDelete = false, 
  onDelete,
  onToggleLiquidation,
  disableActions = false
}) => {
  const { user } = useAuth();
  const { updateRequisitionStatus, deleteRequisition } = useRequisitions();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'authorized': return 'bg-organization-blue/20 text-organization-blue';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-organization-maroon/20 text-organization-maroon';
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

  const getLiquidationStatusColor = (status: string) => {
    switch (status) {
      case 'liquidated': return 'bg-green-100 text-green-800 border-green-200';
      case 'not_liquidated': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'not_applicable': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canTakeAction = () => {
    if (disableActions) return false;
    
    // Prevent users from acting on their own requisitions
    if (user?.id && requisition.staffId === user.id) {
      return false;
    }
    
    return (
      (user?.roles?.includes('authoriser') && requisition.status === 'pending') ||
      (user?.roles?.includes('approver') && requisition.status === 'authorized')
    );
  };

  const handleApprove = () => {
    const newStatus = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authorized' : 'approved';
    const actionRole = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authoriser' : 'approver';
    updateRequisitionStatus(requisition.id, newStatus, notes, user?.id, actionRole);
    
    toast({
      title: "Action Completed",
      description: `Requisition ${requisition.id} has been ${newStatus}.`
    });
    
    setShowActions(false);
    setNotes('');
  };

  const handleReject = () => {
    const actionRole = user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'authoriser' : 'approver';
    updateRequisitionStatus(requisition.id, 'rejected', notes, user?.id, actionRole);
    
    toast({
      title: "Requisition Rejected",
      description: `Requisition ${requisition.id} has been rejected.`
    });
    
    setShowActions(false);
    setNotes('');
  };

  const handleDownload = async () => {
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
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else if (user?.id) {
      deleteRequisition(requisition.id, user.id, user.roles?.includes('admin') ? 'admin' : 'staff');
      toast({
        title: "Requisition Archived",
        description: `Requisition ${requisition.id} has been archived for compliance.`
      });
    }
  };

  return (
    <Card className="mb-2 border-organization-blue/20">
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-organization-blue/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-organization-blue">{requisition.id}</h3>
              <p className="text-sm text-muted-foreground">
                {requisition.staffName} • {new Date(requisition.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${getStatusColor(requisition.status)} flex items-center gap-1`}>
              {getStatusIcon(requisition.status)}
              {requisition.status.toUpperCase()}
            </Badge>
            
            {requisition.status === 'approved' && (
              <Badge 
                className={`${getLiquidationStatusColor(requisition.liquidation_status || 'not_applicable')} flex items-center gap-1 cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLiquidation?.();
                }}
              >
                <DollarSign className="h-3 w-3" />
                {requisition.liquidation_status === 'liquidated' ? 'LIQUIDATED' : 'UNLIQUIDATED'}
              </Badge>
            )}
            
            <span className="font-semibold text-organization-maroon">
              KSH{requisition.totalAmount.toFixed(2)}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <strong>Activity:</strong> {requisition.activity}
            </div>

            {/* Liquidation Information */}
            {requisition.status === 'approved' && requisition.liquidation_status && (
              <div className="p-3 rounded border-l-4 border-orange-400 bg-orange-50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <strong className="text-orange-800">Liquidation Status:</strong>
                </div>
                <p className="text-orange-700">
                  {requisition.liquidation_status === 'liquidated' 
                    ? `Liquidated on ${requisition.liquidatedat ? new Date(requisition.liquidatedat).toLocaleDateString() : 'Unknown date'}${requisition.liquidatedby ? ` by ${requisition.liquidatedby}` : ''}`
                    : 'Not yet liquidated - contact admin to mark as liquidated'
                  }
                </p>
              </div>
            )}
            
            <div>
              <strong>Items:</strong>
              <div className="mt-2 space-y-2">
                {requisition.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-organization-blue/5 rounded">
                    <div>
                      <span className="font-medium">{item.description}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (Qty: {item.quantity} × KSH{item.unitPrice})
                      </span>
                    </div>
                    <span className="font-medium">KSH{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Documents */}
            {(requisition.documentUrls || requisition.documentUrl) && (
              <div className="p-3 rounded border-l-4 border-organization-blue bg-organization-blue/5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-organization-blue" />
                  <strong className="text-organization-blue">
                    {(() => {
                      try {
                        const urls = requisition.documentUrls ? JSON.parse(requisition.documentUrls) : [];
                        return urls.length > 1 ? 'Attached Documents:' : 'Attached Document:';
                      } catch {
                        return 'Attached Document:';
                      }
                    })()}
                  </strong>
                </div>
                <div className="space-y-2">
                  {(() => {
                    try {
                      const urls = requisition.documentUrls ? JSON.parse(requisition.documentUrls) : [requisition.documentUrl];
                      const names = requisition.documentNames ? JSON.parse(requisition.documentNames) : [requisition.documentName || 'View Document'];
                      
                      return urls.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-organization-blue/30 rounded-md hover:bg-organization-blue/10 transition-colors text-organization-blue hover:text-organization-blue mr-2 mb-2"
                        >
                          <FileText className="h-4 w-4" />
                          {names[idx] || `Document ${idx + 1}`}
                        </a>
                      ));
                    } catch (error) {
                      // Fallback to single document display
                      return (
                        <a
                          href={requisition.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-organization-blue/30 rounded-md hover:bg-organization-blue/10 transition-colors text-organization-blue hover:text-organization-blue"
                        >
                          <FileText className="h-4 w-4" />
                          {requisition.documentName || 'View Document'}
                        </a>
                      );
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {/* Only show download button for staff if requisition is not frozen */}
              {!(user?.roles?.includes('staff') && requisition.status === 'approved' && 
                (requisition.liquidation_status === 'not_liquidated' || 
                 requisition.liquidation_status === 'not_applicable' || 
                 !requisition.liquidation_status)) && (
                <Button onClick={handleDownload} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              {showDelete && (
                <Button onClick={handleDelete} size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  {user?.roles?.includes('admin') ? 'Permanently Delete' : 'Delete'}
                </Button>
              )}
              {onToggleLiquidation && requisition.status === 'approved' && user?.roles?.includes('admin') && (
                <Button 
                  onClick={onToggleLiquidation} 
                  size="sm" 
                  variant="outline"
                  className="border-orange-500 text-orange-700 hover:bg-orange-50"
                  title="Toggle Liquidation Status"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Toggle Liquidation
                </Button>
              )}
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
                  <div className="p-3 bg-organization-blue/10 rounded border-l-4 border-organization-blue">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-organization-blue" />
                      <strong className="text-organization-blue">Approver Feedback:</strong>
                    </div>
                    <p className="text-organization-blue">{requisition.approverNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Show notes to non-staff users */}
            {!user?.roles?.includes('staff') && requisition.authoriserNotes && (
              <div className="p-3 bg-organization-blue/10 rounded">
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

            {/* AI Approval Assistant - Show for approvers viewing authorized requisitions */}
            {user?.roles?.includes('approver') && requisition.status === 'authorized' && (
              <div className="pt-2">
                <ApprovalAssistant requisition={requisition} />
              </div>
            )}

            {/* Action Buttons - Show for approvers and authorisers */}
            {canTakeAction() && (
              <div className="pt-4 border-t space-y-3">
                <div className="text-sm text-muted-foreground">
                  {user?.roles?.includes('approver') && requisition.status === 'authorized' 
                    ? 'Review the AI suggestion above, then make your decision:'
                    : 'Add notes and take action:'}
                </div>
                {!showActions ? (
                  <Button onClick={() => setShowActions(true)} className="w-full bg-organization-blue hover:bg-organization-blue/90">
                    <CheckCircle className="h-4 w-4 mr-2" />
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
                        placeholder="Add any comments or notes based on AI suggestion..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleApprove} className="flex-1 bg-organization-blue hover:bg-organization-blue/90">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {user?.roles?.includes('authoriser') && requisition.status === 'pending' ? 'Authorize' : 'Approve'}
                      </Button>
                      <Button onClick={handleReject} className="flex-1 bg-organization-maroon hover:bg-organization-maroon/90 text-white">
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
      )}
    </Card>
  );
};

export default CollapsibleRequisition;