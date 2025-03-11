import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const { user, isAdmin, hasOffice, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  // Close sidebar on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location, isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-[#2F3136] z-20 md:hidden transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-[#202225]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Discord Office Panel</h1>
            <button className="text-[#B9BBBE] hover:text-white" onClick={onClose}>
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center mb-6 mt-2">
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold">
                {user?.username.substring(0, 2).toUpperCase() || "U"}
              </div>
              <div>
                <div className="text-white font-medium">{user?.username || "User"}</div>
                <div className="text-[#B9BBBE] text-xs">#{user?.discriminator || "0000"}</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <Link href="/">
              <a className={`flex items-center space-x-3 p-2 rounded hover:bg-[#36393F] ${
                isActive("/") ? "bg-[#36393F] text-white" : "text-[#B9BBBE] hover:text-white"
              }`}>
                <i className="ri-dashboard-line text-lg"></i>
                <span>Dashboard</span>
              </a>
            </Link>
            
            {/* My Office Section - Only visible if user has an office */}
            {hasOffice && (
              <>
                <div className="pt-4 pb-2">
                  <div className="text-[#B9BBBE] text-xs font-semibold uppercase tracking-wider px-2">MY OFFICE</div>
                </div>
                <Link href="/my-office">
                  <a className={`flex items-center space-x-3 p-2 rounded hover:bg-[#36393F] ${
                    isActive("/my-office") ? "bg-[#36393F] text-white" : "text-[#B9BBBE] hover:text-white"
                  }`}>
                    <i className="ri-door-open-line text-lg"></i>
                    <span>Manage My Office</span>
                  </a>
                </Link>
              </>
            )}
            
            {/* Admin Panel Section - Only visible to admins */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <div className="text-[#B9BBBE] text-xs font-semibold uppercase tracking-wider px-2">ADMIN PANEL</div>
                </div>
                <Link href="/admin">
                  <a className={`flex items-center space-x-3 p-2 rounded hover:bg-[#36393F] ${
                    isActive("/admin") ? "bg-[#36393F] text-white" : "text-[#B9BBBE] hover:text-white"
                  }`}>
                    <i className="ri-building-line text-lg"></i>
                    <span>All Offices</span>
                  </a>
                </Link>
              </>
            )}
            
            <div className="pt-4 pb-2">
              <div className="text-[#B9BBBE] text-xs font-semibold uppercase tracking-wider px-2">GENERAL</div>
            </div>
            <Link href="/available-offices">
              <a className={`flex items-center space-x-3 p-2 rounded hover:bg-[#36393F] ${
                isActive("/available-offices") ? "bg-[#36393F] text-white" : "text-[#B9BBBE] hover:text-white"
              }`}>
                <i className="ri-door-line text-lg"></i>
                <span>Available Offices</span>
              </a>
            </Link>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="flex items-center space-x-3 p-2 rounded hover:bg-[#36393F] text-[#B9BBBE] hover:text-white"
            >
              <i className="ri-logout-box-line text-lg"></i>
              <span>Logout</span>
            </a>
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
