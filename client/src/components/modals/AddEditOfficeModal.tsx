import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useOffice } from "@/hooks/useOffice";
import { Office, OfficeInput, OfficeUpdateInput } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface AddEditOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  office?: Office;
}

const AddEditOfficeModal = ({ isOpen, onClose, office }: AddEditOfficeModalProps) => {
  const { createOffice, updateOffice } = useOffice();
  const { toast } = useToast();
  const isEditing = !!office;

  const [formData, setFormData] = useState<OfficeInput | OfficeUpdateInput>({
    name: "",
    description: "",
    isPrivate: true,
    ownerId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (office) {
      setFormData({
        name: office.name,
        description: office.description || "",
        isPrivate: office.isPrivate,
        ownerId: office.ownerId,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        isPrivate: true,
        ownerId: "",
      });
    }
  }, [office, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPrivate: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (isEditing && office) {
        await updateOffice(office.id, formData as OfficeUpdateInput);
      } else {
        await createOffice(formData as OfficeInput);
      }
      
      onClose();
    } catch (error) {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} office`,
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2F3136] text-white border-[#202225] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Office" : "Add New Office"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="name" className="text-[#B9BBBE]">Office Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white mt-1"
                placeholder="Enter office name"
                required
              />
            </div>
            
            {!isEditing && (
              <div>
                <Label htmlFor="ownerId" className="text-[#B9BBBE]">Owner Discord ID</Label>
                <Input
                  id="ownerId"
                  name="ownerId"
                  value={formData.ownerId}
                  onChange={handleChange}
                  className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white mt-1"
                  placeholder="User#1234 or User ID"
                  required
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="description" className="text-[#B9BBBE]">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white mt-1"
                placeholder="Enter a description for this office"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isPrivate" className="text-[#B9BBBE]">Private Office</Label>
                <p className="text-[#72767D] text-xs">Only invited users can see and join a private office</p>
              </div>
              <Switch
                id="isPrivate"
                checked={formData.isPrivate}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="bg-[#202225] hover:bg-[#36393F] text-white border-none"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-[#5865F2] hover:bg-opacity-80 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Office"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditOfficeModal;
