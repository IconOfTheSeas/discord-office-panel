import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Office, OfficeInput, OfficeUpdateInput } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OfficeContextType {
  offices: Office[] | undefined;
  myOffice: Office | undefined;
  availableOffices: Office[] | undefined;
  isLoading: boolean;
  isMyOfficeLoading: boolean;
  isAvailableOfficesLoading: boolean;
  createOffice: (data: OfficeInput) => Promise<Office>;
  updateOffice: (id: number, data: OfficeUpdateInput) => Promise<Office>;
  deleteOffice: (id: number) => Promise<void>;
  inviteUser: (officeId: number, userId: string) => Promise<void>;
  removeUser: (officeId: number, userId: string) => Promise<void>;
  joinOffice: (officeId: number) => Promise<void>;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

export function OfficeProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch all offices (admin only)
  const { 
    data: offices, 
    isLoading 
  } = useQuery<Office[]>({
    queryKey: ['/api/offices'],
    enabled: true,
  });

  // Fetch my office
  const {
    data: myOffice,
    isLoading: isMyOfficeLoading,
  } = useQuery<Office>({
    queryKey: ['/api/offices/me'],
    enabled: true,
  });

  // Fetch available offices
  const {
    data: availableOffices,
    isLoading: isAvailableOfficesLoading,
  } = useQuery<Office[]>({
    queryKey: ['/api/offices/available'],
    enabled: true,
  });

  // Create office mutation
  const createOfficeMutation = useMutation({
    mutationFn: async (data: OfficeInput) => {
      const res = await apiRequest("POST", "/api/offices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
      toast({
        title: "Office created",
        description: "Office has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Update office mutation
  const updateOfficeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OfficeUpdateInput }) => {
      const res = await apiRequest("PATCH", `/api/offices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/me'] });
      toast({
        title: "Office updated",
        description: "Office has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete office mutation
  const deleteOfficeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/offices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/available'] });
      toast({
        title: "Office deleted",
        description: "Office has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ officeId, userId }: { officeId: number; userId: string }) => {
      await apiRequest("POST", `/api/offices/${officeId}/invite`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/me'] });
      toast({
        title: "User invited",
        description: "User has been invited to the office",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to invite user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ officeId, userId }: { officeId: number; userId: string }) => {
      await apiRequest("DELETE", `/api/offices/${officeId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/me'] });
      toast({
        title: "User removed",
        description: "User has been removed from the office",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Join office mutation
  const joinOfficeMutation = useMutation({
    mutationFn: async (officeId: number) => {
      await apiRequest("POST", `/api/offices/${officeId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offices/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offices/me'] });
      toast({
        title: "Office joined",
        description: "You have joined the office successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to join office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const createOffice = async (data: OfficeInput) => {
    return createOfficeMutation.mutateAsync(data);
  };

  const updateOffice = async (id: number, data: OfficeUpdateInput) => {
    return updateOfficeMutation.mutateAsync({ id, data });
  };

  const deleteOffice = async (id: number) => {
    return deleteOfficeMutation.mutateAsync(id);
  };

  const inviteUser = async (officeId: number, userId: string) => {
    return inviteUserMutation.mutateAsync({ officeId, userId });
  };

  const removeUser = async (officeId: number, userId: string) => {
    return removeUserMutation.mutateAsync({ officeId, userId });
  };

  const joinOffice = async (officeId: number) => {
    return joinOfficeMutation.mutateAsync(officeId);
  };

  return (
    <OfficeContext.Provider
      value={{
        offices,
        myOffice,
        availableOffices,
        isLoading,
        isMyOfficeLoading,
        isAvailableOfficesLoading,
        createOffice,
        updateOffice,
        deleteOffice,
        inviteUser,
        removeUser,
        joinOffice,
      }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error("useOffice must be used within an OfficeProvider");
  }
  return context;
}
