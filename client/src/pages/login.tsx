import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, UserPlus, LogIn } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

// Helper function to create card grid overlay and sync heart position
function createCardGridOverlay(cardEl: HTMLElement | null) {
  if (!cardEl) return;
  const existing = document.getElementById('card-grid-overlay');
  if (existing) existing.remove();

  const rect = cardEl.getBoundingClientRect();

  const overlay = document.createElement('div');
  overlay.id = 'card-grid-overlay';
  overlay.style.position = 'absolute';
  overlay.style.pointerEvents = 'none';
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.zIndex = '2';
  overlay.style.borderRadius = window.getComputedStyle(cardEl).borderRadius || '32px';

  // stronger red pattern that matches the stark background grid
  overlay.style.backgroundImage = `repeating-linear-gradient(0deg, rgba(255,0,0,0.12) 0 1px, transparent 1px 32px),
                                   repeating-linear-gradient(90deg, rgba(255,0,0,0.12) 0 1px, transparent 1px 32px)`;
  overlay.style.backgroundSize = '32px 32px';
  overlay.style.filter = 'blur(0.5px)'; // slightly more blur for embedding effect
  overlay.style.mixBlendMode = 'multiply'; // blend mode for better integration

  document.body.appendChild(overlay);

  const sync = () => {
    const r = cardEl.getBoundingClientRect();
    overlay.style.left = `${r.left + window.scrollX}px`;
    overlay.style.top = `${r.top + window.scrollY}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    
    // Sync heart position with card for "stuck" effect
    syncHeartWithCard(r);
  };
  
  // Initial sync
  sync();
  
  window.addEventListener('resize', sync);
  window.addEventListener('scroll', sync);
}

// Function to sync heart position with login card
function syncHeartWithCard(cardRect: DOMRect) {
  // Only sync heart position on larger viewports (laptop size and above)
  if (window.innerWidth >= 1024 && window.innerHeight >= 600) {
    // Dispatch custom event to update heart position in AnimatedBackground
    const event = new CustomEvent('syncHeartPosition', {
      detail: {
        cardRect,
        centerX: (cardRect.left + cardRect.width / 2 - window.innerWidth / 2) / window.innerWidth * 2,
        centerY: -(cardRect.top + cardRect.height / 2 - window.innerHeight / 2) / window.innerHeight * 2
      }
    });
    window.dispatchEvent(event);
  }
}

export default function Login() {
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginData);
      toast({
        title: "Success",
        description: "Welcome back to EmergencyConnect!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    try {
      await register(registerData);
      toast({
        title: "Success",
        description: "Account created successfully! Welcome to EmergencyConnect.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Create grid overlay and sync heart position after component mounts
  useEffect(() => {
    const card = document.querySelector('.login-card') as HTMLElement | null;
    createCardGridOverlay(card);
    
    // Continuous sync for better responsiveness (only on larger viewports)
    const syncInterval = setInterval(() => {
      if (card && window.innerWidth >= 1024 && window.innerHeight >= 600) {
        const rect = card.getBoundingClientRect();
        syncHeartWithCard(rect);
      }
    }, 100); // Sync every 100ms for smooth responsiveness
    
    // Cleanup overlay and interval on unmount
    return () => {
      const existing = document.getElementById('card-grid-overlay');
      if (existing) existing.remove();
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
        <Card className="login-card mx-auto">
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">EmergencyConnect</CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">
              Connecting lives in critical moments
            </CardDescription>
          </CardHeader>
          <CardContent className="card-content p-4 sm:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12">
                <TabsTrigger value="login" className="text-sm sm:text-base">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-sm sm:text-base">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4 sm:mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginData.username || ""}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password || ""}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-10 sm:h-12 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base" disabled={isLoading}>
                    <LogIn className="w-4 h-4 mr-2" />
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-4 sm:mt-6">
                <div className="text-center p-4 sm:p-8">
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">Creating a new account? Use our enhanced registration form.</p>
                  <Button 
                    onClick={() => window.location.href = '/register'} 
                    className="bg-blue-600 hover:bg-blue-700 h-10 sm:h-12 text-sm sm:text-base w-full sm:w-auto"
                  >
                    Go to Enhanced Registration
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Secure authentication with JWT & encryption
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}