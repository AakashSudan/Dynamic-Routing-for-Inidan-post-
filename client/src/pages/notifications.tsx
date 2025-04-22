import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Notification, NotificationPreference } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  BellIcon,
  BellOff,
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Truck,
  Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Notifications() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch notifications
  const { data: notifications, isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery<NotificationPreference>({
    queryKey: ["/api/notification-preferences"],
  });
  
  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });
  
  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPrefs: Partial<NotificationPreference>) => {
      const res = await apiRequest("PATCH", "/api/notification-preferences", updatedPrefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  });
  
  // Handle mark as read button click
  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };
  
  // Handle toggle notification setting
  const handleTogglePreference = (field: keyof NotificationPreference) => {
    if (!preferences) return;
    
    updatePreferencesMutation.mutate({
      [field]: !preferences[field],
    });
  };
  
  // Handle frequency change
  const handleFrequencyChange = (value: string) => {
    if (!preferences) return;
    
    updatePreferencesMutation.mutate({
      frequency: value,
    });
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Filter notifications
  const unreadNotifications = notifications?.filter(notification => !notification.read) || [];
  const readNotifications = notifications?.filter(notification => notification.read) || [];
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "delay":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "status_change":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "delivery":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "weather":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };
  
  // Get notification channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4 text-primary" />;
      case "sms":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "push":
        return <BellIcon className="h-4 w-4 text-amber-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 mt-1">View alerts and manage your notification preferences</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notifications Feed */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Notification Feed</CardTitle>
                    <CardDescription>Stay updated on your parcels</CardDescription>
                  </div>
                  
                  <Button variant="outline" size="sm" className="h-8">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs defaultValue="unread" className="h-full">
                  <div className="px-6 border-b">
                    <TabsList className="mt-0">
                      <TabsTrigger value="unread" className="relative">
                        Unread
                        {unreadNotifications.length > 0 && (
                          <Badge className="ml-2 bg-primary text-white">{unreadNotifications.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="all">All Notifications</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="unread" className="m-0">
                    <ScrollArea className="h-[400px]">
                      {isLoadingNotifications ? (
                        <div className="flex justify-center items-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : unreadNotifications.length > 0 ? (
                        <div className="p-4 space-y-4">
                          {unreadNotifications.map((notification) => (
                            <div key={notification.id} className="bg-slate-50 rounded-lg p-4 shadow-sm border-l-4 border-primary animate-fadeIn">
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mr-3 mt-1">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <p className="font-medium text-slate-900">{notification.message}</p>
                                    <time className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </time>
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="text-xs mr-2">
                                        {getChannelIcon(notification.channel)}
                                        <span className="ml-1 capitalize">{notification.channel}</span>
                                      </Badge>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {notification.type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      disabled={markAsReadMutation.isPending}
                                    >
                                      Mark as read
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                          <CheckCircle className="h-12 w-12 text-green-200 mb-4" />
                          <h3 className="text-lg font-medium text-slate-700">All caught up!</h3>
                          <p className="text-slate-500 mt-1">You have no unread notifications</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="all" className="m-0">
                    <ScrollArea className="h-[400px]">
                      {isLoadingNotifications ? (
                        <div className="flex justify-center items-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : notifications && notifications.length > 0 ? (
                        <div className="p-4 space-y-4">
                          {notifications.map((notification) => (
                            <div 
                              key={notification.id} 
                              className={`bg-white rounded-lg p-4 shadow-sm ${notification.read ? 'opacity-70' : 'border-l-4 border-primary'}`}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mr-3 mt-1">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <p className={`${notification.read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>
                                      {notification.message}
                                    </p>
                                    <time className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </time>
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="text-xs mr-2">
                                        {getChannelIcon(notification.channel)}
                                        <span className="ml-1 capitalize">{notification.channel}</span>
                                      </Badge>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {notification.type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    
                                    {!notification.read && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        disabled={markAsReadMutation.isPending}
                                      >
                                        Mark as read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                          <BellOff className="h-12 w-12 text-slate-200 mb-4" />
                          <h3 className="text-lg font-medium text-slate-700">No notifications yet</h3>
                          <p className="text-slate-500 mt-1">You'll receive updates about your parcels here</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <CardFooter className="flex justify-between border-t p-4">
                <p className="text-sm text-slate-500">
                  {notifications ? `${notifications.length} notifications total` : 'Loading notifications...'}
                </p>
                
                <Button variant="outline" size="sm" disabled={!notifications || notifications.length === 0}>
                  Mark all as read
                </Button>
              </CardFooter>
            </Card>
            
            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Customize how you receive notifications</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {isLoadingPreferences ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : preferences ? (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Notification Types</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="delay-notifications" 
                              checked={preferences.delayNotifications}
                              onCheckedChange={() => handleTogglePreference('delayNotifications')}
                            />
                            <Label htmlFor="delay-notifications" className="text-sm">Delay Notifications</Label>
                          </div>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="weather-alerts" 
                              checked={preferences.weatherAlerts}
                              onCheckedChange={() => handleTogglePreference('weatherAlerts')}
                            />
                            <Label htmlFor="weather-alerts" className="text-sm">Weather Alerts</Label>
                          </div>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="status-changes" 
                              checked={preferences.statusChanges}
                              onCheckedChange={() => handleTogglePreference('statusChanges')}
                            />
                            <Label htmlFor="status-changes" className="text-sm">Status Changes</Label>
                          </div>
                          <Truck className="h-4 w-4 text-blue-500" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="delivery-confirmations" 
                              checked={preferences.deliveryConfirmations}
                              onCheckedChange={() => handleTogglePreference('deliveryConfirmations')}
                            />
                            <Label htmlFor="delivery-confirmations" className="text-sm">Delivery Confirmations</Label>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Communication Channels</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="email-enabled" 
                              checked={preferences.emailEnabled}
                              onCheckedChange={() => handleTogglePreference('emailEnabled')}
                            />
                            <Label htmlFor="email-enabled" className="text-sm">Email</Label>
                          </div>
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="sms-enabled" 
                              checked={preferences.smsEnabled}
                              onCheckedChange={() => handleTogglePreference('smsEnabled')}
                            />
                            <Label htmlFor="sms-enabled" className="text-sm">SMS</Label>
                          </div>
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="push-enabled" 
                              checked={preferences.pushEnabled}
                              onCheckedChange={() => handleTogglePreference('pushEnabled')}
                            />
                            <Label htmlFor="push-enabled" className="text-sm">Push Notifications</Label>
                          </div>
                          <BellIcon className="h-4 w-4 text-amber-500" />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Delivery Frequency</h3>
                      <Select 
                        value={preferences.frequency} 
                        onValueChange={handleFrequencyChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <p className="text-xs text-slate-500">
                        {preferences.frequency === "realtime" 
                          ? "You will receive notifications immediately as events occur."
                          : preferences.frequency === "hourly"
                          ? "You will receive a digest of notifications every hour."
                          : "You will receive a summary of all notifications once a day."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <AlertCircle className="h-12 w-12 text-slate-200 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">No preferences found</h3>
                    <p className="text-slate-500 mt-1">Unable to load your notification preferences</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="border-t p-4">
                <Button 
                  className="w-full"
                  disabled={isLoadingPreferences || updatePreferencesMutation.isPending}
                  onClick={() => {
                    toast({
                      title: "Preferences Saved",
                      description: "Your notification preferences have been updated successfully.",
                    });
                  }}
                >
                  {updatePreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
