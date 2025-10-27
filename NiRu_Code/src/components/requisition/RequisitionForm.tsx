import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitions } from '@/hooks/useRequisitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RequisitionItem, Requisition } from '@/types/requisition';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PolicyAssistant from '@/components/ai/PolicyAssistant';

interface RequisitionFormProps {
  editingRequisition?: Requisition;
  onComplete?: () => void;
}

const RequisitionForm = ({ editingRequisition, onComplete }: RequisitionFormProps) => {
  const { user } = useAuth();
  const { addRequisition } = useRequisitions();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
  });

  const [items, setItems] = useState<Omit<RequisitionItem, 'id'>[]>([
    { description: '', quantity: 0, unitPrice: 0, totalPrice: 0 }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingRequisition) {
      setFormData({
        date: editingRequisition.date,
        activity: editingRequisition.activity,
      });
      setItems(editingRequisition.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })));
    }
  }, [editingRequisition]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof Omit<RequisitionItem, 'id'>, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleFileUploads = async (files: File[]) => {
    if (!files || files.length === 0 || !user) return [];
    
    setUploading(true);
    const uploadResults = [];
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        // Store files in user-specific folders: {userId}/{fileName}
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('requisition-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('requisition-documents')
          .getPublicUrl(filePath);

        uploadResults.push({ url: publicUrl, name: file.name });
      }
      
      return uploadResults;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload one or more documents. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  const hasFormChanged = () => {
    if (!editingRequisition) return true;
    
    // Check if basic form data changed
    const formChanged = formData.date !== editingRequisition.date || 
                       formData.activity !== editingRequisition.activity;
    
    // Check if items changed meaningfully
    const originalItems = editingRequisition.items.map(item => ({
      description: item.description.trim().toLowerCase(),
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));
    
    const currentItems = items.map(item => ({
      description: item.description.trim().toLowerCase(),
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));
    
    const itemsChanged = JSON.stringify(originalItems.sort()) !== JSON.stringify(currentItems.sort());
    
    return formChanged || itemsChanged;
  };

  const checkForDuplicates = async () => {
    // Check for duplicate requisitions (same date, activity, total amount, and user)
    const { data: existingRequisitions, error: checkError } = await supabase
      .from('requisitions')
      .select('id, date, activity, totalAmount, items')
      .eq('staffId', user.id)
      .eq('date', formData.date)
      .eq('activity', formData.activity)
      .eq('totalAmount', getTotalAmount())
      .neq('archived', true);

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
      return false;
    }

    if (!existingRequisitions || existingRequisitions.length === 0) {
      return false;
    }

    // Filter out the current editing requisition if editing
    const relevantRequisitions = editingRequisition 
      ? existingRequisitions.filter(req => req.id !== editingRequisition.id)
      : existingRequisitions;

    if (relevantRequisitions.length === 0) return false;

    // Check if items are also similar (to detect true duplicates)
    const currentItems = items.map(item => ({
      description: item.description.trim().toLowerCase(),
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));

    const hasDuplicate = relevantRequisitions.some(existing => {
      const existingItems = (existing.items as any[])?.map((item: any) => ({
        description: item.description.trim().toLowerCase(),
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })) || [];
      
      return JSON.stringify(currentItems.sort()) === JSON.stringify(existingItems.sort());
    });

    return hasDuplicate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || isSubmitting) return;

    // Prevent rapid multiple submissions (debounce)
    const now = Date.now();
    if (now - lastSubmitTime < 2000) { // 2 second cooldown
      toast({
        title: "Please Wait",
        description: "Please wait a moment before submitting again.",
        variant: "destructive"
      });
      return;
    }
    setLastSubmitTime(now);

    // Prevent duplicate submissions
    setIsSubmitting(true);

    try {
      // For editing, check if meaningful changes were made
      if (editingRequisition && !hasFormChanged()) {
        toast({
          title: "No Changes Detected",
          description: "Please modify the activity name, price, quantity, or date before resubmitting.",
          variant: "destructive"
        });
        return;
      }

      // Check for duplicates
      const isDuplicate = await checkForDuplicates();
      if (isDuplicate) {
        toast({
          title: "Duplicate Requisition Detected",
          description: "A similar requisition already exists. Please check your previous submissions or modify the details.",
          variant: "destructive"
        });
        return;
      }

      const requisitionItems: RequisitionItem[] = items.map((item, index) => ({
        id: String(index + 1),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }));

      let documentUrls: string[] = [];
      let documentNames: string[] = [];

      if (uploadedFiles.length > 0) {
        const uploadResults = await handleFileUploads(uploadedFiles);
        if (uploadResults.length > 0) {
          documentUrls = uploadResults.map(r => r.url);
          documentNames = uploadResults.map(r => r.name);
        }
      }

      const newRequisition = {
        staffId: user.id,
        staffName: user.name,
        staffEmail: user.email,
        date: formData.date,
        activity: formData.activity,
        totalAmount: getTotalAmount(),
        items: requisitionItems,
        status: 'pending' as const,
        documentUrl: documentUrls.length > 0 ? documentUrls[0] : undefined,
        documentName: documentNames.length > 0 ? documentNames.join(', ') : undefined,
        documentUrls: documentUrls.length > 0 ? JSON.stringify(documentUrls) : undefined,
        documentNames: documentNames.length > 0 ? JSON.stringify(documentNames) : undefined,
        originalRequisitionId: editingRequisition?.id,
        editedFrom: editingRequisition ? editingRequisition.id : undefined
      };

      await addRequisition(newRequisition);
      
      toast({
        title: editingRequisition ? "Requisition Updated" : "Requisition Submitted",
        description: editingRequisition 
          ? "Your requisition has been updated and resubmitted for authorization."
          : "Your requisition has been submitted for authorization."
      });

      // Reset form
      setFormData({ date: new Date().toISOString().split('T')[0], activity: '' });
      setItems([{ description: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
      setUploadedFiles([]);
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error submitting requisition:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit requisition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Requisition</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="activity">Activity</Label>
              <Input
                id="activity"
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                placeholder="e.g., Office Supplies Purchase"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg font-medium">Items</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter quantity"
                      required
                    />
                  </div>
                  <div>
                    <Label>Unit Price (KSH)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter price"
                      required
                    />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                       <Label>Total (KSH)</Label>
                       <div className="text-lg font-semibold text-green-600">
                         KSH{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <div className="text-xl font-bold">
                Total Amount: KSH{getTotalAmount().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <Label className="text-lg font-medium">Attach Documents (Optional - Multiple files allowed)</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  if (newFiles.length > 0) {
                    setUploadedFiles([...uploadedFiles, ...newFiles]);
                    toast({
                      title: "Files Added",
                      description: `${newFiles.length} file(s) added. Total: ${uploadedFiles.length + newFiles.length}`
                    });
                  }
                  // Reset input so same file can be added again if needed
                  e.target.value = '';
                }}
                className="mb-2"
              />
              {uploadedFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {editingRequisition?.documentUrl && uploadedFiles.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Current: {editingRequisition.documentName}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Policy Assistant */}
          <PolicyAssistant 
            requisitionData={{
              activity: formData.activity,
              items: items,
              totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0)
            }}
          />

          <Button type="submit" className="w-full" disabled={uploading || isSubmitting}>
            {uploading || isSubmitting ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Submitting...'}
              </>
            ) : (
              editingRequisition ? "Update Requisition" : "Submit Requisition"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequisitionForm;