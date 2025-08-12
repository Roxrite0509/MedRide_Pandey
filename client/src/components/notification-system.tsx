import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface Notification {
  id: string;
  type: 'emergency' | 'ambulance' | 'hospital' | 'communication';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  data?: any;
}

interface NotificationSystemProps {
  userRole: string;
  userId: number;
}

export function NotificationSystem({ userRole, userId }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { lastMessage } = useWebSocket();
  const { toast } = useToast();

  // Handle incoming WebSocket messages and convert to notifications
  useEffect(() => {
    if (lastMessage && lastMessage.event && lastMessage.data) {
      const { event, data } = lastMessage;
      let newNotification: Notification | null = null;

      try {
        switch (event) {
          case 'new_emergency_request':
            if (userRole === 'ambulance' && data?.id) {
              newNotification = {
                id: `emergency-${data.id}-${Date.now()}`,
                type: 'emergency',
                title: 'New Emergency Request',
                message: `${data?.patientCondition || 'Emergency'} - ${data?.address || 'Location not provided'}`,
                priority: data?.priority || 'high',
                timestamp: new Date(),
                read: false,
                actionable: true,
                data
              };
            }
            break;

          case 'ambulance_response':
            if (userRole === 'patient' && data?.patientId === userId && data?.id) {
              newNotification = {
                id: `ambulance-${data.id}-${Date.now()}`,
                type: 'ambulance',
                title: (data?.status === 'accepted') ? 'Ambulance Dispatched' : 'Request Update',
                message: (data?.status === 'accepted') 
                  ? 'Emergency services are on their way to your location'
                  : 'Your emergency request status has been updated',
                priority: (data?.status === 'accepted') ? 'high' : 'medium',
                timestamp: new Date(),
                read: false,
                actionable: false,
                data
              };
            }
            break;

          case 'emergency_status_update':
            if (data?.requestId) {
              newNotification = {
                id: `status-${data.requestId}-${Date.now()}`,
                type: 'emergency',
                title: 'Emergency Status Update',
                message: `Emergency request status: ${data?.status || 'updated'}`,
                priority: 'medium',
                timestamp: new Date(),
                read: false,
                actionable: false,
                data
              };
            }
            break;

          case 'new_message':
            if (data?.receiverId === userId && data?.receiverRole === userRole && data?.id) {
              newNotification = {
                id: `message-${data.id}-${Date.now()}`,
                type: 'communication',
                title: 'New Message',
                message: `${data?.senderRole || 'User'}: ${(data?.message || '').substring(0, 50)}...`,
                priority: 'medium',
                timestamp: new Date(),
                read: false,
                actionable: true,
                data
              };
            }
            break;

          case 'hospital_bed_update':
            if (userRole === 'ambulance' && data?.hospitalId) {
              newNotification = {
                id: `bed-${data.hospitalId}-${Date.now()}`,
                type: 'hospital',
                title: 'Hospital Bed Availability',
                message: `${data?.hospitalName || 'Hospital'}: ${data?.availableBeds || 0} beds available`,
                priority: 'low',
                timestamp: new Date(),
                read: false,
                actionable: false,
                data
              };
            }
            break;

          default:
            // Unknown message type, create generic notification
            if (data && event) {
              newNotification = {
                id: `generic-${Date.now()}`,
                type: 'communication',
                title: 'System Notification',
                message: `Received: ${event}`,
                priority: 'low',
                timestamp: new Date(),
                read: false,
                actionable: false,
                data
              };
            }
        }

        if (newNotification) {
          setNotifications(prev => [newNotification!, ...prev].slice(0, 20)); // Keep last 20 notifications
          
          // Show toast for critical/high priority notifications
          if (newNotification.priority === 'critical' || newNotification.priority === 'high') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.priority === 'critical' ? 'destructive' : 'default',
            });
          }
        }
      } catch (error) {
        console.warn('Notification processing error:', error);
      }
    }
  }, [lastMessage, userRole, userId, toast]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(notification.type)}
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}