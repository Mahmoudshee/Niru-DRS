import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { syncUserSignatureUrl } from '@/utils/signatureSync';

interface SignatureImage {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  userId: string;
}

interface SignatureGalleryProps {
  userId: string;
  userName: string;
}

const SignatureGallery: React.FC<SignatureGalleryProps> = ({ userId, userName }) => {
  const [signatures, setSignatures] = useState<SignatureImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load signatures from Supabase on component mount
  useEffect(() => {
    loadSignatures();
  }, [userId]);

  const loadSignatures = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('signatures')
        .list(userId, {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      if (data) {
        const signaturePromises = data.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(`${userId}/${file.name}`);

          return {
            id: file.name,
            name: file.name,
            url: urlData.publicUrl,
            uploadDate: file.updated_at || file.created_at || new Date().toISOString(),
            userId: userId
          };
        });

        const signatureList = await Promise.all(signaturePromises);
        setSignatures(signatureList);
      }
    } catch (error) {
      console.error('Error loading signatures:', error);
      toast({
        title: "Error",
        description: "Failed to load signatures",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      toast({
        title: "Signature Uploaded",
        description: "Your signature has been saved successfully."
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl('');
      const fileInput = document.getElementById('signature-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload signatures
      await loadSignatures();
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload signature. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (signatureId: string) => {
    if (window.confirm('Are you sure you want to delete this signature?')) {
      try {
        const { error } = await supabase.storage
          .from('signatures')
          .remove([`${userId}/${signatureId}`]);

        if (error) throw error;

        // Sync the signature URL in the profile table (will be null if no files)
        await syncUserSignatureUrl(userId);

        toast({
          title: "Signature Deleted",
          description: "The signature has been removed and profile updated."
        });

        // Reload signatures
        await loadSignatures();
      } catch (error) {
        console.error('Error deleting signature:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete signature. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Signature Gallery - {userName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="signature-upload">Upload New Signature</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>
            
            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview:</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-20 max-w-40 object-contain"
                  />
                </div>
                <Button onClick={handleUpload} disabled={loading} className="w-full">
                  {loading ? 'Saving...' : 'Save Signature'}
                </Button>
              </div>
            )}
          </div>

          {/* Signatures Display */}
          <div className="space-y-4">
            <Label>Saved Signatures ({signatures.length})</Label>
            {signatures.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No signatures uploaded yet. Upload your first signature above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {signatures.map((signature) => (
                  <Card key={signature.id} className="relative">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <img 
                          src={signature.url} 
                          alt={signature.name}
                          className="w-full h-16 object-contain border rounded bg-white"
                        />
                        <div className="text-xs text-muted-foreground truncate">
                          {signature.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(signature.uploadDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Signature Preview</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center p-4">
                                <img 
                                  src={signature.url} 
                                  alt={signature.name}
                                  className="max-w-full max-h-64 object-contain border rounded"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(signature.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignatureGallery;