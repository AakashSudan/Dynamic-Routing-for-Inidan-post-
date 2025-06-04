import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Parcel, insertParcelSchema } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  ClockIcon,
  Eye,
  Loader2,
  PackageIcon,
  PackagePlus,
  QrCode,
  Search,
  Send,
  TruckIcon,
  TrainIcon,
  PlaneIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";
import NewParcel from "@/components/layout/newparcel";



export default function ParcelTracking() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch parcels
  const { data: parcels, isLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
  });


  // Update parcel status mutation
  const updateParcelStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/parcels/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({
        title: "Status Updated",
        description: "The parcel status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Add delete mutation
  const deleteParcelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/parcels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({ title: "Parcel Deleted", description: "The parcel has been deleted." });
      setSelectedParcelId(null);
    },
    onError: (error) => {
      toast({ title: "Failed to Delete Parcel", description: error.message, variant: "destructive" });
    },
  });


  // Filter parcels based on search term
  const filteredParcels = parcels?.filter(
    (parcel) => 
      parcel.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.destination.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get selected parcel
  const selectedParcel = parcels?.find(parcel => parcel.id === selectedParcelId);

  // Handle status change
  const handleStatusChange = (parcelId: number, newStatus: string) => {
    updateParcelStatusMutation.mutate({ id: parcelId, status: newStatus });
  };

  // Generate QR Code
  const handleGenerateQR = (trackingNumber: string) => {
    setQrCodeValue(`https://mailroutepro.com/track/${trackingNumber}`);
    setShowQRCode(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "in_transit":
        return "bg-green-100 text-green-800";
      case "delayed":
        return "bg-amber-100 text-amber-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "customs_check":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
  
  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "road":
        return <TruckIcon className="h-4 w-4" />;
      case "rail":
        return <TrainIcon className="h-4 w-4" />;
      case "air":
        return <PlaneIcon className="h-4 w-4" />;
      case "multimodal":
        return (
          <div className="flex">
            <TruckIcon className="h-4 w-4 mr-1" />
            <PlaneIcon className="h-4 w-4" />
          </div>
        );
      default:
        return <TruckIcon className="h-4 w-4" />;
    }
  };

  const getParcelProgress = (status: string) => {
    switch (status) {
      case "preparing":
        return 25;
      case "in_transit":
        return 50;
      case "customs_check":
        return 75;
      case "delivered":
        return 100;
      case "delayed":
        return 50; // Same as in_transit but with warning indicator
      default:
        return 0;
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Parcel Tracking</h1>
              <p className="text-slate-500 mt-1">Track and manage parcels with real-time updates</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search by tracking # or location..."
                  className="pl-10 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <NewParcel/>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parcels List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Parcels</CardTitle>
                <CardDescription>Track and manage your shipments</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {isLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredParcels.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      {filteredParcels.map((parcel) => {
                        const parcelWithUser = parcel as Parcel & { user?: any };
                        return (
                          <Card 
                            key={parcel.id} 
                            className={`overflow-hidden cursor-pointer transition-all ${selectedParcelId === parcel.id ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => setSelectedParcelId(parcel.id)}
                          >
                            <div className={`h-2 ${parcel.status === 'delayed' ? 'bg-amber-500' : 'bg-primary'}`}></div>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-mono font-medium">{parcel.trackingNumber}</p>
                                <Badge className={getStatusBadgeClass(parcel.status)}>
                                  {parcel.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              </div>
                              
                              {/* Show sender info for admin/staff */}
                              {/* {user?.role !== "sender" && parcelWithUser.user && (
                                <div className="mb-2 text-xs text-slate-500">
                                  <div>Sender:</div>
                                  <div className="ml-2">
                                    <div>Name: <span className="font-medium">{parcelWithUser.user.fullName}</span></div>
                                    <div>Username: <span className="font-mono">{parcelWithUser.user.username}</span></div>
                                    <div>Email: <span className="font-mono">{parcelWithUser.user.email}</span></div>
                                    {parcelWithUser.user.phone && (
                                      <div>Phone: <span className="font-mono">{parcelWithUser.user.phone}</span></div>
                                    )}
                                  </div>
                                </div>
                              )} */}
                              
                              <div className="mb-2">
                                <p className="text-sm text-slate-600 flex items-center">
                                  <span className="inline-block w-16">From:</span> 
                                  <span className="font-medium">{parcel.origin}</span>
                                </p>
                                <p className="text-sm text-slate-600 flex items-center">
                                  <span className="inline-block w-16">To:</span> 
                                  <span className="font-medium">{parcel.destination}</span>
                                </p>
                              </div>
                              
                              <div className="flex justify-between items-center mt-4">
                                <div className="flex items-center text-xs text-slate-500">
                                  <ClockIcon className="h-3 w-3 mr-1" />
                                  {parcel.estimatedDelivery ? (
                                    <span>ETA: {format(new Date(parcel.estimatedDelivery), "MMM d, yyyy")}</span>
                                  ) : (
                                    <span>No ETA available</span>
                                  )}
                                </div>
                                
                                <div className="flex">
                                  {getTransportIcon(parcel.transportMode)}
                                </div>
                              </div>
                              
                              <Progress className="mt-3" value={getParcelProgress(parcel.status)} />
                              
                              {/* Delete button for admin/staff */}
                              {user?.role !== "sender" && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="mt-3 w-full"
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (window.confirm("Are you sure you want to delete this parcel?")) {
                                      deleteParcelMutation.mutate(parcel.id);
                                    }
                                  }}
                                  disabled={deleteParcelMutation.isPending}
                                >
                                  Delete Parcel
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10">
                    <PackageIcon className="h-16 w-16 text-slate-300 mb-4" />
                    <p className="text-slate-500 text-lg">No parcels found</p>
                    {searchTerm ? (
                      <p className="text-slate-400 text-sm mt-2">Try a different search term</p>
                    ) : (
                      <p className="text-slate-400 text-sm mt-2">Create a new parcel to get started</p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4">
                <div className="text-sm text-slate-500">
                  Showing {filteredParcels.length} parcels
                </div>
                <Button variant="outline" onClick={() => setSearchTerm("")} disabled={!searchTerm}>
                  Clear Search
                </Button>
              </CardFooter>
            </Card>
            
            {/* Parcel Details */}
            <Card>
              <CardHeader>
                <CardTitle>Parcel Details</CardTitle>
                <CardDescription>
                  {selectedParcel 
                    ? `Tracking information for ${selectedParcel.trackingNumber}`
                    : "Select a parcel to view details"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedParcel ? (
                  <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center mb-4">
                          <div className={`w-3 h-3 rounded-full mr-2 ${selectedParcel.status === 'delayed' ? 'bg-amber-500' : selectedParcel.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          <h3 className="font-medium">Status: <span className="capitalize">{selectedParcel.status.replace('_', ' ')}</span></h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {/* Sender info for admin/staff */}
                          {user?.role !== "sender" && selectedParcel.user && (
                            <div className="mb-4 text-slate-500">
                              <div>Sender Info</div>
                                <div className="ml-2">
                                  <div>Name: <span className="font-medium">{selectedParcel.user.fullName}</span></div>
                                  <div>Username: <span className="font-mono">{selectedParcel.user.username}</span></div>
                                  <div>Email: <span className="font-mono">{selectedParcel.user.email}</span></div>
                                  {selectedParcel.user.phone && (
                                    <div>Phone: <span className="font-mono">{selectedParcel.user.phone}</span></div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                          <div>
                            <p className="text-slate-500">Tracking Number</p>
                            <p className="font-mono font-medium">{selectedParcel.trackingNumber}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Transport Mode</p>
                            <p className="font-medium capitalize flex items-center">
                              {getTransportIcon(selectedParcel.transportMode)}
                              <span className="ml-1">{selectedParcel.transportMode}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Origin</p>
                            <p className="font-medium">{selectedParcel.origin}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Destination</p>
                            <p className="font-medium">{selectedParcel.destination}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Current Location</p>
                            <p className="font-medium">{selectedParcel.currentLocation || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Weight</p>
                            <p className="font-medium">{selectedParcel.weight}</p>
                          </div>
                          {selectedParcel.dimensions && (
                            <div>
                              <p className="text-slate-500">Dimensions</p>
                              <p className="font-medium">{selectedParcel.dimensions}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-500">Created At</p>
                            <p className="font-medium">{format(new Date(selectedParcel.createdAt), "MMM d, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Estimated Delivery</p>
                            <p className="font-medium">
                              {selectedParcel.estimatedDelivery 
                                ? format(new Date(selectedParcel.estimatedDelivery), "MMM d, yyyy")
                                : "Not available"}
                            </p>
                          </div>
                          {selectedParcel.status === "delivered" && selectedParcel.actualDelivery && (
                            <div>
                              <p className="text-slate-500">Actual Delivery</p>
                              <p className="font-medium">{format(new Date(selectedParcel.actualDelivery), "MMM d, yyyy")}</p>
                            </div>
                          )}
                        </div>
                        
                        {selectedParcel.notes && (
                          <div className="mt-4 border-t pt-4">
                            <p className="text-slate-500 text-sm">Notes</p>
                            <p className="text-sm mt-1">{selectedParcel.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Update Options - For staff/admin only */}
                      {user?.role !== "sender" && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-medium mb-3">Update Status</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={selectedParcel.status === "preparing"}
                              onClick={() => handleStatusChange(selectedParcel.id, "preparing")}
                            >
                              Preparing
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={selectedParcel.status === "in_transit"}
                              onClick={() => handleStatusChange(selectedParcel.id, "in_transit")}
                            >
                              In Transit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={selectedParcel.status === "customs_check"}
                              onClick={() => handleStatusChange(selectedParcel.id, "customs_check")}
                            >
                              Customs Check
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={selectedParcel.status === "delayed"}
                              onClick={() => handleStatusChange(selectedParcel.id, "delayed")}
                            >
                              Delayed
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="col-span-2"
                              disabled={selectedParcel.status === "delivered"}
                              onClick={() => handleStatusChange(selectedParcel.id, "delivered")}
                            >
                              Mark as Delivered
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button 
                          className="flex-1" 
                          variant="outline"
                          onClick={() => handleGenerateQR(selectedParcel.trackingNumber)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate QR
                        </Button>
                        <Button className="flex-1">
                          <Send className="mr-2 h-4 w-4" />
                          Send Update
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="timeline">
                      <div className="relative pl-6 pb-10">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
                        
                        {/* Timeline events */}
                        <div className="relative mb-8">
                          <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                          <div className="mb-2 text-sm font-medium">Order Created</div>
                          <time className="text-xs text-slate-500 mb-2 block">
                            {format(new Date(selectedParcel.createdAt), "MMM d, yyyy - h:mm a")}
                          </time>
                          <p className="text-sm text-slate-600">
                            Parcel registered in the system with tracking number {selectedParcel.trackingNumber}
                          </p>
                        </div>
                        
                        {selectedParcel.status !== "preparing" && (
                          <div className="relative mb-8">
                            <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                            <div className="mb-2 text-sm font-medium">Shipment Prepared</div>
                            <time className="text-xs text-slate-500 mb-2 block">
                              {format(new Date(selectedParcel.createdAt), "MMM d, yyyy - h:mm a")}
                            </time>
                            <p className="text-sm text-slate-600">
                              Parcel has been prepared and is ready for shipping from {selectedParcel.origin}
                            </p>
                          </div>
                        )}
                        
                        {(selectedParcel.status === "in_transit" || selectedParcel.status === "delayed" || selectedParcel.status === "customs_check" || selectedParcel.status === "delivered") && (
                          <div className="relative mb-8">
                            <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                            <div className="mb-2 text-sm font-medium">In Transit</div>
                            <time className="text-xs text-slate-500 mb-2 block">
                              {format(new Date(selectedParcel.createdAt), "MMM d, yyyy - h:mm a")}
                            </time>
                            <p className="text-sm text-slate-600">
                              Parcel is in transit from {selectedParcel.origin} to {selectedParcel.destination} via {selectedParcel.transportMode}
                            </p>
                          </div>
                        )}
                        
                        {selectedParcel.status === "delayed" && (
                          <div className="relative mb-8">
                            <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-amber-500 bg-white" />
                            <div className="mb-2 text-sm font-medium text-amber-700">Delay Reported</div>
                            <time className="text-xs text-slate-500 mb-2 block">
                              {format(new Date(), "MMM d, yyyy - h:mm a")}
                            </time>
                            <p className="text-sm text-slate-600">
                              {selectedParcel.delayReason || "Shipment has been delayed. New estimated delivery time will be provided soon."}
                            </p>
                          </div>
                        )}
                        
                        {selectedParcel.status === "customs_check" && (
                          <div className="relative mb-8">
                            <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-purple-500 bg-white" />
                            <div className="mb-2 text-sm font-medium text-purple-700">Customs Check</div>
                            <time className="text-xs text-slate-500 mb-2 block">
                              {format(new Date(), "MMM d, yyyy - h:mm a")}
                            </time>
                            <p className="text-sm text-slate-600">
                              Parcel is undergoing customs inspection
                            </p>
                          </div>
                        )}
                        
                        {selectedParcel.status === "delivered" && (
                          <div className="relative">
                            <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-green-500 bg-green-500" />
                            <div className="mb-2 text-sm font-medium text-green-700">Delivered</div>
                            <time className="text-xs text-slate-500 mb-2 block">
                              {selectedParcel.actualDelivery 
                                ? format(new Date(selectedParcel.actualDelivery), "MMM d, yyyy - h:mm a")
                                : format(new Date(), "MMM d, yyyy - h:mm a")}
                            </time>
                            <p className="text-sm text-slate-600">
                              Parcel has been successfully delivered to {selectedParcel.destination}
                            </p>
                            <div className="mt-2 flex items-center text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Delivery confirmed
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 h-[300px]">
                    <Eye className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500">Select a parcel to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Parcel Tracking QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to track your parcel
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center p-4">
            <div className="bg-white p-4 rounded-md">
              <QRCodeSVG value={qrCodeValue} size={200} />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowQRCode(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
