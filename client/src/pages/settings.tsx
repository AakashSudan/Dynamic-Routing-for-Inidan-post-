import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { NotificationPreference, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  BellIcon,
  CheckIcon,
  CloudIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  KeyIcon,
  LanguagesIcon,
  Loader2Icon,
  LockIcon,
  MapPinIcon,
  MoonIcon,
  SaveIcon,
  SunIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

// Define profile update schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

// Define password change schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Fetch notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery<NotificationPreference>({
    queryKey: ["/api/notification-preferences"],
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
        description: error.message || "Failed to update preferences.",
        variant: "destructive",
      });
    }
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    }
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwords: z.infer<typeof passwordFormSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Current password may be incorrect.",
        variant: "destructive",
      });
    }
  });
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });
  
  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Update profile on form submit
  function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    updateProfileMutation.mutate(values);
  }
  
  // Update password on form submit
  function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    changePasswordMutation.mutate(values);
  }
  
  // Toggle notification preference
  const handleTogglePreference = (field: keyof NotificationPreference) => {
    if (!preferences) return;
    
    updatePreferencesMutation.mutate({
      [field]: !preferences[field],
    });
  };
  
  // Handle theme change
  const handleThemeChange = (value: string) => {
    setTheme(value);
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Update appearance settings
  const [showAvatar, setShowAvatar] = useState(true);
  const [enableAnimation, setEnableAnimation] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [largeText, setLargeText] = useState(false);
  
  // Show success toast on appearance settings save
  const handleSaveAppearance = () => {
    toast({
      title: "Appearance Settings Saved",
      description: "Your display preferences have been updated.",
    });
  };
  
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 mt-1">Manage your account and application preferences</p>
          </div>
          
          <Tabs defaultValue="profile" className="space-y-6">
            <div className="bg-white rounded-lg p-1 inline-block mb-6 shadow-sm border">
              <TabsList className="grid grid-cols-4 h-9">
                <TabsTrigger value="profile" className="text-xs px-3">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs px-3">
                  <BellIcon className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs px-3">
                  <SunIcon className="h-4 w-4 mr-2" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs px-3">
                  <LockIcon className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <FormField
                            control={profileForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="md:w-64 flex flex-col items-center justify-start space-y-3">
                          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                            <UserIcon className="h-16 w-16 text-primary/40" />
                          </div>
                          <Button variant="outline" type="button" className="w-full">
                            Change Avatar
                          </Button>
                          <p className="text-xs text-slate-500 text-center">
                            Supported formats: JPEG, PNG, GIF
                            <br />Max size: 2MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <p className="text-sm text-slate-500">
                          <span className="font-medium text-slate-700">Account Type:</span>{" "}
                          <span className="capitalize">{user?.role}</span>
                        </p>
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <SaveIcon className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Regional Settings</CardTitle>
                  <CardDescription>
                    Configure your location and language preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FormLabel>Language</FormLabel>
                      <Select defaultValue="en">
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">
                            <div className="flex items-center">
                              <GlobeIcon className="h-4 w-4 mr-2" />
                              English
                            </div>
                          </SelectItem>
                          <SelectItem value="es">
                            <div className="flex items-center">
                              <GlobeIcon className="h-4 w-4 mr-2" />
                              Spanish
                            </div>
                          </SelectItem>
                          <SelectItem value="fr">
                            <div className="flex items-center">
                              <GlobeIcon className="h-4 w-4 mr-2" />
                              French
                            </div>
                          </SelectItem>
                          <SelectItem value="de">
                            <div className="flex items-center">
                              <GlobeIcon className="h-4 w-4 mr-2" />
                              German
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>Time Zone</FormLabel>
                      <Select defaultValue="america_new_york">
                        <SelectTrigger>
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="america_new_york">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              Eastern Time (US & Canada)
                            </div>
                          </SelectItem>
                          <SelectItem value="america_chicago">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              Central Time (US & Canada)
                            </div>
                          </SelectItem>
                          <SelectItem value="america_denver">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              Mountain Time (US & Canada)
                            </div>
                          </SelectItem>
                          <SelectItem value="america_los_angeles">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              Pacific Time (US & Canada)
                            </div>
                          </SelectItem>
                          <SelectItem value="europe_london">
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              London
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FormLabel>Date Format</FormLabel>
                      <Select defaultValue="mdy">
                        <SelectTrigger>
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>Distance Unit</FormLabel>
                      <Select defaultValue="miles">
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="miles">Miles</SelectItem>
                          <SelectItem value="kilometers">Kilometers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Regional Settings Saved",
                        description: "Your regional preferences have been updated.",
                      });
                    }}
                  >
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingPreferences ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : preferences ? (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-900">Notification Types</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Delay Notifications</FormLabel>
                              <FormDescription>Receive alerts when parcels are delayed</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.delayNotifications}
                              onCheckedChange={() => handleTogglePreference('delayNotifications')}
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Weather Alerts</FormLabel>
                              <FormDescription>Get notified about weather impacts on routes</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.weatherAlerts}
                              onCheckedChange={() => handleTogglePreference('weatherAlerts')}
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Status Changes</FormLabel>
                              <FormDescription>Updates when parcel status changes</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.statusChanges}
                              onCheckedChange={() => handleTogglePreference('statusChanges')}
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Delivery Confirmations</FormLabel>
                              <FormDescription>Notifications when parcels are delivered</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.deliveryConfirmations}
                              onCheckedChange={() => handleTogglePreference('deliveryConfirmations')}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-900">Communication Channels</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email</FormLabel>
                              <FormDescription>Send notifications to {user?.email}</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.emailEnabled}
                              onCheckedChange={() => handleTogglePreference('emailEnabled')}
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">SMS</FormLabel>
                              <FormDescription>Send text messages to {user?.phone || "No phone number"}</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.smsEnabled}
                              onCheckedChange={() => handleTogglePreference('smsEnabled')}
                              disabled={!user?.phone}
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Push Notifications</FormLabel>
                              <FormDescription>Receive push notifications in browser</FormDescription>
                            </div>
                            <Switch 
                              checked={preferences.pushEnabled}
                              onCheckedChange={() => handleTogglePreference('pushEnabled')}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <FormLabel>Notification Frequency</FormLabel>
                        <Select 
                          value={preferences.frequency} 
                          onValueChange={(value) => {
                            updatePreferencesMutation.mutate({ frequency: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                            <SelectItem value="hourly">Hourly Digest</SelectItem>
                            <SelectItem value="daily">Daily Summary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {preferences.frequency === "realtime" 
                            ? "You will receive notifications immediately as events occur."
                            : preferences.frequency === "hourly"
                            ? "You will receive a digest of notifications every hour."
                            : "You will receive a summary of all notifications once a day."}
                        </FormDescription>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48">
                      <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium">Could not load notification preferences</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] })}
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    disabled={isLoadingPreferences || updatePreferencesMutation.isPending}
                    onClick={() => {
                      toast({
                        title: "Notification Settings Saved",
                        description: "Your notification preferences have been updated.",
                      });
                    }}
                  >
                    {updatePreferencesMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme Settings</CardTitle>
                  <CardDescription>
                    Customize the appearance of the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-900">Color Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        variant="outline" 
                        className={`flex flex-col items-center justify-center h-24 ${theme === "light" ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleThemeChange("light")}
                      >
                        <SunIcon className="h-8 w-8 mb-2 text-amber-500" />
                        <span>Light</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className={`flex flex-col items-center justify-center h-24 ${theme === "dark" ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleThemeChange("dark")}
                      >
                        <MoonIcon className="h-8 w-8 mb-2 text-indigo-600" />
                        <span>Dark</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className={`flex flex-col items-center justify-center h-24 ${theme === "system" ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleThemeChange("system")}
                      >
                        <div className="flex mb-2">
                          <SunIcon className="h-4 w-4 text-amber-500" />
                          <span className="mx-1">/</span>
                          <MoonIcon className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span>System</span>
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-900">Display Options</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show User Avatar</FormLabel>
                          <FormDescription>Display user avatar in the header</FormDescription>
                        </div>
                        <Switch 
                          checked={showAvatar}
                          onCheckedChange={setShowAvatar}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Animations</FormLabel>
                          <FormDescription>Use animations throughout the interface</FormDescription>
                        </div>
                        <Switch 
                          checked={enableAnimation}
                          onCheckedChange={setEnableAnimation}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">High Contrast Mode</FormLabel>
                          <FormDescription>Increase contrast for better visibility</FormDescription>
                        </div>
                        <Switch 
                          checked={highContrastMode}
                          onCheckedChange={setHighContrastMode}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Large Text</FormLabel>
                          <FormDescription>Increase text size for better readability</FormDescription>
                        </div>
                        <Switch 
                          checked={largeText}
                          onCheckedChange={setLargeText}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSaveAppearance}>
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Map Display Settings</CardTitle>
                  <CardDescription>
                    Configure how maps and routes are displayed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FormLabel>Default Map View</FormLabel>
                      <Select defaultValue="hybrid">
                        <SelectTrigger>
                          <SelectValue placeholder="Select map type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="satellite">Satellite</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="terrain">Terrain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>Traffic Display</FormLabel>
                      <Select defaultValue="automatic">
                        <SelectTrigger>
                          <SelectValue placeholder="Select traffic display" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="always">Always Show</SelectItem>
                          <SelectItem value="automatic">Show When Relevant</SelectItem>
                          <SelectItem value="never">Never Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FormLabel>Route Color Scheme</FormLabel>
                      <Select defaultValue="mode">
                        <SelectTrigger>
                          <SelectValue placeholder="Select color scheme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mode">By Transport Mode</SelectItem>
                          <SelectItem value="status">By Status</SelectItem>
                          <SelectItem value="priority">By Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>Weather Overlay</FormLabel>
                      <Select defaultValue="automatic">
                        <SelectTrigger>
                          <SelectValue placeholder="Select weather display" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="always">Always Show</SelectItem>
                          <SelectItem value="automatic">Show When Relevant</SelectItem>
                          <SelectItem value="never">Never Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Map Settings Saved",
                        description: "Your map display preferences have been updated.",
                      });
                    }}
                  >
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Save Map Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to maintain account security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOffIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 8 characters long
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-2"
                        disabled={changePasswordMutation.isPending || !passwordForm.formState.isDirty}
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          <>
                            <KeyIcon className="mr-2 h-4 w-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage additional security features for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Two-Factor Authentication</FormLabel>
                        <FormDescription>
                          Add an extra layer of security to your account
                        </FormDescription>
                      </div>
                      <Button variant="outline">
                        Setup 2FA
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Sessions</FormLabel>
                        <FormDescription>
                          Manage devices where you're currently logged in
                        </FormDescription>
                      </div>
                      <Button variant="outline">
                        Manage Sessions
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Login History</FormLabel>
                        <FormDescription>
                          View recent login activity on your account
                        </FormDescription>
                      </div>
                      <Button variant="outline">
                        View History
                      </Button>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border bg-amber-50 text-amber-800 p-4 mt-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <div>
                        <h4 className="font-medium">Security Notice</h4>
                        <p className="text-sm mt-1">
                          Keep your password secure and never share it with anyone. Our staff will never ask for your password.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Manage data and account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-slate-900">Data Export</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">
                      Download a copy of your data and account information
                    </p>
                    <Button variant="outline">
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Request Data Export
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border border-red-200 p-4">
                    <h3 className="font-medium text-red-600">Danger Zone</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="destructive">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
