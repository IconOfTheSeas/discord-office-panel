import { useState } from "react";
import { useOffice } from "@/hooks/useOffice";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import InviteUsersModal from "@/components/modals/InviteUsersModal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Save, UserPlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficeUpdateInput } from "@/lib/types";

const MyOffice = () => {
  const { myOffice, isMyOfficeLoading, updateOffice, removeUser } = useOffice();
  const { hasOffice, user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<OfficeUpdateInput>({
    name: myOffice?.name || "",
    description: myOffice?.description || "",
    isPrivate: myOffice?.isPrivate || true,
  });

  // Redirect if user doesn't have an office
  if (!hasOffice && !isMyOfficeLoading) {
    toast({
      title: "No office found",
      description: "You don't have an office to manage",
    });
    navigate("/");
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPrivate: checked }));
  };

  const handleEditMode = () => {
    setIsEditing(true);
    setFormData({
      name: myOffice?.name || "",
      description: myOffice?.description || "",
      isPrivate: myOffice?.isPrivate || true,
    });
  };

  const handleSaveChanges = async () => {
    if (!myOffice) return;
    
    try {
      setIsSaving(true);
      await updateOffice(myOffice.id, formData);
      setIsEditing(false);
      toast({
        title: "Office updated",
        description: "Your office has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to update office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!myOffice) return;
    
    try {
      await removeUser(myOffice.id, userId);
      toast({
        title: "User removed",
        description: "User has been removed from your office",
      });
    } catch (error) {
      toast({
        title: "Failed to remove user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  if (isMyOfficeLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <Skeleton className="h-8 w-64 bg-[#2F3136]" />
        <Skeleton className="h-64 w-full bg-[#2F3136]" />
      </div>
    );
  }

  if (!myOffice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">No Office Found</h2>
        <p className="text-[#B9BBBE] mb-6">You don't currently have an office to manage.</p>
        <Button 
          onClick={() => navigate("/")}
          className="bg-[#5865F2] hover:bg-opacity-80"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Office</h2>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="bg-[#2F3136] hover:bg-[#36393F] text-white border-[#202225]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-[#5865F2] hover:bg-opacity-80 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-[#2F3136] hover:bg-[#36393F] text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                <span>Invite Users</span>
              </Button>
              <Button 
                onClick={handleEditMode}
                className="bg-[#5865F2] hover:bg-opacity-80 text-white"
              >
                Edit Office
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-[#2F3136] border-[#202225] text-white">
            <CardHeader>
              <CardTitle className="text-lg">Office Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-[#B9BBBE] block mb-2 text-sm">Office Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white"
                    />
                  ) : (
                    <div className="p-2 bg-[#202225] rounded-md">{myOffice.name}</div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-[#B9BBBE] block mb-2 text-sm">Description (Optional)</Label>
                  {isEditing ? (
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white"
                      rows={3}
                    />
                  ) : (
                    <div className="p-2 bg-[#202225] rounded-md min-h-[80px]">
                      {myOffice.description || <span className="text-[#72767D]">No description</span>}
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-[#B9BBBE] text-sm">Office Visibility</Label>
                  </div>
                  <div className="flex items-center justify-between space-x-4 bg-[#202225] p-3 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium">Private Office</div>
                      <div className="text-[#B9BBBE] text-sm">Only invited users can see and join this office</div>
                    </div>
                    {isEditing ? (
                      <Switch
                        checked={formData.isPrivate}
                        onCheckedChange={handleSwitchChange}
                      />
                    ) : (
                      <div className={`text-sm ${myOffice.isPrivate ? 'text-[#57F287]' : 'text-[#ED4245]'}`}>
                        {myOffice.isPrivate ? 'Private' : 'Public'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-[#2F3136] border-[#202225] text-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Members</CardTitle>
              <span className="text-[#B9BBBE] text-sm">{myOffice.memberCount} members</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {myOffice.members.map((member) => (
                  <div 
                    key={member.userId}
                    className="flex items-center justify-between bg-[#202225] p-3 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#36393F] flex items-center justify-center text-xs font-medium">
                        {member.user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{member.user.username}#{member.user.discriminator}</div>
                        <div className="text-[#B9BBBE] text-xs">{member.isOwner ? 'Owner' : 'Member'}</div>
                      </div>
                    </div>
                    {member.isOwner ? (
                      <div className="text-[#B9BBBE]">
                        <i className="ri-shield-star-line text-[#5865F2]"></i>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUser(member.userId)}
                        disabled={member.userId === user?.id}
                        className="text-[#B9BBBE] hover:text-[#ED4245] hover:bg-transparent"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {myOffice.members.length === 0 && (
                  <div className="text-center py-4 text-[#B9BBBE]">
                    <p>No members yet. Invite some users!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Users Modal */}
      <InviteUsersModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        office={myOffice}
      />
    </div>
  );
};

export default MyOffice;
