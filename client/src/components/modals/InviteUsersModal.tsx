import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useOffice } from "@/hooks/useOffice";
import { Office } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: Office | null;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  selected: boolean;
}

const InviteUsersModal = ({ isOpen, onClose, office }: InviteUsersModalProps) => {
  const { inviteUser } = useOffice();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<DiscordUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available users to invite
  const { data: availableUsers, isLoading } = useQuery({
    queryKey: ['/api/users/search', searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: isOpen && searchTerm.length > 0,
  });

  useEffect(() => {
    if (availableUsers) {
      setUsers(availableUsers.map((user: any) => ({ ...user, selected: false })));
    }
  }, [availableUsers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleUserToggle = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, selected: !user.selected } : user
    ));
    
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSendInvites = async () => {
    if (!office) return;
    
    try {
      setIsSubmitting(true);
      // Send invites to all selected users
      await Promise.all(
        selectedUsers.map(userId => inviteUser(office.id, userId))
      );
      
      toast({
        title: "Invites sent",
        description: `Successfully sent invites to ${selectedUsers.length} user(s)`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Failed to send invites",
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
          <DialogTitle>Invite Users</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div>
            <Label htmlFor="search-users" className="text-[#B9BBBE]">Search Users</Label>
            <div className="relative">
              <Input
                id="search-users"
                value={searchTerm}
                onChange={handleSearch}
                className="bg-[#202225] border-[#40444B] focus:border-[#5865F2] text-white pl-10 pr-4 py-2 mt-1"
                placeholder="Search by username"
              />
              <div className="absolute left-3 top-[calc(50%+0.25rem)] transform -translate-y-1/2 text-[#B9BBBE]">
                <i className="ri-search-line"></i>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-[#B9BBBE] text-sm mb-2">Select users to invite:</div>
            <div className="max-h-60 overflow-y-auto bg-[#202225] rounded-md">
              {isLoading ? (
                <div className="p-3 text-center text-[#B9BBBE]">
                  Loading users...
                </div>
              ) : users.length > 0 ? (
                users.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-[#36393F] border-b border-[#2F3136] last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#36393F] flex items-center justify-center text-xs font-medium">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="font-medium">{user.username}#{user.discriminator}</div>
                    </div>
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={user.selected}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                  </div>
                ))
              ) : searchTerm.length > 0 ? (
                <div className="p-3 text-center text-[#B9BBBE]">
                  No users found
                </div>
              ) : (
                <div className="p-3 text-center text-[#B9BBBE]">
                  Start typing to search for users
                </div>
              )}
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
            onClick={handleSendInvites}
            disabled={isSubmitting || selectedUsers.length === 0}
            className="bg-[#5865F2] hover:bg-opacity-80 text-white"
          >
            {isSubmitting ? "Sending..." : "Send Invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersModal;
