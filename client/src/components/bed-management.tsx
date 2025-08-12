import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bed, Plus } from "lucide-react";

export function BedManagement() {
  const [bedData, setBedData] = useState({
    icuBeds: { total: 10, occupied: 6 },
    generalBeds: { total: 14, occupied: 10 },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateBedsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/hospitals/update-status", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bed Status Updated",
        description: "Hospital bed availability has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/hospitals/available'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update bed status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleBedStatus = (bedType: 'icu' | 'general', bedIndex: number) => {
    const key = bedType === 'icu' ? 'icuBeds' : 'generalBeds';
    const currentBeds = bedData[key];
    
    // Toggle logic: if clicking on an occupied bed (red), make it available
    // If clicking on an available bed (green), make it occupied
    let newOccupied;
    if (bedIndex < currentBeds.occupied) {
      // Clicking on occupied bed - make it and all beds after it available
      newOccupied = bedIndex;
    } else {
      // Clicking on available bed - make it and all beds before it occupied
      newOccupied = bedIndex + 1;
    }
    
    const newBedData = {
      ...bedData,
      [key]: {
        ...currentBeds,
        occupied: Math.max(0, Math.min(newOccupied, currentBeds.total))
      }
    };
    
    setBedData(newBedData);
    
    // Update server
    updateBedsMutation.mutate({
      hospitalId: 1, // Should be actual hospital ID
      totalBeds: newBedData.icuBeds.total + newBedData.generalBeds.total,
      availableBeds: (newBedData.icuBeds.total - newBedData.icuBeds.occupied) + 
                     (newBedData.generalBeds.total - newBedData.generalBeds.occupied),
      icuBeds: newBedData.icuBeds.total,
      availableIcuBeds: newBedData.icuBeds.total - newBedData.icuBeds.occupied,
    });
  };

  const renderBeds = (bedType: 'icu' | 'general') => {
    const beds = bedType === 'icu' ? bedData.icuBeds : bedData.generalBeds;
    const bedCount = beds.total;
    const occupiedCount = beds.occupied;
    
    return (
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: bedCount }, (_, i) => (
          <button
            key={i}
            onClick={() => toggleBedStatus(bedType, i)}
            className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
              i < occupiedCount 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bed Availability Management</CardTitle>
          <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Update Status
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* ICU Beds */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800 flex items-center">
                <Bed className="w-5 h-5 mr-2" />
                ICU Beds
              </h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {bedData.icuBeds.occupied}/{bedData.icuBeds.total} Occupied
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  {bedData.icuBeds.total - bedData.icuBeds.occupied} Available
                </Badge>
              </div>
            </div>
            {renderBeds('icu')}
          </div>

          {/* General Beds */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800 flex items-center">
                <Bed className="w-5 h-5 mr-2" />
                General Beds
              </h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {bedData.generalBeds.occupied}/{bedData.generalBeds.total} Occupied
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  {bedData.generalBeds.total - bedData.generalBeds.occupied} Available
                </Badge>
              </div>
            </div>
            {renderBeds('general')}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Legend:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-600">Occupied</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-600">Available</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
