import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bed, Users, Activity, Heart, Shield, MapPin, Settings, RotateCcw } from 'lucide-react';
import { getHospitalPatientNames } from '@/data/patient-names';

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

  // OPTIMIZED HOSPITAL ACCESS: No mapping needed anymore
  // The backend now supports both hospital ID and user ID for all operations
  // This eliminates the need for frontend mapping and enables independent hospital operations

  // Direct access using either hospital ID or user ID (backend handles both)
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
        generalBeds: 60,
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

  // Generate bed data from server with enhanced patient info
  useEffect(() => {
    if (!bedStatusData || bedStatusLoading) {
      return;
    }

    // Authentic Indian patient names from expanded database
    const patientNames = getHospitalPatientNames(hospitalId);

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

    // Function to get proper ward description from bed number
    const getWardDescription = (bedNumber: string, bedType: string): string => {
      // ICU bed types
      if (bedNumber.startsWith('CICU-')) return 'Cardiac ICU';
      if (bedNumber.startsWith('NICU-')) return 'Neonatal ICU';
      if (bedNumber.startsWith('SICU-')) return 'Surgical ICU';
      if (bedNumber.startsWith('PICU-')) return 'Pediatric ICU';
      if (bedNumber.startsWith('MICU-')) return 'Medical ICU';
      if (bedNumber.startsWith('TICU-')) return 'Trauma ICU';
      if (bedNumber.startsWith('RICU-')) return 'Respiratory ICU';
      if (bedNumber.startsWith('CVICU-')) return 'Cardiovascular ICU';
      if (bedNumber.startsWith('CCU-')) return 'Cardiac Care Unit';
      if (bedNumber.startsWith('HDU-')) return 'High Dependency Unit';
      
      // Specialty wards
      if (bedNumber.startsWith('MAT-')) return 'Maternity Ward';
      if (bedNumber.startsWith('PED-')) return 'Pediatric Ward';
      if (bedNumber.startsWith('SUR-')) return 'Surgery Ward';
      if (bedNumber.startsWith('MED-')) return 'Medicine Ward';
      if (bedNumber.startsWith('ORT-') || bedNumber.startsWith('ORTH-')) return 'Orthopedic Ward';
      if (bedNumber.startsWith('NEU-')) return 'Neurology Ward';
      if (bedNumber.startsWith('ONC-')) return 'Oncology Ward';
      if (bedNumber.startsWith('CAR-')) return 'Cardiology Ward';
      if (bedNumber.startsWith('GAS-')) return 'Gastroenterology Ward';
      if (bedNumber.startsWith('URO-')) return 'Urology Ward';
      if (bedNumber.startsWith('ENT-')) return 'ENT Ward';
      if (bedNumber.startsWith('OBS-')) return 'Obstetrics Ward';
      if (bedNumber.startsWith('GYN-')) return 'Gynecology Ward';
      
      // Isolation beds (if any)
      if (bedType === 'isolation') return 'Isolation Ward';
      
      // General beds
      if (bedNumber.startsWith('GEN-')) return 'General Ward';
      
      // Fallback based on bed type
      return bedType === 'icu' ? 'ICU' : 'General Ward';
    };

    const hospitalBeds = bedStatusData.map((bedStatus: any) => {
      const wardDescription = getWardDescription(bedStatus.bedNumber, bedStatus.bedType);
      const wardPrefix = bedStatus.bedNumber.split('-')[0];
      const wardInfo = wardMappings[hospitalId]?.[wardPrefix] || { ward: wardDescription, floor: 1 };
      
      // Debug specific bed
      // if (bedStatus.bedNumber === 'PED-08') {
      //   console.log('Debug PED-08 bed data:', bedStatus);
      // }
      
      return {
        id: `bed-${bedStatus.id}`,
        number: bedStatus.bedNumber,
        status: bedStatus.status as 'available' | 'occupied' | 'reserved',
        ward: wardDescription, // Use the proper ward description
        type: bedStatus.bedType as 'icu' | 'general' | 'isolation',
        floor: wardInfo.floor,
        patientName: bedStatus.patientName // Use ONLY real patient names from database
      };
    });

    setBeds(hospitalBeds);
    console.log(`✅ Loaded ${hospitalBeds.length} beds for hospital ID ${hospitalId}`);
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
      case 'available': return 'bg-green-100 border-green-300 hover:bg-green-200';
      case 'occupied': return 'bg-red-100 border-red-300 hover:bg-red-200';
      case 'reserved': return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter beds based on selected ward and type
  const filteredBeds = beds.filter(bed => {
    const wardMatch = selectedWard === 'all' || bed.ward === selectedWard;
    const typeMatch = selectedType === 'all' || bed.type === selectedType;
    return wardMatch && typeMatch;
  });

  // Get unique wards for filtering
  const uniqueWards = [...new Set(beds.map(bed => bed.ward))];

  // Calculate bed statistics
  const stats = {
    total: beds.length,
    available: beds.filter(bed => bed.status === 'available').length,
    occupied: beds.filter(bed => bed.status === 'occupied').length,
    reserved: beds.filter(bed => bed.status === 'reserved').length,
    icu: beds.filter(bed => bed.type === 'icu').length,
    general: beds.filter(bed => bed.type === 'general').length
  };

  if (bedStatusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading bed status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hospital Bed Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Beds</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bed className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Occupied</p>
                <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">ICU Beds</p>
                <p className="text-2xl font-bold text-purple-600">{stats.icu}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bed Layout - Real-time Status</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enhanced Filter Section */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-sm border border-blue-100">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Ward Filter */}
                <div className="flex flex-col items-center">
                  <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Filter by Ward
                  </label>
                  <select 
                    value={selectedWard} 
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="min-w-[200px] border-2 border-blue-200 rounded-xl px-4 py-3 bg-white shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-700 font-medium"
                  >
                    <option value="all">🏥 All Wards</option>
                    {uniqueWards.map(ward => (
                      <option key={ward} value={ward}>
                        {ward === 'Cardiac ICU' ? '❤️' : 
                         ward === 'Neonatal ICU' ? '👶' :
                         ward === 'Surgical ICU' ? '🏥' :
                         ward === 'Maternity Ward' ? '🤱' :
                         ward === 'General Ward' ? '🛏️' : '🔹'} {ward}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Divider */}
                <div className="hidden md:block h-16 w-px bg-gradient-to-b from-blue-200 to-transparent"></div>

                {/* Type Filter */}
                <div className="flex flex-col items-center">
                  <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-indigo-600" />
                    Filter by Type
                  </label>
                  <select 
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="min-w-[200px] border-2 border-indigo-200 rounded-xl px-4 py-3 bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 text-gray-700 font-medium"
                  >
                    <option value="all">🏨 All Types</option>
                    <option value="icu">🚨 ICU Beds</option>
                    <option value="general">🛏️ General Beds</option>
                    <option value="isolation">🔒 Isolation Beds</option>
                  </select>
                </div>
                
                {/* Reset Filters Button */}
                <div className="flex flex-col items-center">
                  <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-gray-600" />
                    Quick Actions
                  </label>
                  <button
                    onClick={() => {
                      setSelectedWard('all');
                      setSelectedType('all');
                    }}
                    className="min-w-[120px] bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bed Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredBeds.map((bed) => (
              <Popover key={bed.id}>
                <PopoverTrigger asChild>
                  <div className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${getBedColor(bed.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      {getBedIcon(bed.type)}
                      <Badge className={`text-white text-xs ${getBadgeColor(bed.status)}`}>
                        {bed.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">{bed.number}</div>
                    <div className="text-xs text-gray-600">{bed.ward}</div>
                    {bed.patientName && (
                      <div className="text-xs font-medium mt-1 text-blue-600">{bed.patientName}</div>
                    )}
                    <div className="text-xs text-gray-500">Floor {bed.floor}</div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">{bed.number}</h3>
                      <p className="text-sm text-gray-600">{bed.ward} - Floor {bed.floor}</p>
                      <p className="text-sm">Type: {bed.type.toUpperCase()}</p>
                      {bed.patientName && (
                        <p className="text-sm"><strong>Patient:</strong> {bed.patientName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Update Status:</p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant={bed.status === 'available' ? 'default' : 'outline'}
                          onClick={() => updateBedStatus(bed.id, 'available')}
                        >
                          Available
                        </Button>
                        <Button 
                          size="sm" 
                          variant={bed.status === 'occupied' ? 'default' : 'outline'}
                          onClick={() => updateBedStatus(bed.id, 'occupied')}
                        >
                          Occupied
                        </Button>
                        <Button 
                          size="sm" 
                          variant={bed.status === 'reserved' ? 'default' : 'outline'}
                          onClick={() => updateBedStatus(bed.id, 'reserved')}
                        >
                          Reserved
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>

          {filteredBeds.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No beds found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}