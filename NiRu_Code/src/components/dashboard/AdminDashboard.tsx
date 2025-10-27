import React from 'react';
import { useRequisitions } from '@/hooks/useRequisitions';
import CollapsibleRequisition from '@/components/ui/collapsible-requisition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, XCircle, Download, Cloud } from 'lucide-react';
import { generateRequisitionsSummaryPDF, generateRequisitionsZip } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SearchFilter, filterRequisitions } from '@/components/ui/search-filter';

const AdminDashboard = () => {
  const { 
    permanentlyDeleteFromDatabase, 
    permanentlyDeleteAllArchived, 
    getDatabaseCounts, 
    updateLiquidationStatus 
  } = useRequisitions();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [databaseStats, setDatabaseStats] = React.useState({
    totalRequisitions: 0,
    totalAuditLogs: 0,
    requisitionsData: [],
    auditLogsData: []
  });
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  
  // Fetch data directly from database
  React.useEffect(() => {
    const fetchDatabaseStats = async () => {
      const stats = await getDatabaseCounts();
      setDatabaseStats(stats);
    };
    fetchDatabaseStats();
    
    // Refresh data every 5 seconds for real-time updates
    const interval = setInterval(fetchDatabaseStats, 5000);
    return () => clearInterval(interval);
  }, [getDatabaseCounts]);

  // Use database data directly instead of local state
  const activeRequisitions = databaseStats.requisitionsData.filter(r => !r.archived);
  const archivedRequisitions = databaseStats.requisitionsData.filter(r => r.archived);
  const allRequisitions = databaseStats.requisitionsData;
  
  // Filter requisitions using enhanced search utility
  const filteredRequisitions = React.useMemo(() => {
    const requisitionsToFilter = showArchived ? archivedRequisitions : allRequisitions;
    return filterRequisitions(requisitionsToFilter, searchQuery);
  }, [showArchived, archivedRequisitions, allRequisitions, searchQuery]);
  
  const stats = {
    total: databaseStats.totalRequisitions,
    active: activeRequisitions.length,
    archived: archivedRequisitions.length,
    pending: allRequisitions.filter(r => r.status === 'pending').length,
    authorized: allRequisitions.filter(r => r.status === 'authorized').length,
    approved: allRequisitions.filter(r => r.status === 'approved').length,
    rejected: allRequisitions.filter(r => r.status === 'rejected').length,
    unliquidated: allRequisitions.filter(r => r.status === 'approved' && r.liquidation_status === 'not_liquidated').length,
  };

  const handleDownloadAll = async () => {
    if (databaseStats.requisitionsData.length === 0) {
      toast({
        title: "No Data",
        description: "No requisitions to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(databaseStats.requisitionsData, 'All_DB_Requisitions', 'admin');
      toast({
        title: "Download Complete",
        description: "All requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate zip file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadByStatus = async (status: string) => {
    const filteredRequisitions = allRequisitions.filter(r => r.status === status && !r.archived);
    if (filteredRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: `No ${status} requisitions to download.`,
        variant: "destructive"
      });
      return;
    }

    try {
      await generateRequisitionsZip(filteredRequisitions, `${status.toUpperCase()}_Requisitions`, 'admin');
      toast({
        title: "Download Complete",
        description: `${status.toUpperCase()} requisitions have been downloaded as individual PDFs in a zip file.`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate zip file. Please try again.",
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
      await generateRequisitionsZip(archivedRequisitions, 'Archived_Requisitions', 'admin');
      toast({
        title: "Download Complete",
        description: "Archived requisitions have been downloaded as individual PDFs in a zip file."
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate zip file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this requisition? This action cannot be undone.')) {
      try {
        await permanentlyDeleteFromDatabase(id, 'admin');
        toast({
          title: "Deleted",
          description: "Requisition permanently deleted from system."
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
  };

  const handleDeleteAllArchived = async () => {
    if (window.confirm('Are you sure you want to permanently delete ALL archived requisitions? This action cannot be undone.')) {
      try {
        await permanentlyDeleteAllArchived('admin');
        toast({
          title: "Deleted",
          description: "All archived requisitions permanently deleted from system."
        });
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete archived requisitions. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleLiquidation = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'liquidated' ? 'not_liquidated' : 'liquidated';
    try {
      await updateLiquidationStatus(id, newStatus, 'admin', 'admin');
      toast({
        title: "Liquidation Status Updated",
        description: `Requisition ${id} marked as ${newStatus}.`
      });
    } catch (error) {
      console.error('Liquidation update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update liquidation status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBackupToGoogleDrive = async () => {
    setIsBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-to-drive');
      
      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "Backup Successful",
          description: `Backup completed! ${data.backup_stats.requisitions_count} requisitions and ${data.backup_stats.audit_logs_count} audit logs backed up to Google Drive.`,
        });
      } else {
        throw new Error(data?.error || 'Backup failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to backup to Google Drive. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Show all requisitions when not showing archived, show only archived when showing archived
  const currentRequisitions = showArchived ? archivedRequisitions : allRequisitions;

  return (
    <div className="space-y-6">
      {/* ... keep existing code (stats cards section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">All Requisitions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Authorized</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.authorized}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Archived</CardTitle>
            <XCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.archived}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unliquidated</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.unliquidated}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-organization-blue">
            {showArchived ? 'Archived Requisitions' : 'All Requisitions'}
          </h2>
          <Button 
            onClick={() => setShowArchived(!showArchived)} 
            variant="outline" 
            size="sm"
            className="border-organization-blue text-organization-blue hover:bg-organization-blue/10"
          >
            {showArchived ? 'Show All' : 'Show Archived'}
          </Button>
        </div>
        <SearchFilter 
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
        <div className="flex gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
          <Button 
            onClick={handleBackupToGoogleDrive} 
            size="sm" 
            variant="outline" 
            disabled={isBackingUp}
            className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm min-w-[100px] flex-shrink-0"
          >
            <Cloud className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {isBackingUp ? 'Backing up...' : 'Backup to Drive'}
          </Button>
          {showArchived ? (
            <>
              <Button 
                onClick={handleDownloadArchived} 
                size="sm" 
                variant="outline" 
                className="border-organization-maroon text-organization-maroon hover:bg-organization-maroon/10 text-xs sm:text-sm min-w-[120px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Download Archived
              </Button>
              <Button 
                onClick={handleDeleteAllArchived} 
                size="sm" 
                variant="destructive"
                className="text-xs sm:text-sm min-w-[120px] flex-shrink-0"
              >
                Delete All Archived
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleDownloadAll} 
                size="sm" 
                variant="outline" 
                className="border-organization-maroon text-organization-maroon hover:bg-organization-maroon/10 text-xs sm:text-sm min-w-[100px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Download All DB
              </Button>
              <Button 
                onClick={handleDownloadArchived} 
                size="sm" 
                variant="outline" 
                className="border-organization-maroon text-organization-maroon hover:bg-organization-maroon/10 text-xs sm:text-sm min-w-[120px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Download Archived
              </Button>
              <Button 
                onClick={() => handleDownloadByStatus('pending')} 
                size="sm" 
                variant="outline" 
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm min-w-[80px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Pending
              </Button>
              <Button 
                onClick={() => handleDownloadByStatus('authorized')} 
                size="sm" 
                variant="outline" 
                className="border-organization-blue text-organization-blue hover:bg-organization-blue/10 text-xs sm:text-sm min-w-[70px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Auth
              </Button>
              <Button 
                onClick={() => handleDownloadByStatus('approved')} 
                size="sm" 
                variant="outline" 
                className="border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm min-w-[90px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Approved
              </Button>
              <Button 
                onClick={() => handleDownloadByStatus('rejected')} 
                size="sm" 
                variant="outline" 
                className="border-red-600 text-red-600 hover:bg-red-50 text-xs sm:text-sm min-w-[80px] flex-shrink-0"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Rejected
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
        {filteredRequisitions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchQuery ? 'No requisitions match your search.' : (showArchived ? 'No archived requisitions.' : 'No requisitions in the system yet.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequisitions.map((requisition) => (
            <CollapsibleRequisition 
              key={requisition.id} 
              requisition={requisition} 
              showDelete={true}
              onDelete={() => handlePermanentDelete(requisition.id)}
              onToggleLiquidation={requisition.status === 'approved' ? 
                () => handleToggleLiquidation(requisition.id, requisition.liquidation_status || 'not_liquidated') : 
                undefined
              }
              disableActions
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
