import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitions } from '@/hooks/useRequisitions';
import CollapsibleRequisition from '@/components/ui/collapsible-requisition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Download, ChevronUp, ChevronDown, Archive, FileText, Trash2 } from 'lucide-react';
import { generateRequisitionsZip } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Requisition } from '@/types/requisition';
import { SearchFilter, filterRequisitions } from '@/components/ui/search-filter';

const ApproverDashboard = () => {
  const { user } = useAuth();
  const { getRequisitionsByRole, getDatabaseCounts, deleteRequisition } = useRequisitions();
  const { toast } = useToast();
  const [showApproved, setShowApproved] = React.useState(false);
  const [showRejected, setShowRejected] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hiddenItems, setHiddenItems] = React.useState<Set<string>>(new Set());
  const [databaseStats, setDatabaseStats] = React.useState({
    totalRequisitions: 0,
    totalAuditLogs: 0,
    requisitionsData: [],
    auditLogsData: []
  });

  // Load user's hidden items on mount
  React.useEffect(() => {
    const loadHiddenItems = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('user_hidden_requisitions')
        .select('requisition_id')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setHiddenItems(new Set(data.map(item => item.requisition_id)));
      }
    };
    
    loadHiddenItems();
  }, [user?.id]);
  
  // Fetch data directly from database
  React.useEffect(() => {
    const fetchDatabaseStats = async () => {
      const stats = await getDatabaseCounts();
      setDatabaseStats(stats);
    };
    
    fetchDatabaseStats();
    
    // Set up a refresh interval as backup for real-time updates
    const interval = setInterval(fetchDatabaseStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [getDatabaseCounts]);

  // Set up real-time subscription for instant updates
  React.useEffect(() => {
    const channel = supabase
      .channel('dashboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requisitions'
        },
        () => {
          // Immediately refresh stats when any requisition changes
          getDatabaseCounts().then(setDatabaseStats);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getDatabaseCounts]);
  
  // Get requisitions based on approver role from database data  
  // Approvers should only see:
  // 1. Authorized requisitions (need action)
  // 2. Optionally show approved/rejected for reference (toggle view)
  const authorizedRequisitions = React.useMemo(() => {
    const authorized = databaseStats.requisitionsData.filter(req => req.status === 'authorized' && !req.archived);
    return filterRequisitions(authorized, searchQuery);
  }, [databaseStats.requisitionsData, searchQuery]);
  
  const approvedRequisitions = databaseStats.requisitionsData.filter(req => req.status === 'approved' && !req.archived);
  const rejectedRequisitions = databaseStats.requisitionsData.filter(req => req.status === 'rejected' && !req.archived);
  const archivedRequisitions = databaseStats.requisitionsData.filter(req => req.archived && !hiddenItems.has(req.id));
  
  // For downloads and reference - include all processed requisitions
  const allApproverRequisitions = databaseStats.requisitionsData.filter(req => ['authorized', 'approved', 'rejected'].includes(req.status));

  const handleDownloadAuthorized = async () => {
    if (authorizedRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No authorized requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(authorizedRequisitions, 'Authorized_Requisitions_Approver_View', 'approver');
      toast({
        title: "Download Complete",
        description: "Authorized requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadApproved = async () => {
    if (approvedRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No approved requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(approvedRequisitions, 'Approved_Requisitions_Approver_View', 'approver');
      toast({
        title: "Download Complete",
        description: "Approved requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadRejected = async () => {
    if (rejectedRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No rejected requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(rejectedRequisitions, 'Rejected_Requisitions_Approver_View', 'approver');
      toast({
        title: "Download Complete",
        description: "Rejected requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadArchived = async () => {
    if (archivedRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No archived requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(archivedRequisitions, 'Archived_Requisitions_Approver_View', 'approver');
      toast({
        title: "Download Complete",
        description: "Archived requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = async () => {
    if (allApproverRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(allApproverRequisitions, 'All_Requisitions_Approver_View', 'approver');
      toast({
        title: "Download Complete",
        description: "All requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Hide from view handlers (soft delete for archived items)
  const handleHideItem = async (id: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('user_hidden_requisitions')
      .insert({ user_id: user.id, requisition_id: id });
    
    if (!error) {
      setHiddenItems(prev => new Set([...prev, id]));
      toast({
        title: "Success",
        description: "Requisition removed from view successfully."
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to remove requisition from view.",
        variant: "destructive"
      });
    }
  };

  const handleHideAll = async () => {
    if (!user?.id) return;
    
    const allArchivedIds = archivedRequisitions.map(req => req.id);
    const insertData = allArchivedIds.map(id => ({
      user_id: user.id,
      requisition_id: id
    }));
    
    const { error } = await supabase
      .from('user_hidden_requisitions')
      .insert(insertData);
    
    if (!error) {
      setHiddenItems(prev => new Set([...prev, ...allArchivedIds]));
      toast({
        title: "Success",
        description: "All archived requisitions removed from view."
      });
    } else {
      toast({
        title: "Error", 
        description: "Failed to remove requisitions from view.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{authorizedRequisitions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedRequisitions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rejectedRequisitions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{archivedRequisitions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-organization-blue">Approver Dashboard</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <SearchFilter 
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-64"
          />
          <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setShowApproved(!showApproved)} 
            size="sm" 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50 min-w-[110px] flex-shrink-0"
          >
            {showApproved ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showApproved ? 'Hide' : 'Show'} Approved
          </Button>
          <Button 
            onClick={() => setShowRejected(!showRejected)} 
            size="sm" 
            variant="outline" 
            className="border-red-600 text-red-600 hover:bg-red-50 min-w-[110px] flex-shrink-0"
          >
            {showRejected ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showRejected ? 'Hide' : 'Show'} Rejected
          </Button>
          <Button 
            onClick={() => setShowArchived(!showArchived)} 
            size="sm" 
            variant="outline" 
            className="border-gray-600 text-gray-600 hover:bg-gray-50 min-w-[110px] flex-shrink-0"
          >
            {showArchived ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>
          <Button 
            onClick={handleDownloadAll} 
            size="sm" 
            variant="outline"
            className="border-organization-blue text-organization-blue hover:bg-organization-blue/10 min-w-[100px] flex-shrink-0"
          >
            <Download className="h-4 w-4 mr-1" />
            Download All
          </Button>
          </div>
        </div>
      </div>

      {/* Authorized Requisitions Awaiting Final Approval */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-organization-blue flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Authorized Requisitions Awaiting Final Approval ({authorizedRequisitions.length})
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {authorizedRequisitions.map((requisition: Requisition) => (
            <CollapsibleRequisition 
              key={requisition.id} 
              requisition={requisition} 
            />
          ))}
          {authorizedRequisitions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No requisitions awaiting final approval.
            </p>
          )}
        </div>
      </div>

      {/* Approved Requisitions - Toggle */}
      {showApproved && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-organization-blue flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approved Requisitions ({approvedRequisitions.length})
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadApproved} 
                size="sm" 
                variant="outline"
                disabled={approvedRequisitions.length === 0}
                className="border-green-600 text-green-600 hover:bg-green-50 min-w-[100px] flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Download All
              </Button>
              <Button 
                onClick={() => setShowApproved(false)} 
                size="sm" 
                variant="outline"
                className="min-w-[60px] flex-shrink-0"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {approvedRequisitions.map((requisition: Requisition) => (
              <CollapsibleRequisition 
                key={requisition.id} 
                requisition={requisition} 
              />
            ))}
            {approvedRequisitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No approved requisitions found.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rejected Requisitions - Toggle */}
      {showRejected && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-organization-blue flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Rejected Requisitions ({rejectedRequisitions.length})
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadRejected} 
                size="sm" 
                variant="outline"
                disabled={rejectedRequisitions.length === 0}
                className="border-red-600 text-red-600 hover:bg-red-50 min-w-[100px] flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Download All
              </Button>
              <Button 
                onClick={() => setShowRejected(false)} 
                size="sm" 
                variant="outline"
                className="min-w-[60px] flex-shrink-0"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rejectedRequisitions.map((requisition: Requisition) => (
              <CollapsibleRequisition 
                key={requisition.id} 
                requisition={requisition} 
              />
            ))}
            {rejectedRequisitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No rejected requisitions found.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Archived Requisitions - Toggle */}
      {showArchived && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-organization-blue flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Requisitions ({archivedRequisitions.length})
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadArchived} 
                size="sm" 
                variant="outline"
                disabled={archivedRequisitions.length === 0}
                className="border-gray-600 text-gray-600 hover:bg-gray-50 min-w-[100px] flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Download All
              </Button>
              <Button 
                onClick={handleHideAll} 
                size="sm" 
                variant="destructive"
                disabled={archivedRequisitions.length === 0}
                className="min-w-[100px] flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete All
              </Button>
              <Button 
                onClick={() => setShowArchived(false)} 
                size="sm" 
                variant="outline"
                className="min-w-[60px] flex-shrink-0"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {archivedRequisitions.map((requisition: Requisition) => (
              <CollapsibleRequisition 
                key={requisition.id} 
                requisition={requisition} 
                showDelete={true}
                onDelete={() => handleHideItem(requisition.id)}
              />
            ))}
            {archivedRequisitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No archived requisitions found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproverDashboard;