import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, isAdmin, hasOffice } = useAuth();

  return (
    <div className="fade-in">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="bg-[#2F3136] border-[#202225] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#B9BBBE] mb-4">
              Hello, <span className="text-white font-medium">{user?.username}</span>! 
              Welcome to the Discord Office Management Panel.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {isAdmin && (
                <Link href="/admin">
                  <Button className="bg-[#5865F2] hover:bg-opacity-80">
                    Admin Panel
                  </Button>
                </Link>
              )}
              {hasOffice && (
                <Link href="/my-office">
                  <Button className="bg-[#5865F2] hover:bg-opacity-80">
                    Manage My Office
                  </Button>
                </Link>
              )}
              <Link href="/available-offices">
                <Button className="bg-[#5865F2] hover:bg-opacity-80">
                  Available Offices
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {hasOffice ? (
          <Card className="bg-[#2F3136] border-[#202225] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">My Office</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#B9BBBE] mb-4">
                You are an office owner. Manage your office settings and members.
              </p>
              <Link href="/my-office">
                <Button className="bg-[#5865F2] hover:bg-opacity-80 w-full">
                  Manage Office
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#2F3136] border-[#202225] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Join an Office</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#B9BBBE] mb-4">
                You are not part of any office yet. Browse available offices to join one.
              </p>
              <Link href="/available-offices">
                <Button className="bg-[#5865F2] hover:bg-opacity-80 w-full">
                  Browse Offices
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        
        {isAdmin && (
          <Card className="bg-[#2F3136] border-[#202225] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#B9BBBE] mb-4">
                As an admin, you can manage all offices in the system.
              </p>
              <Link href="/admin">
                <Button className="bg-[#5865F2] hover:bg-opacity-80 w-full">
                  Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
