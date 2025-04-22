import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NotificationPreference } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function NotificationSetup() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Partial<NotificationPreference>>({
    delayNotifications: true,
    weatherAlerts: true,
    statusChanges: true,
    deliveryConfirmations: true,
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    frequency: "realtime"
  });
  
  const { data, isLoading } = useQuery<NotificationPreference>({
    queryKey: ["/api/notification-preferences"],
    onSuccess: (data) => {
      setPreferences(data);
    },
  });
  
  const updateMutation = useMutation({
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
  
  const handleSaveSettings = () => {
    updateMutation.mutate(preferences);
  };
  
  const handleCheckboxChange = (field: keyof NotificationPreference) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const handleFrequencyChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      frequency: value
    }));
  };

  return (
    <Card>
      <CardHeader className="p-4 border-b border-slate-200">
        <CardTitle className="font-semibold text-slate-800">Notification Setup</CardTitle>
        <p className="text-sm text-slate-500 mt-1">Configure automated alerts for stakeholders</p>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Alert Types</Label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox 
                    id="delay-alerts" 
                    checked={preferences.delayNotifications} 
                    onCheckedChange={() => handleCheckboxChange('delayNotifications')}
                  />
                  <Label htmlFor="delay-alerts" className="ml-2 text-sm text-slate-700">
                    Delay Notifications
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="weather-alerts" 
                    checked={preferences.weatherAlerts} 
                    onCheckedChange={() => handleCheckboxChange('weatherAlerts')}
                  />
                  <Label htmlFor="weather-alerts" className="ml-2 text-sm text-slate-700">
                    Weather Alerts
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="status-change" 
                    checked={preferences.statusChanges} 
                    onCheckedChange={() => handleCheckboxChange('statusChanges')}
                  />
                  <Label htmlFor="status-change" className="ml-2 text-sm text-slate-700">
                    Status Changes
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="delivery-alerts" 
                    checked={preferences.deliveryConfirmations} 
                    onCheckedChange={() => handleCheckboxChange('deliveryConfirmations')}
                  />
                  <Label htmlFor="delivery-alerts" className="ml-2 text-sm text-slate-700">
                    Delivery Confirmations
                  </Label>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Communication Channels</Label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox 
                    id="email-alerts" 
                    checked={preferences.emailEnabled} 
                    onCheckedChange={() => handleCheckboxChange('emailEnabled')}
                  />
                  <Label htmlFor="email-alerts" className="ml-2 text-sm text-slate-700">
                    Email
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="sms-alerts" 
                    checked={preferences.smsEnabled} 
                    onCheckedChange={() => handleCheckboxChange('smsEnabled')}
                  />
                  <Label htmlFor="sms-alerts" className="ml-2 text-sm text-slate-700">
                    SMS
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="push-alerts" 
                    checked={preferences.pushEnabled} 
                    onCheckedChange={() => handleCheckboxChange('pushEnabled')}
                  />
                  <Label htmlFor="push-alerts" className="ml-2 text-sm text-slate-700">
                    Push Notifications
                  </Label>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="frequency" className="block text-sm font-medium text-slate-700 mb-1">
                Notification Frequency
              </Label>
              <Select 
                value={preferences.frequency} 
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger id="frequency" className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        
        <Separator className="my-4" />
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings} 
            disabled={updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
