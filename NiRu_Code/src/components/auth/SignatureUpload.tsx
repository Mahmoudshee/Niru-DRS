import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, FileImage } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { syncUserSignatureUrl } from '@/utils/signatureSync';

interface SignatureUploadProps {
  currentSignatureUrl?: string;
  onSignatureUpdate: (url: string | null) => void;
  userId: string;
}

export const SignatureUpload: React.FC<SignatureUploadProps> = ({
  currentSignatureUrl,
  onSignatureUpdate,
  userId
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSignatureUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Delete old signature if exists
      if (currentSignatureUrl) {
        const oldPath = currentSignatureUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('signatures')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new signature with timestamped filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${timestamp}_signature.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Sync the signature URL in the profile table
      const syncedUrl = await syncUserSignatureUrl(userId);
      
      setPreviewUrl(syncedUrl);
      onSignatureUpdate(syncedUrl);
      toast.success('Signature uploaded successfully');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Failed to upload signature');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!currentSignatureUrl) return;

    setUploading(true);

    try {
      // Delete from storage
      const filePath = currentSignatureUrl.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('signatures')
          .remove([`${userId}/${filePath}`]);
       }

      // Sync the signature URL in the profile table (will be null if no files)
      const syncedUrl = await syncUserSignatureUrl(userId);

      setPreviewUrl(syncedUrl);
      onSignatureUpdate(syncedUrl);
      toast.success('Signature removed successfully');
    } catch (error) {
      console.error('Error removing signature:', error);
      toast.error('Failed to remove signature');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Digital Signature
        </CardTitle>
        <CardDescription>
          Upload your signature image to automatically include it in requisition PDFs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <img 
                src={previewUrl} 
                alt="Current signature" 
                className="max-h-20 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Signature
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveSignature}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload signature image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 2MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading && (
          <div className="text-sm text-muted-foreground text-center">
            Uploading signature...
          </div>
        )}
      </CardContent>
    </Card>
  );
};