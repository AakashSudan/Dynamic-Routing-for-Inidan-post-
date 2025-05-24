import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellIcon, MenuIcon, SearchIcon, ChevronDownIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Sidebar } from "./sidebar";

type HeaderProps = {
  onToggleSidebar: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-background border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleSidebar} 
              className="text-slate-700 hover:text-primary"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="hidden md:block">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search parcels, routes..."
                className="bg-slate-100 w-64 pl-10 h-9 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-700 hover:text-primary relative"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="text-xs font-semibold">
                  {user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <span className="hidden md:inline-block text-sm font-medium">{user?.fullName}</span>
              <ChevronDownIcon className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </header>
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <Sidebar className="w-64 fixed inset-y-0 left-0" />
        </div>
      )}
    </>
  );
}
