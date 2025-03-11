import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOffice } from "@/hooks/useOffice";
import { Office } from "@/lib/types";

interface DeleteOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: Office | null;
}

const DeleteOfficeModal = ({ isOpen, onClose, office }: DeleteOfficeModalProps) => {
  const { deleteOffice } = useOffice();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!office) return;
    
    try {
      setIsDeleting(true);
      await deleteOffice(office.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete office:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!office) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2F3136] text-white border-[#202225] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <p className="text-white mb-4">
            Are you sure you want to delete this office? This action cannot be undone and will remove the voice channel for all members.
          </p>
          
          <div className="bg-[#202225] p-3 rounded-md mb-5">
            <div className="font-medium">{office.name}</div>
            <div className="text-[#B9BBBE] text-sm">
              Owner: {office.owner.username}#{office.owner.discriminator}
            </div>
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
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-[#ED4245] hover:bg-opacity-80 text-white"
          >
            {isDeleting ? "Deleting..." : "Delete Office"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOfficeModal;
