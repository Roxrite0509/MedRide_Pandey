import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmergencyButtonProps {
  disabled?: boolean;
  location?: { latitude: number; longitude: number } | null;
}

export function EmergencyButton({ disabled, location }: EmergencyButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emergencyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/emergency/request", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Emergency Request Sent",
        description: "Help is on the way! An ambulance will be dispatched shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      toast({
        title: "Emergency Request Failed",
        description: "Please try again or call emergency services directly.",
        variant: "destructive",
      });
    },
  });

  const handleMouseDown = () => {
    if (disabled || !location) return;
    
    setIsHolding(true);
    const timer = setTimeout(() => {
      if (isHolding) {
        triggerEmergencyRequest();
      }
    }, 2000);
    setHoldTimer(timer);
  };

  const handleMouseUp = () => {
    setIsHolding(false);
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  };

  const triggerEmergencyRequest = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please allow location access to send emergency request.",
        variant: "destructive",
      });
      return;
    }

    emergencyMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
      address: "Location detected via GPS",
      patientCondition: "Emergency situation",
      notes: "Emergency request from mobile app",
    });
  };

  return (
    <Button
      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-8 px-6 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 transform hover:scale-105 shadow-lg"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled || !location || emergencyMutation.isPending}
    >
      <AlertTriangle className="w-12 h-12 mb-3" />
      <span className="text-2xl mb-1">
        {emergencyMutation.isPending ? "SENDING..." : "EMERGENCY"}
      </span>
      <span className="text-sm text-red-100">
        {disabled ? "Request already active" : 
         !location ? "Waiting for location..." :
         "Press & Hold for 2 seconds"}
      </span>
    </Button>
  );
}
