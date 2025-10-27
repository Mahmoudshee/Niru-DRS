import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitions } from '@/hooks/useRequisitions';
import RequisitionForm from '@/components/requisition/RequisitionForm';
import CollapsibleRequisition from '@/components/ui/collapsible-requisition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchFilter, filterRequisitions } from '@/components/ui/search-filter';
import { FileText, Clock, CheckCircle, XCircle, Download, Edit, Plus, Search } from 'lucide-react';
import { generateRequisitionsZip } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DashboardStatsSkeleton, RequisitionSkeleton } from '@/components/ui/loading-skeleton';
import { Requisition } from '@/types/requisition';

const StaffDashboard = () => {
  const { user } = useAuth();
  const { 
    requisitions,
    loading,
    clearRequisitionHistory, 
    deleteRequisition 
  } = useRequisitions();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized filtered requisitions for better performance
  const { userRequisitions, archivedRequisitions, allUserRequisitions, unliquidatedApproved, stats, filteredRequisitions } = useMemo(() => {
    if (!user?.id) {
      return {
        userRequisitions: [],
        archivedRequisitions: [],
        allUserRequisitions: [],
        unliquidatedApproved: [],
        filteredRequisitions: [],
        stats: { total: 0, pending: 0, authorized: 0, approved: 0, rejected: 0, unliquidated: 0 }
      };
    }

    const userReqs = requisitions.filter(r => r.staffId === user.id && !r.archived);
    const archivedReqs = requisitions.filter(r => r.staffId === user.id && r.archived);
    const allUserReqs = [...userReqs, ...archivedReqs];

    const unliquidated = allUserReqs.filter(r => 
      r.status === 'approved' && (r.liquidation_status === 'not_liquidated' || r.liquidation_status === 'not_applicable' || !r.liquidation_status)
    );

    const calculatedStats = {
      total: allUserReqs.length,
      pending: allUserReqs.filter(r => r.status === 'pending').length,
      authorized: allUserReqs.filter(r => r.status === 'authorized').length,
      approved: allUserReqs.filter(r => r.status === 'approved').length,
      rejected: allUserReqs.filter(r => r.status === 'rejected').length,
      unliquidated: unliquidated.length,
    };

    // Filter requisitions using enhanced search utility
    const filtered = filterRequisitions(userReqs, searchQuery);

    return {
      userRequisitions: userReqs,
      archivedRequisitions: archivedReqs,
      allUserRequisitions: allUserReqs,
      unliquidatedApproved: unliquidated,
      filteredRequisitions: filtered,
      stats: calculatedStats
    };
  }, [requisitions, user?.id, searchQuery]);

  const handleDownloadAll = useCallback(async () => {
    if (!user || allUserRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(allUserRequisitions, `My_Requisitions_${user.name.replace(/\s+/g, '_')}`, 'staff');
      toast({
        title: "Download Complete",
        description: "Your requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDFs. Please try again.",
        variant: "destructive"
      });
    }
  }, [allUserRequisitions, user.name, toast]);

  const handleClearHistory = useCallback(async () => {
    if (!user) return;
    
    // Prevent clearing history when there are unliquidated approved requisitions
    if (unliquidatedApproved.length > 0) {
      toast({
        title: "Cannot Clear History",
        description: "Cannot clear history while you have unliquidated approved requisitions. Contact admin for liquidation approval first.",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm('Are you sure you want to clear your requisition history? This will archive all your requisitions.')) {
      try {
        await clearRequisitionHistory(user.id, user.id, 'staff');
        toast({
          title: "History Cleared",
          description: "Your requisition history has been cleared."
        });
      } catch (error) {
        toast({
          title: "Clear Failed",
          description: "Failed to clear history. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [unliquidatedApproved.length, user.id, clearRequisitionHistory, toast]);

  const handleEditRequisition = useCallback((requisition: Requisition) => {
    // Prevent editing any requisition when there are unliquidated approved requisitions
    if (unliquidatedApproved.length > 0) {
      toast({
        title: "Cannot Edit Requisition",
        description: `You have ${unliquidatedApproved.length} unliquidated approved requisition(s). Please contact admin to mark them as liquidated before editing any requisitions.`,
        variant: "destructive"
      });
      return;
    }
    setEditingRequisition(requisition);
    setShowForm(true);
  }, [unliquidatedApproved.length, toast]);

  const handleFormComplete = useCallback(() => {
    setShowForm(false);
    setEditingRequisition(null);
  }, []);

  const handleCreateNewRequisition = useCallback(() => {
    if (unliquidatedApproved.length > 0) {
      toast({
        title: "Cannot Create Requisition",
        description: `You have ${unliquidatedApproved.length} unliquidated approved requisition(s). Please contact admin to mark them as liquidated before creating new requisitions.`,
        variant: "destructive"
      });
      return;
    }
    setEditingRequisition(null);
    setShowForm(true);
  }, [unliquidatedApproved.length, toast]);

  const handleDeleteRequisition = useCallback(async (requisitionId: string, requisition: Requisition) => {
    if (!user) return;
    
    // Prevent deletion of approved but unliquidated requisitions
    if (requisition.status === 'approved' && 
        (requisition.liquidation_status === 'not_liquidated' || 
         requisition.liquidation_status === 'not_applicable' || 
         !requisition.liquidation_status)) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete approved requisitions until they are liquidated. Contact admin for liquidation approval.",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this requisition? It will be archived and can be viewed by administrators.')) {
      try {
        await deleteRequisition(requisitionId, user.id, 'staff');
        toast({
          title: "Requisition Deleted",
          description: "The requisition has been archived."
        });
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete requisition. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [user.id, deleteRequisition, toast]);

  // Early return AFTER all hooks have been called
  if (!user) return null;

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardStatsSkeleton />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <RequisitionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.authorized}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unliquidated</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unliquidated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liquidation Warning */}
      {unliquidatedApproved.length > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center text-orange-800">
              <p className="font-semibold">⚠️ Liquidation Required</p>
              <p className="text-sm mt-2">
                You have {unliquidatedApproved.length} approved requisition(s) that need liquidation. 
                Contact admin to approve liquidation before creating new requisitions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Requisition Button */}
      <div className="flex justify-center">
        <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
          <Button 
            size="lg" 
            className="bg-organization-blue hover:bg-organization-blue/90"
            onClick={handleCreateNewRequisition}
            disabled={unliquidatedApproved.length > 0}
          >
            <Plus className="h-5 w-5 mr-2" />
            {unliquidatedApproved.length > 0 ? 'Finish Liquidating Your Requisition' : 'Create New Requisition'}
          </Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>
                {editingRequisition ? 'Edit Requisition' : 'New Requisition'}
              </DialogTitle>
              <DialogDescription>
                {editingRequisition ? 'Modify your existing requisition details below.' : 'Fill out the form to create a new requisition.'}
              </DialogDescription>
            </DialogHeader>
            <RequisitionForm 
              editingRequisition={editingRequisition || undefined}
              onComplete={handleFormComplete}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Requisitions List */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-organization-blue">My Requisitions</h2>
        <SearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadAll} 
            size="sm" 
            variant="outline" 
            className="border-organization-maroon text-organization-maroon hover:bg-organization-maroon/10 min-w-[100px] flex-shrink-0"
          >
            <Download className="h-4 w-4 mr-1" />
            Download All
          </Button>
          <Button 
            onClick={handleClearHistory} 
            size="sm" 
            variant="destructive"
            disabled={unliquidatedApproved.length > 0}
            title={unliquidatedApproved.length > 0 ? "Cannot clear history while you have unliquidated approved requisitions" : "Clear all requisition history"}
            className="min-w-[100px] flex-shrink-0"
          >
            Clear History
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredRequisitions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchQuery ? 'No requisitions match your search.' : 'No requisitions submitted yet. Click "Create New Requisition" to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequisitions.map((requisition) => (
            <div key={requisition.id} className="relative group">
              <CollapsibleRequisition 
                requisition={requisition} 
                showDelete={!(requisition.status === 'approved' && 
                            (requisition.liquidation_status === 'not_liquidated' || 
                             requisition.liquidation_status === 'not_applicable' || 
                             !requisition.liquidation_status))}
                onDelete={() => handleDeleteRequisition(requisition.id, requisition)}
                disableActions
              />
              {/* Only show edit button if no unliquidated requisitions exist and current requisition is not frozen */}
              {unliquidatedApproved.length === 0 && 
               !(requisition.status === 'approved' && 
                (requisition.liquidation_status === 'not_liquidated' || 
                 requisition.liquidation_status === 'not_applicable' || 
                 !requisition.liquidation_status)) && (
                <Button
                  onClick={() => handleEditRequisition(requisition)}
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white shadow-sm"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;