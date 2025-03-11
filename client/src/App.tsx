import { Switch, Route, useLocation, Router } from "wouter";
import { Suspense, lazy, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load page components
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const MyOffice = lazy(() => import("@/pages/MyOffice"));
const AvailableOffices = lazy(() => import("@/pages/AvailableOffices"));

function AppRouter() {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Close mobile menu when location changes
    setIsMobileMenuOpen(false);
  }, [location]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-primary text-white">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-discord-secondary" />
          <Skeleton className="h-4 w-40 bg-discord-secondary" />
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-discord-primary text-white">
      <Sidebar />
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-20 m-4">
        <button 
          className="text-white bg-discord-tertiary p-2 rounded-md"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <i className="ri-menu-line text-xl"></i>
        </button>
      </div>

      <main className="flex-1 ml-0 md:ml-64 p-4 min-h-screen overflow-y-auto">
        <Suspense 
          fallback={
            <div className="animate-pulse flex flex-col space-y-4">
              <Skeleton className="h-8 w-64 bg-discord-secondary" />
              <Skeleton className="h-64 w-full bg-discord-secondary" />
            </div>
          }
        >
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/admin" component={AdminPanel} />
            <Route path="/my-office" component={MyOffice} />
            <Route path="/available-offices" component={AvailableOffices} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
