import { useState } from "react";
import { useOffice } from "@/hooks/useOffice";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Office } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import AddEditOfficeModal from "@/components/modals/AddEditOfficeModal";
import DeleteOfficeModal from "@/components/modals/DeleteOfficeModal";
import { Edit, Trash2, Plus } from "lucide-react";
import { useLocation } from "wouter";

const AdminPanel = () => {
  const { offices, isLoading } = useOffice();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);

  // Redirect if not admin
  if (!isAdmin) {
    toast({
      title: "Access Denied",
      description: "You don't have permission to access the admin panel",
      variant: "destructive",
    });
    navigate("/");
    return null;
  }

  const handleEditOffice = (office: Office) => {
    setSelectedOffice(office);
    setIsEditModalOpen(true);
  };

  const handleDeleteOffice = (office: Office) => {
    setSelectedOffice(office);
    setIsDeleteModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-[#57F287] bg-opacity-20 text-[#57F287]">
            Active
          </span>
        );
      case 'away':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-[#FEE75C] bg-opacity-20 text-[#FEE75C]">
            Away
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-600 bg-opacity-20 text-gray-400">
            Offline
          </span>
        );
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <Button 
          className="bg-[#5865F2] hover:bg-opacity-80 text-white"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Office</span>
        </Button>
      </div>

      <div className="bg-[#2F3136] rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold mb-4">Office Management</h3>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-full bg-[#36393F]" />
              </div>
            ))}
          </div>
        ) : offices && offices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#202225]">
                  <th className="pb-3 pr-4">Office Name</th>
                  <th className="pb-3 pr-4">Owner</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Members</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((office) => (
                  <tr 
                    key={office.id} 
                    className="border-b border-[#202225] hover:bg-[#36393F]"
                  >
                    <td className="py-3 pr-4">{office.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-[#202225] flex items-center justify-center text-xs font-medium">
                          {office.owner.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{office.owner.username}#{office.owner.discriminator}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {getStatusBadge(office.status)}
                    </td>
                    <td className="py-3 pr-4">{office.memberCount}</td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOffice(office)}
                          className="text-[#B9BBBE] hover:text-white hover:bg-[#202225]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOffice(office)}
                          className="text-[#B9BBBE] hover:text-[#ED4245] hover:bg-[#202225]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#B9BBBE]">
            <p>No offices found. Click the "Add Office" button to create one.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEditOfficeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <AddEditOfficeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        office={selectedOffice || undefined}
      />
      
      <DeleteOfficeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        office={selectedOffice}
      />
    </div>
  );
};

export default AdminPanel;
