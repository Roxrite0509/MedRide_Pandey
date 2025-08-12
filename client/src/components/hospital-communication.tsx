import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, User, Clock } from "lucide-react";

interface HospitalCommunicationProps {
  emergencyRequestId?: number;
}

export function HospitalCommunication({ emergencyRequestId }: HospitalCommunicationProps) {
  const [message, setMessage] = useState("");
  const { sendMessage: sendWebSocketMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: communications, isLoading } = useQuery({
    queryKey: ['/api/communications', emergencyRequestId],
    enabled: !!emergencyRequestId,
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/communications", data);
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/communications', emergencyRequestId] });
    },
    onError: () => {
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || !emergencyRequestId) return;

    // Send via WebSocket for real-time delivery
    sendWebSocketMessage({
      type: 'chat_message',
      emergencyRequestId,
      message: message.trim(),
    });

    // Also save to database
    sendMessageMutation.mutate({
      emergencyRequestId,
      message: message.trim(),
      messageType: 'text',
    });
  };

  if (!emergencyRequestId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Select an emergency request to start communication</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Communication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start animate-pulse">
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
                  <div className="flex-1">
                    <div className="w-32 h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="w-full h-3 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : communications && communications.length > 0 ? (
            <div className="space-y-3">
              {communications.map((comm: any) => (
                <div key={comm.id} className="flex items-start">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-sm font-medium text-gray-800 mb-1">
                        {comm.senderId === 'hospital' ? 'Hospital Staff' : 'Ambulance Team'}
                      </div>
                      <div className="text-sm text-gray-600">{comm.message}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(comm.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
