import { useOffice } from "@/hooks/useOffice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AvailableOffices = () => {
  const { availableOffices, isAvailableOfficesLoading, joinOffice } = useOffice();
  const { toast } = useToast();
  
  const handleJoinOffice = async (officeId: number) => {
    try {
      await joinOffice(officeId);
      toast({
        title: "Office joined",
        description: "You have successfully joined the office",
      });
    } catch (error) {
      toast({
        title: "Failed to join office",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
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
      <h2 className="text-2xl font-bold mb-6">Available Offices</h2>
      
      {isAvailableOfficesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 bg-[#2F3136]" />
          ))}
        </div>
      ) : availableOffices && availableOffices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableOffices.map((office) => (
            <Card 
              key={office.id}
              className="bg-[#2F3136] border-[#202225] text-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{office.name}</h3>
                  {getStatusBadge(office.status)}
                </div>
                <div className="text-[#B9BBBE] text-sm mb-4">
                  {office.description || "No description available."}
                </div>
                <div className="flex justify-between text-sm text-[#B9BBBE]">
                  <div>{office.memberCount} members</div>
                  <div>Owner: {office.owner.username}</div>
                </div>
              </CardContent>
              <CardFooter className="bg-[#202225] px-5 py-3 flex justify-end">
                <Button 
                  onClick={() => handleJoinOffice(office.id)}
                  className="bg-[#5865F2] hover:bg-opacity-80 text-white px-3 py-1 rounded-md text-sm"
                >
                  Join
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#2F3136] rounded-lg">
          <h3 className="text-lg font-medium mb-2">No Available Offices</h3>
          <p className="text-[#B9BBBE] mb-4">There are no offices available for you to join at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default AvailableOffices;
