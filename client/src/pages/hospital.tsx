import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HospitalBedLayout } from "@/components/hospital-bed-layout";
import { AmbulanceTracker } from "@/components/ambulance-tracker-simple";
import { ResourceAllocation } from "@/components/resource-allocation";
import { HospitalCommunication } from "@/components/hospital-communication";
import { NotificationSystem } from "@/components/notification-system";
import { 
  Bed, 
  Ambulance, 
  Settings,
  MessageSquare
} from "lucide-react";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("beds");

  // Get hospital name based on user
  const getHospitalName = (userId: number): string => {
    const hospitalMapping: Record<number, string> = {
      11: 'Apollo Hospital Indore',
      12: 'CARE CHL Hospital Indore',  
      13: 'Bombay Hospital Indore'
    };
    return hospitalMapping[userId] || 'Hospital Dashboard';
  };

  const handleBedUpdate = (bedId: string, status: string) => {
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const hospitalName = getHospitalName(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{hospitalName}</h1>
            <p className="text-gray-600 mt-1">Emergency Operations Center</p>
          </div>
          <NotificationSystem userRole="hospital" userId={user.id} />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="beds" className="flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Bed Management
            </TabsTrigger>
            <TabsTrigger value="ambulances" className="flex items-center gap-2">
              <Ambulance className="h-4 w-4" />
              Ambulance Tracker
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beds" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bed Layout Real Time Status</h2>
              <HospitalBedLayout hospitalId={user.id} onBedUpdate={handleBedUpdate} />
            </div>
          </TabsContent>

          <TabsContent value="ambulances" className="space-y-6">
            <AmbulanceTracker />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourceAllocation />
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <HospitalCommunication />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}