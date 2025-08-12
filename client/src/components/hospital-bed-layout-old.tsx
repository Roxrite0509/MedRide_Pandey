import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bed, Users, Activity, Heart, Shield } from 'lucide-react';

interface BedData {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'reserved';
  ward: string;
  type: 'icu' | 'general' | 'isolation';
  floor: number;
  patientName?: string;
}

interface HospitalBedLayoutProps {
  hospitalId: number;
  onBedUpdate?: (bedId: string, status: string) => void;
}

export function HospitalBedLayout({ hospitalId, onBedUpdate }: HospitalBedLayoutProps) {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'icu' | 'general' | 'isolation'>('all');

  // Fetch real bed status data from server
  const { data: bedStatusData, isLoading: bedStatusLoading } = useQuery({
    queryKey: [`/api/hospitals/${hospitalId}/bed-status`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get hospital-specific configurations
  const getHospitalConfig = (hospitalId: number) => {
    const configs = {
      2: { // Apollo Hospital Indore
        name: 'Apollo Hospital Indore',
        icuBeds: 30,
        generalBeds: 60, // Display subset for UI
        isolationBeds: 25,
        wards: ['Cardiology ICU', 'Orthopedic Ward', 'Neurology ICU', 'Emergency Ward', 'COVID Isolation']
      },
      3: { // CARE CHL Hospital Indore  
        name: 'CARE CHL Hospital Indore',
        icuBeds: 35,
        generalBeds: 65,
        isolationBeds: 30,
        wards: ['Cardiac ICU', 'Neurology Ward', 'Critical Care ICU', 'General Ward', 'Isolation Unit']
      },
      4: { // Bombay Hospital Indore
        name: 'Bombay Hospital Indore',
        icuBeds: 30,
        generalBeds: 55,
        isolationBeds: 25,
        wards: ['Multi-specialty ICU', 'Pediatric Ward', 'Surgery ICU', 'General Ward', 'Isolation Ward']
      }
    };
    return configs[hospitalId as keyof typeof configs] || configs[2];
  };

  // Generate bed data by merging server data with static configurations
  useEffect(() => {
    const config = getHospitalConfig(hospitalId);
    
    const generateBedsFromServerData = (): BedData[] => {
      if (!bedStatusData || bedStatusLoading) {
        return [];
      }

      // Static patient name mappings for occupied beds
      const patientNames: Record<string, string> = {
        // Apollo Hospital
        'CCU-01': 'Rajesh Kumar',
        'CCU-03': 'Priya Sharma', 
        'NICU-01': 'Baby Anaya',
        'MED-101': 'Amit Patel',
        'MED-103': 'Sunita Verma',
        'SUR-201': 'Vikram Singh',
        'SUR-203': 'Meera Gupta',

        // CARE CHL Hospital
        // 'NICU-01': 'Baby Krishna', // Duplicate key removed
        'NICU-03': 'Baby Lakshmi',
        // 'CCU-01': 'Ramesh Jain', // Duplicate key removed
        'PED-401': 'Little Arjun',
        'PED-403': 'Little Shreya',
        'CAR-502': 'Sushma Devi',
        'GEN-601': 'Dinesh Kumar',

        // Bombay Hospital
        'CCU-B1': 'Deepak Agarwal',
        'CCU-B3': 'Ritu Malhotra',
        'ICU-B1': 'Mohit Sharma',
        'ORT-501': 'Manoj Tiwari',
        'NEU-601': 'Sanjay Khanna',
        'GEN-702': 'Kavitha Reddy'
      };

      // Ward mappings for each hospital
      const wardMappings: Record<number, Record<string, { ward: string; floor: number }>> = {
        2: { // Apollo Hospital
          'CCU': { ward: 'Cardiac ICU', floor: 3 },
          'NICU': { ward: 'Neuro ICU', floor: 4 },
          'MED': { ward: 'Medical Ward A', floor: 1 },
          'SUR': { ward: 'Surgical Ward', floor: 2 },
          'ORT': { ward: 'Orthopedic Ward', floor: 2 }
        },
        3: { // CARE CHL Hospital
          'NICU': { ward: 'NICU', floor: 4 },
          'ICU': { ward: 'Critical Care ICU', floor: 3 },
          'CCU': { ward: 'Cardiac Care Unit', floor: 3 },
          'PED': { ward: 'Pediatric Ward', floor: 2 },
          'CAR': { ward: 'Cardiology Ward', floor: 1 },
          'GEN': { ward: 'General Medicine', floor: 4 },
          'MAT': { ward: 'Maternity Ward', floor: 5 }
        },
        4: { // Bombay Hospital
          'CCU': { ward: 'Coronary Care Unit', floor: 3 },
          'NICU': { ward: 'Neuro ICU', floor: 4 },
          'ICU': { ward: 'Multi-specialty ICU', floor: 3 },
          'ORT': { ward: 'Orthopedic Ward', floor: 2 },
          'NEU': { ward: 'Neurology Ward', floor: 4 },
          'GEN': { ward: 'General Medicine', floor: 1 },
          'SUR': { ward: 'Surgery Ward', floor: 3 },
          'PED': { ward: 'Pediatric Ward', floor: 2 }
        }
      };

      if (!Array.isArray(bedStatusData)) {
        return [];
      }
      return bedStatusData.map((bedStatus: any, index: number) => {
        const wardPrefix = bedStatus.bedNumber.split('-')[0];
        const wardInfo = wardMappings[hospitalId]?.[wardPrefix] || { ward: 'General Ward', floor: 1 };
        
        return {
          id: `bed-${bedStatus.id}`,
          number: bedStatus.bedNumber,
          status: bedStatus.status as 'available' | 'occupied' | 'reserved',
          ward: wardInfo.ward,
          type: bedStatus.bedType as 'icu' | 'general' | 'isolation',
          floor: wardInfo.floor,
          patientName: bedStatus.status === 'occupied' ? patientNames[bedStatus.bedNumber] : undefined
        };
      });
    };

    setBeds(generateBedsFromServerData());
  }, [hospitalId, bedStatusData, bedStatusLoading]);

  const updateBedStatus = (bedId: string, newStatus: 'available' | 'occupied' | 'reserved') => {
    setBeds(prev => {
      const updatedBeds = prev.map(bed => 
        bed.id === bedId 
          ? { ...bed, status: newStatus, patientName: newStatus === 'occupied' ? bed.patientName || `Patient ${bedId}` : undefined }
          : bed
      );
      
      // Calculate and update hospital bed counts in database
      const icuBeds = updatedBeds.filter(bed => bed.type === 'icu');
      const generalBeds = updatedBeds.filter(bed => bed.type === 'general');
      
      const availableIcuBeds = icuBeds.filter(bed => bed.status === 'available').length;
      const availableGeneralBeds = generalBeds.filter(bed => bed.status === 'available').length;
      
      // Update hospital bed counts in the database
      fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          totalBeds: generalBeds.length,
          availableBeds: availableGeneralBeds,
          icuBeds: icuBeds.length,
          availableIcuBeds: availableIcuBeds
        })
      });
      
      return updatedBeds;
    });
    
    onBedUpdate?.(bedId, newStatus);
    console.log(`Bed ${bedId} updated to ${newStatus}`);
  };

  const getBedIcon = (type: string) => {
    switch (type) {
      case 'icu': return <Heart className="h-4 w-4" />;
      case 'isolation': return <Shield className="h-4 w-4" />;
      default: return <Bed className="h-4 w-4" />;
    }
  };

  const getBedColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600 border-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600 border-red-600';
      case 'reserved': return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      default: return 'bg-gray-400';
    }
  };

  const filteredBeds = beds.filter(bed => {
    if (selectedType !== 'all' && bed.type !== selectedType) return false;
    if (selectedWard !== 'all' && bed.ward !== selectedWard) return false;
    return true;
  });

  const groupedBeds = filteredBeds.reduce((acc, bed) => {
    const key = selectedType === 'all' ? bed.type : bed.ward;
    if (!acc[key]) acc[key] = [];
    acc[key].push(bed);
    return acc;
  }, {} as Record<string, BedData[]>);

  const getStats = () => {
    const total = beds.length;
    const available = beds.filter(b => b.status === 'available').length;
    const occupied = beds.filter(b => b.status === 'occupied').length;
    const reserved = beds.filter(b => b.status === 'reserved').length;
    
    return { total, available, occupied, reserved };
  };

  const stats = getStats();
  const uniqueWards = Array.from(new Set(beds.map(b => b.ward)));

  const config = getHospitalConfig(hospitalId);
  
  return (
    <div className="space-y-6">
      {/* Hospital Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{config.name}</h2>
        <p className="text-gray-600 mb-4">Bed capacity: {config.icuBeds + config.generalBeds + config.isolationBeds} beds total</p>
      </div>
      
      {/* Bed Statistics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Bed className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Beds</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Occupied</p>
                <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Reserved</p>
                <p className="text-2xl font-bold text-blue-600">{stats.reserved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bed Layout Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="all">All Beds</TabsTrigger>
              <TabsTrigger value="icu">ICU</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="isolation">Isolation</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-6">
              {Object.entries(groupedBeds).map(([groupName, groupBeds]) => (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {getBedIcon(groupBeds[0]?.type)}
                    <h3 className="text-lg font-semibold capitalize">
                      {selectedType === 'all' ? `${groupName.toUpperCase()} Beds` : groupName}
                    </h3>
                    <Badge variant="outline">
                      {groupBeds.length} beds
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {groupBeds.map(bed => (
                      <Popover key={bed.id}>
                        <PopoverTrigger asChild>
                          <div
                            className={`
                              relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${getBedColor(bed.status)}
                              hover:scale-105 hover:shadow-lg
                            `}
                          >
                            <div className="text-center">
                              <div className="text-white text-xs font-medium">
                                {bed.number}
                              </div>
                              {bed.patientName && (
                                <div className="text-white text-xs opacity-80 truncate">
                                  {bed.patientName}
                                </div>
                              )}
                            </div>
                            
                            {/* Status indicator */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white border border-gray-300">
                              <div className={`w-full h-full rounded-full ${
                                bed.status === 'available' ? 'bg-green-400' :
                                bed.status === 'occupied' ? 'bg-red-400' : 'bg-blue-400'
                              }`}></div>
                            </div>
                          </div>
                        </PopoverTrigger>
                        
                        <PopoverContent className="w-56" side="top">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold">Bed {bed.number}</h4>
                              <p className="text-sm text-gray-600">{bed.ward} • Floor {bed.floor}</p>
                              {bed.patientName && (
                                <p className="text-sm text-blue-600">Patient: {bed.patientName}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              <Button
                                size="sm"
                                variant={bed.status === 'available' ? 'default' : 'outline'}
                                onClick={() => updateBedStatus(bed.id, 'available')}
                                className="text-xs"
                              >
                                🟢 Set Available
                              </Button>
                              <Button
                                size="sm"
                                variant={bed.status === 'occupied' ? 'default' : 'outline'}
                                onClick={() => updateBedStatus(bed.id, 'occupied')}
                                className="text-xs"
                              >
                                🔴 Set Occupied
                              </Button>
                              <Button
                                size="sm"
                                variant={bed.status === 'reserved' ? 'default' : 'outline'}
                                onClick={() => updateBedStatus(bed.id, 'reserved')}
                                className="text-xs"
                              >
                                🔵 Set Reserved
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}