import { useState } from 'react';
// COMPLETELY NEW REGISTRATION FORM - Force reload v3.0
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, UserPlus, Ambulance, Building2 } from 'lucide-react';

// Hospital selection component for ambulance registration
function HospitalSelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const { data: hospitals, isLoading, error } = useQuery({
    queryKey: ['/api/hospitals'],
    retry: 1
  });

  console.log('Hospital dropdown data:', { hospitals, isLoading, error });

  if (isLoading) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading hospitals..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading" disabled>Loading hospitals...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (error) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled>
        <SelectTrigger>
          <SelectValue placeholder="Error loading hospitals" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="error" disabled>Failed to load hospitals</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select your preferred hospital" />
      </SelectTrigger>
      <SelectContent>
        {hospitals?.map((hospital: any) => (
          <SelectItem key={hospital.id} value={hospital.id.toString()}>
            {hospital.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Cache Buster: 1751955879142
export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'ambulance' | 'hospital'>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Common fields
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',

    // Role-specific fields
    // Hospital fields
    hospitalName: '',
    hospitalAddress: '',
    totalBeds: '',
    icuBeds: '',
    emergencyServices: [] as string[],

    // Ambulance fields
    selectedHospitalId: '',
    operatorPhone: '',
    licenseNumber: '',
    certification: '',
    hospitalAffiliation: '',
    equipmentLevel: '',

    // Patient fields
    emergencyContact: '',
    medicalConditions: '',
    bloodType: '',
    allergies: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyServices: prev.emergencyServices.includes(service)
        ? prev.emergencyServices.filter(s => s !== service)
        : [...prev.emergencyServices, service]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      // Validate ambulance specific requirements
      if (selectedRole === 'ambulance') {
        if (!formData.selectedHospitalId) {
          alert('Please select a preferred hospital for ambulance registration');
          return;
        }
        if (!formData.licenseNumber) {
          alert('License number is required for ambulance operators');
          return;
        }
        if (!formData.certification) {
          alert('Certification level is required for ambulance operators');
          return;
        }
        if (!formData.equipmentLevel) {
          alert('Equipment level is required for ambulance operators');
          return;
        }
      }

      // Debug: Log form data before submission
      console.log('Form submission data:', {
        selectedRole,
        formData: {
          selectedHospitalId: formData.selectedHospitalId,
          licenseNumber: formData.licenseNumber,
          certification: formData.certification,
          equipmentLevel: formData.equipmentLevel
        }
      });

      // Prepare registration data based on role
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: selectedRole,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,

        // Role-specific data
        ...(selectedRole === 'hospital' && {
          hospitalName: formData.hospitalName,
          hospitalAddress: formData.hospitalAddress,
          totalBeds: parseInt(formData.totalBeds) || 0,
          icuBeds: parseInt(formData.icuBeds) || 0,
          emergencyServices: formData.emergencyServices
        }),

        ...(selectedRole === 'ambulance' && {
          operatorPhone: formData.operatorPhone,
          licenseNumber: formData.licenseNumber,
          certification: formData.certification,
          selectedHospitalId: formData.selectedHospitalId ? parseInt(formData.selectedHospitalId) : undefined,
          equipmentLevel: formData.equipmentLevel
        }),

        ...(selectedRole === 'patient' && {
          emergencyContact: formData.emergencyContact,
          medicalConditions: formData.medicalConditions,
          bloodType: formData.bloodType,
          allergies: formData.allergies
        })
      };

      await register(registrationData);
      setLocation('/');
    } catch (error: any) {
      alert(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyServiceOptions = [
    'Emergency Room',
    'Trauma Center',
    'Cardiac Care',
    'Stroke Center',
    'Burn Unit',
    'Pediatric Emergency',
    'Maternity Ward',
    'Mental Health Crisis'
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4 lg:p-6">
      <Card className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center justify-center space-x-2">
            <UserPlus className="w-8 h-8 text-blue-600" />
            <span>Join EmergencyConnect v3.0</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Create your account to access emergency response services
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-version="v3.0-cache-bust-1751955879142">
            {/* Role Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Choose Your Role (NEW FORM LOADED)</Label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${selectedRole === 'patient'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setSelectedRole('patient')}
                >
                  <User className="w-6 h-6" />
                  <span className="font-medium">Patient</span>
                </button>
                <button
                  type="button"
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${selectedRole === 'ambulance'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setSelectedRole('ambulance')}
                >
                  <Ambulance className="w-6 h-6" />
                  <span className="font-medium">Ambulance Operator</span>
                </button>
                <button
                  type="button"
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${selectedRole === 'hospital'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setSelectedRole('hospital')}
                >
                  <Building2 className="w-6 h-6" />
                  <span className="font-medium">Hospital Staff</span>
                </button>
              </div>
            </div>

            <Separator />

            {/* Basic Information - Common for all roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
                <div></div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Role-specific forms */}
            {selectedRole === 'ambulance' && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center space-x-2 mb-4">
                  <Ambulance className="w-5 h-5 text-orange-500" />
                  <span>Ambulance Operator Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="selectedHospitalId">Preferred Hospital *</Label>
                    <HospitalSelect
                      value={formData.selectedHospitalId}
                      onValueChange={(value) => handleInputChange('selectedHospitalId', value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="operatorPhone">Operator Phone Number *</Label>
                    <Input
                      id="operatorPhone"
                      value={formData.operatorPhone}
                      onChange={(e) => handleInputChange('operatorPhone', e.target.value)}
                      placeholder="+91-9999999999"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseNumber">License Number *</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="EMT/Paramedic license"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="certification">Certification Level *</Label>
                    <Select value={formData.certification} onValueChange={(value) => handleInputChange('certification', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select certification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basic Life Support">Basic Life Support</SelectItem>
                        <SelectItem value="Advanced Life Support">Advanced Life Support</SelectItem>
                        <SelectItem value="Critical Care Transport">Critical Care Transport</SelectItem>
                        <SelectItem value="Neonatal Intensive Care">Neonatal Intensive Care</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="equipmentLevel">Equipment Level *</Label>
                    <Select value={formData.equipmentLevel} onValueChange={(value) => handleInputChange('equipmentLevel', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Level 1">Level 1 - Basic Equipment</SelectItem>
                        <SelectItem value="Level 2">Level 2 - Advanced Equipment</SelectItem>
                        <SelectItem value="Level 3">Level 3 - Critical Care Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Your ambulance vehicle number and profile will be automatically assigned (e.g., AMB-006)

                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'hospital' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center space-x-2 mb-4">
                  <Building2 className="w-5 h-5 text-green-500" />
                  <span>Hospital Information</span>
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hospitalName">Hospital Name *</Label>
                      <Input
                        id="hospitalName"
                        value={formData.hospitalName}
                        onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                        placeholder="e.g., City General Hospital"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="hospitalAddress">Hospital Address *</Label>
                      <Input
                        id="hospitalAddress"
                        value={formData.hospitalAddress}
                        onChange={(e) => handleInputChange('hospitalAddress', e.target.value)}
                        placeholder="Full address"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="totalBeds">Total Beds *</Label>
                      <Input
                        id="totalBeds"
                        type="number"
                        value={formData.totalBeds}
                        onChange={(e) => handleInputChange('totalBeds', e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="icuBeds">ICU Beds *</Label>
                      <Input
                        id="icuBeds"
                        type="number"
                        value={formData.icuBeds}
                        onChange={(e) => handleInputChange('icuBeds', e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Emergency Services Offered</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {emergencyServiceOptions.map(service => (
                        <div
                          key={service}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${formData.emergencyServices.includes(service)
                              ? 'bg-blue-100 border-blue-500 text-blue-700'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          onClick={() => handleServiceToggle(service)}
                        >
                          <div className="text-sm font-medium">{service}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'patient' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Medical Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Name and phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <Select value={formData.bloodType} onValueChange={(value) => handleInputChange('bloodType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="medicalConditions">Medical Conditions</Label>
                    <Input
                      id="medicalConditions"
                      value={formData.medicalConditions}
                      onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                      placeholder="Any chronic conditions, medications, etc."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Input
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      placeholder="Food, drug, or environmental allergies"
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/login')}
              >
                Already have an account? Sign In
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}