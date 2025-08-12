import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { 
  Heart, 
  Bell, 
  LogOut, 
  User,
  Ambulance,
  Building2,
  UserCheck
} from "lucide-react";

interface RoleHeaderProps {
  user: any;
}

export function RoleHeader({ user }: RoleHeaderProps) {
  const { logout } = useAuth();
  const [notifications] = useState(3);

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'patient':
        return <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'ambulance':
        return <Ambulance className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'hospital':
        return <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
      default:
        return <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'patient':
        return 'bg-blue-100 text-blue-800';
      case 'ambulance':
        return 'bg-orange-100 text-orange-800';
      case 'hospital':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-2 sm:mr-3" />
            <h1 className="text-base sm:text-xl font-semibold text-gray-800">EmergencyConnect</h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {getRoleIcon()}
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-800">
                    {user?.firstName || user?.name || user?.username || 'User'} {user?.lastName || ''}
                  </div>
                  <div className="text-xs text-gray-600">{user?.email || ''}</div>
                </div>
              </div>
              <Badge className={`text-xs sm:text-sm ${getRoleColor()}`}>
                {(user?.role || 'user').charAt(0).toUpperCase() + (user?.role || 'user').slice(1)}
              </Badge>
            </div>
            
            <button className="relative p-1 sm:p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-gray-600 hover:text-red-600 text-xs sm:text-sm px-2 sm:px-3"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
