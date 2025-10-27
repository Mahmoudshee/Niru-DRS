
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Requisition, AuditLog } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';
import { emailService } from '@/services/emailService';

export const useRequisitions = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch requisitions from Supabase
  const fetchRequisitions = async (includeArchived = false) => {
    try {
      let query = supabase
        .from('requisitions')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (!includeArchived) {
        query = query.eq('archived', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching requisitions:', error);
        setLoading(false);
        return;
      }
      
      // Transform the data to match our Requisition type
      const transformedData = data?.map((row: any) => ({
        ...row,
        items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items) : [])
      })) || [];
      
      setRequisitions(transformedData as Requisition[]);
    } catch (error) {
      console.error('Error in fetchRequisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add audit log entry
  const addAuditLog = useCallback(async (auditLog: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const logEntry: AuditLog = {
      ...auditLog,
      id: `AUDIT-${String(Date.now()).slice(-6)}`,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([logEntry]);

    if (error) {
      console.error('Error saving audit log:', error);
    }
  }, []);

  useEffect(() => {
    fetchRequisitions(false); // Don't include archived by default
    
    // Set up enhanced real-time subscriptions with better error handling
    const channel = supabase
      .channel('requisitions_realtime_' + Math.random(), { 
        config: { 
          broadcast: { self: true },
          presence: { key: 'user-' + Math.random() }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requisitions'
        },
        (payload) => {
          console.log('🆕 New requisition received:', payload.new);
          try {
            const newReq = {
              ...payload.new,
              items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items
            } as Requisition;
            setRequisitions(prev => {
              // Check if already exists to prevent duplicates
              if (prev.some(req => req.id === newReq.id)) {
                return prev;
              }
              return [newReq, ...prev];
            });
          } catch (error) {
            console.error('Error processing new requisition:', error);
            // Fallback to refetch
            fetchRequisitions(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requisitions'
        },
        (payload) => {
          console.log('🔄 Updated requisition received:', payload.new);
          console.log('🔄 Previous state:', payload.old);
          console.log('🔄 Status change:', payload.old?.status, '->', payload.new?.status);
          try {
            const updatedReq = {
              ...payload.new,
              items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items
            } as Requisition;
            setRequisitions(prev => {
              // If the requisition was archived, remove it from the list
              if ((payload.new as any).archived) {
                console.log('🗃️ Removing archived requisition from state');
                return prev.filter(req => req.id !== (payload.new as any).id);
              }
              
              const updated = prev.map(req => 
                req.id === (payload.new as any).id ? updatedReq : req
              );
              // If not found, might need to add it (edge case)
              if (!prev.some(req => req.id === (payload.new as any).id)) {
                console.log('🆕 Adding previously unseen requisition to state');
                return [updatedReq, ...prev];
              }
              console.log('✅ Successfully updated requisition in state');
              return updated;
            });
          } catch (error) {
            console.error('Error processing updated requisition:', error);
            // Fallback to refetch
            fetchRequisitions(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'requisitions'
        },
        (payload) => {
          console.log('🗑️ Deleted requisition received:', payload.old);
          setRequisitions(prev => prev.filter(req => req.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time updates are now active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time connection failed, will retry...');
          // Retry connection after a delay
          setTimeout(() => {
            fetchRequisitions(false);
          }, 2000);
        }
      });
    
    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const addRequisition = async (requisition: Omit<Requisition, 'id' | 'createdAt' | 'archived'>) => {
    // Check for unliquidated approved requisitions for this staff member
    const { data: existingRequisitions, error: checkError } = await supabase
      .from('requisitions')
      .select('*')
      .eq('staffId', requisition.staffId)
      .eq('status', 'approved')
      .eq('liquidation_status', 'not_liquidated')
      .eq('archived', false);

    if (checkError) {
      console.error('Error checking existing requisitions:', checkError);
      throw new Error('Failed to validate existing requisitions');
    }

    if (existingRequisitions && existingRequisitions.length > 0) {
      throw new Error('Cannot create new requisition. You have unliquidated approved requisitions. Please contact admin for assistance.');
    }

    const newRequisition: Requisition = {
      ...requisition,
      id: `REQ-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      archived: false
    };
    
    // Transform items to JSON for database storage
    const dbData = {
      ...newRequisition,
      items: JSON.stringify(newRequisition.items)
    };
    
    // Save to Supabase (real-time will handle local state update)
    const { error } = await supabase
      .from('requisitions')
      .insert([dbData as any]);
    
    if (error) {
      console.error('Error saving requisition:', error);
      return null;
    }

    // Add audit log
    await addAuditLog({
      requisitionId: newRequisition.id,
      action: 'created',
      performedBy: newRequisition.staffId,
      performedByRole: 'staff',
      notes: `Requisition created for ${newRequisition.activity}`
    });
    
    // Send email notification to authorizers using EmailJS
    await emailService.sendRequisitionNotification('submitted', {
      id: newRequisition.id,
      staffId: newRequisition.staffId,
      staffName: newRequisition.staffName,
      activity: newRequisition.activity,
      totalAmount: newRequisition.totalAmount
    });
    
    return newRequisition;
  };

  const updateRequisitionStatus = async (
    id: string, 
    status: Requisition['status'], 
    notes?: string,
    performedBy?: string,
    performedByRole?: 'staff' | 'authoriser' | 'approver' | 'admin'
  ) => {
    const requisition = requisitions.find(req => req.id === id);
    if (!requisition) return;

    const updated: Partial<Requisition> = { status };
    
    if (status === 'authorized') {
      updated.authorizedAt = new Date().toISOString();
      updated.authoriserNotes = notes;
    } else if (status === 'approved') {
      updated.approvedAt = new Date().toISOString();
      updated.approverNotes = notes;
    } else if (status === 'rejected') {
      if (requisition.status === 'pending') {
        // Rejected by authoriser
        updated.authorizedAt = new Date().toISOString();
        updated.authoriserNotes = notes;
      } else {
        // Rejected by approver (requisition was already authorized)
        updated.approvedAt = new Date().toISOString();
        updated.approverNotes = notes;
      }
    }

    // Update in Supabase (real-time will handle local state update)
    const { error } = await supabase
      .from('requisitions')  
      .update(updated as any)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating requisition:', error);
      return;
    }

    // Add audit log
    await addAuditLog({
      requisitionId: id,
      action: status as any,
      performedBy: performedBy || 'system',
      performedByRole: performedByRole || 'admin',
      previousValue: requisition.status,
      newValue: status,
      notes: notes || `Status changed from ${requisition.status} to ${status}`
    });

    // Send notifications using EmailJS
    const requisitionDetails = {
      id: requisition.id,
      staffId: requisition.staffId || '',
      staffName: requisition.staffName || 'Unknown',
      activity: requisition.activity || 'Unknown Activity',
      totalAmount: requisition.totalAmount || 0
    };

    console.log(`📧 Sending notification for status: ${status}, role: ${performedByRole}`);

    if (status === 'authorized') {
      await emailService.sendRequisitionNotification('authorized', requisitionDetails);
    } else if (status === 'approved') {
      await emailService.sendRequisitionNotification('approved', requisitionDetails);
    } else if (status === 'rejected') {
      const performedByRole = requisition.status === 'pending' ? 'authoriser' : 'approver';
      await emailService.sendRequisitionNotification('rejected', requisitionDetails, performedByRole);
    }

    console.log(`✅ Status update completed for requisition ${id}: ${requisition.status} -> ${status}`);
  };

  const deleteRequisition = async (id: string, performedBy: string, performedByRole: 'staff' | 'authoriser' | 'approver' | 'admin') => {
    const requisition = requisitions.find(req => req.id === id);
    if (!requisition) return;

    // Soft delete: mark as archived instead of hard delete
    const archiveData = {
      archived: true,
      archivedBy: performedBy,
      archivedAt: new Date().toISOString(),
      archiveReason: 'Deleted by user'
    };

    // Update in Supabase (real-time will handle local state update)
    const { error } = await supabase
      .from('requisitions')
      .update(archiveData)
      .eq('id', id);
    
    if (error) {
      console.error('Error archiving requisition:', error);
      return;
    }

    // Add audit log
    await addAuditLog({
      requisitionId: id,
      action: 'archived',
      performedBy,
      performedByRole,
      notes: 'Requisition archived (soft deleted)'
    });
  };

  const clearRequisitionHistory = async (userId: string, performedBy: string, performedByRole: 'staff' | 'authoriser' | 'approver' | 'admin') => {
    // Soft delete: mark all user's requisitions as archived
    const archiveData = {
      archived: true,
      archivedBy: performedBy,
      archivedAt: new Date().toISOString(),
      archiveReason: 'History cleared by user'
    };

    // Update in Supabase (real-time will handle local state update)
    const { error } = await supabase
      .from('requisitions')
      .update(archiveData)
      .eq('staffId', userId)
      .eq('archived', false);
    
    if (error) {
      console.error('Error clearing history:', error);
      return;
    }

    // Add audit logs for all archived requisitions
    const userRequisitions = requisitions.filter(req => req.staffId === userId && !req.archived);
    for (const req of userRequisitions) {
      await addAuditLog({
        requisitionId: req.id,
        action: 'archived',
        performedBy,
        performedByRole,
        notes: 'Requisition archived during history clear'
      });
    }
  };

  const getRequisitionsByRole = (role: string, userId?: string, includeArchived = false) => {
    switch (role) {
      case 'staff':
        // Staff only see their own non-archived requisitions
        return requisitions.filter(req => req.staffId === userId && (includeArchived || !req.archived));
      case 'authoriser':
        // Authorisers see pending requisitions (primary focus) but can also see all others for context
        if (includeArchived) {
          return requisitions.filter(req => ['pending', 'authorized', 'approved', 'rejected'].includes(req.status));
        }
        return requisitions.filter(req => ['pending', 'authorized', 'approved', 'rejected'].includes(req.status) && !req.archived);
      case 'approver':
        // Approvers see authorized requisitions (primary focus) but can also see approved/rejected for context
        if (includeArchived) {
          return requisitions.filter(req => ['authorized', 'approved', 'rejected'].includes(req.status));
        }
        return requisitions.filter(req => ['authorized', 'approved', 'rejected'].includes(req.status) && !req.archived);
      case 'admin':
        // Admins can see all requisitions
        return includeArchived ? requisitions : requisitions.filter(req => !req.archived);
      default:
        return [];
    }
  };

  const getArchivedRequisitions = (role?: string, userId?: string) => {
    const archived = requisitions.filter(req => req.archived);
    
    if (!role) return archived;
    
    switch (role) {
      case 'staff':
        return archived.filter(req => req.staffId === userId);
      case 'authoriser':
        // Authorizers can see all archived requisitions they would have seen
        return archived.filter(req => ['pending', 'authorized', 'approved', 'rejected'].includes(req.status));
      case 'approver':
        // Approvers can see all archived requisitions they would have seen
        return archived.filter(req => ['authorized', 'approved', 'rejected'].includes(req.status));
      case 'admin':
        return archived;
      default:
        return [];
    }
  };

  const permanentlyDeleteRequisition = async (id: string, performedBy: string) => {
    console.log('Starting permanent delete for:', id, 'by:', performedBy);
    
    // No need to add audit log since we're about to delete all audit logs anyway

    console.log('About to delete from Supabase...');
    
    // 1) Fetch requisition to locate any attached documents
    const { data: reqToDelete, error: fetchError } = await supabase
      .from('requisitions')
      .select('id, documentUrl, documentName, documentUrls, documentNames')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching requisition before delete:', fetchError);
      // We can continue, but document cleanup might be skipped
    }

    // 2) Delete all attached documents from storage
    try {
      const filesToDelete: string[] = [];
      
      // Handle new multiple document format (documentUrls)
      const documentUrls = (reqToDelete as any)?.documentUrls;
      if (documentUrls) {
        try {
          const urls = JSON.parse(documentUrls) as string[];
          urls.forEach((url: string) => {
            const marker = '/requisition-documents/';
            const idx = url.indexOf(marker);
            if (idx !== -1) {
              const path = decodeURIComponent(url.substring(idx + marker.length));
              if (path) filesToDelete.push(path);
            }
          });
        } catch (parseError) {
          console.error('Error parsing documentUrls:', parseError);
        }
      }
      
      // Fallback to old single document format
      const documentUrl = (reqToDelete as any)?.documentUrl as string | undefined;
      if (documentUrl && filesToDelete.length === 0) {
        const marker = '/requisition-documents/';
        const idx = documentUrl.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(documentUrl.substring(idx + marker.length));
          if (path) filesToDelete.push(path);
        }
      }

      // Delete all files from storage
      if (filesToDelete.length > 0) {
        console.log('Deleting files from storage:', filesToDelete);
        const { error: removeError } = await supabase.storage
          .from('requisition-documents')
          .remove(filesToDelete);
        
        if (removeError) {
          console.error('Error deleting storage objects:', removeError);
          throw removeError;
        } else {
          console.log('All storage objects deleted successfully');
        }
      }
    } catch (storageError) {
      console.error('Aborting permanent delete due to storage cleanup failure:', storageError);
      throw storageError;
    }
    
    // 3) Then delete related audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('requisitionId', id);
      
    if (auditError) {
      console.error('Error deleting audit logs:', auditError);
    } else {
      console.log('Audit logs deleted successfully');
    }

    // 4) Finally, hard delete the requisition row
    const { error, count } = await supabase
      .from('requisitions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error permanently deleting requisition:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Successfully deleted from Supabase, affected rows:', count);
  };

  const permanentlyDeleteFromDatabase = async (id: string, performedBy: string) => {
    try {
      await permanentlyDeleteRequisition(id, performedBy);
      // Refresh all data from database to ensure consistency
      await fetchRequisitions(true); // Include archived to get fresh data
      return true;
    } catch (error) {
      console.error('Error in permanent deletion:', error);
      throw error;
    }
  };

  const permanentlyDeleteAllArchived = async (performedBy: string) => {
    // Get archived requisitions directly from database
    const { data: archivedRequisitions, error } = await supabase
      .from('requisitions')
      .select('id')
      .eq('archived', true);
    
    if (error) {
      console.error('Error fetching archived requisitions:', error);
      throw error;
    }
    
    if (archivedRequisitions && archivedRequisitions.length > 0) {
      for (const req of archivedRequisitions) {
        await permanentlyDeleteRequisition((req as any).id, performedBy);
      }
    }
    
    // Refresh data after deletion
    fetchRequisitions(true);
  };

  const getAuditLogs = async (requisitionId?: string) => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (requisitionId) {
        query = query.eq('requisitionId', requisitionId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // Handle permission errors gracefully (non-admins can't access audit logs)
        if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
          console.warn('Access denied to audit logs - admin privileges required');
          return [];
        }
        console.error('Error fetching audit logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  };

  // Get total counts directly from database
  const getDatabaseCounts = async () => {
    try {
      // Always fetch requisitions data
      const requisitionsResult = await supabase.from('requisitions').select('*', { count: 'exact' });
      const rawRequisitionsData = requisitionsResult.data || [];

      // Transform the data to match our Requisition type (same as fetchRequisitions)
      const requisitionsData = rawRequisitionsData.map((row: any) => ({
        ...row,
        items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items) : [])
      }));

      // Try to fetch audit logs (only admins can access)
      let auditLogsData = [];
      let totalAuditLogs = 0;

      try {
        const auditLogsResult = await supabase.from('audit_logs').select('*', { count: 'exact' });
        auditLogsData = auditLogsResult.data || [];
        totalAuditLogs = auditLogsResult.count || 0;
      } catch (auditError: any) {
        // Handle permission errors gracefully (non-admins can't access audit logs)
        if (auditError?.code === 'PGRST301' || auditError?.message?.includes('row-level security')) {
          console.warn('Access denied to audit logs - admin privileges required');
        } else {
          console.error('Error fetching audit logs:', auditError);
        }
      }

      return {
        totalRequisitions: requisitionsResult.count || 0,
        totalAuditLogs,
        requisitionsData,
        auditLogsData
      };
    } catch (error) {
      console.error('Error fetching database counts:', error);
      return {
        totalRequisitions: 0,
        totalAuditLogs: 0,
        requisitionsData: [],
        auditLogsData: []
      };
    }
  };

  const updateLiquidationStatus = async (
    id: string,
    liquidationStatus: 'liquidated' | 'not_liquidated',
    performedBy: string,
    performedByRole: 'admin'
  ) => {
    // Update in Supabase (real-time will handle local state update)
    const { error } = await supabase
      .from('requisitions')
      .update({ 
        liquidation_status: liquidationStatus,
        liquidatedby: performedBy,
        liquidatedat: liquidationStatus === 'liquidated' ? new Date().toISOString() : null
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating liquidation status:', error);
      throw error;
    }

    // Add audit log
    await addAuditLog({
      requisitionId: id,
      action: 'status_changed',
      performedBy,
      performedByRole,
      notes: `Liquidation status changed to ${liquidationStatus}`
    });
  };

  // Get all requisitions from database for admin
  const getAllRequisitionsFromDatabase = async () => {
    const { data, error } = await supabase
      .from('requisitions')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching all requisitions:', error);
      return [];
    }
    
    return data || [];
  };

  return {
    requisitions,
    loading,
    addRequisition,
    updateRequisitionStatus,
    updateLiquidationStatus,
    deleteRequisition,
    clearRequisitionHistory,
    getRequisitionsByRole,
    getArchivedRequisitions,
    getAuditLogs,
    fetchRequisitions,
    addAuditLog,
    permanentlyDeleteRequisition,
    permanentlyDeleteAllArchived,
    permanentlyDeleteFromDatabase,
    getDatabaseCounts,
    getAllRequisitionsFromDatabase
  };
};

