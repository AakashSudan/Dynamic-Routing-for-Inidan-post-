import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Parcel } from "@shared/schema";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchIcon, TruckIcon, TrainIcon, PlaneIcon, QrCodeIcon, BellIcon, EyeIcon, QrCode} from "lucide-react";
import { format, set } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import NewParcel from "../layout/newparcel.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

export function ParcelTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState("");
  
  const { data: parcels, isLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
    staleTime: 60000, // 1 minute
  });
  
  // Filter parcels based on search term
  const filteredParcels = parcels?.filter(
    (parcel) => 
      parcel.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.destination.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Show only the latest 4 parcels
  const displayedParcels = filteredParcels.slice(0, 4);
  
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
        return <TruckIcon className="text-slate-400 h-4 w-4 mr-2" />;
      case "rail":
        return <TrainIcon className="text-slate-400 h-4 w-4 mr-2" />;
      case "air":
        return <PlaneIcon className="text-slate-400 h-4 w-4 mr-2" />;
      case "multimodal":
        return (
          <div className="flex">
            <TruckIcon className="text-slate-400 h-4 w-4 mr-1" />
            <PlaneIcon className="text-slate-400 h-4 w-4 mx-1" />
          </div>
        );
      default:
        return <TruckIcon className="text-slate-400 h-4 w-4 mr-2" />;
    }
  };
  
  const handleGenerateQR = (trackingNumber: string) => {
    setQrCodeValue(`https://mailroutepro.com/track/${trackingNumber}`);
    setShowQRCode(true);
  };
  
  const handleSendAlert = (trackingNumber: string) => {
    toast({
      title: "Alert Sent",
      description: `Alert for tracking number ${trackingNumber} has been sent.`,
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-semibold text-slate-800">Recent Parcels</CardTitle>
        <div className="flex items-center">
          <div className="mr-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search parcels..."
                className="bg-slate-100 w-64 pl-10 h-9 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <NewParcel/>
        </div>
      </CardHeader>
      <Dialog open={!!selectedParcel} onOpenChange={() => setSelectedParcel(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Parcel Details</DialogTitle>
            <DialogDescription>
              {selectedParcel && (
                <>
                  Tracking Number: <span className="font-mono">{selectedParcel.trackingNumber}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedParcel && (
            <div className="space-y-2 text-sm">
              <div><strong>Origin:</strong> {selectedParcel.origin}</div>
              <div><strong>Destination:</strong> {selectedParcel.destination}</div>
              <div><strong>Status:</strong> {selectedParcel.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              <div><strong>Transport Mode:</strong> {selectedParcel.transportMode}</div>
              <div><strong>Weight:</strong> {selectedParcel.weight}</div>
              {selectedParcel.dimensions && <div><strong>Dimensions:</strong> {selectedParcel.dimensions}</div>}
              <div><strong>Current Location:</strong> {selectedParcel.currentLocation || "N/A"}</div>
              {selectedParcel.estimatedDelivery && (
                <div>
                  <strong>Estimated Delivery:</strong> {format(new Date(selectedParcel.estimatedDelivery), "MMM d, yyyy - h:mm a")}
                </div>
                )}
              {selectedParcel.notes && <div><strong>Notes:</strong> {selectedParcel.notes}</div>}
              {selectedParcel.delayReason && <div><strong>Delay Reason:</strong> {selectedParcel.delayReason}</div>}
              {selectedParcel.delayDuration && <div><strong>Delay Duration:</strong> {selectedParcel.delayDuration}</div>}
            </div>
          )}

        </DialogContent>
          </Dialog>
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
          
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Tracking #
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Origin / Destination
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Transport Mode
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                ETA
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-slate-500">Loading parcels...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayedParcels.length > 0 ? (
              displayedParcels.map((parcel) => (
                <TableRow key={parcel.id} className="hover:bg-slate-50">
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 font-mono">
                      {parcel.trackingNumber}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-slate-900">{parcel.origin}</div>
                    <div className="text-sm text-slate-500">{parcel.destination}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      {getTransportIcon(parcel.transportMode)}
                      <span className="text-sm text-slate-900 capitalize">
                        {parcel.transportMode}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(parcel.status)}`}>
                      {parcel.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-900">
                    {parcel.estimatedDelivery ? (
                      <>
                        {format(new Date(parcel.estimatedDelivery), "MMM d, yyyy - h:mm a")}
                        {parcel.status === "delayed" && parcel.delayDuration && (
                          <span className="text-red-600 ml-1">({parcel.delayDuration})</span>
                        )}
                      </>
                    ) : (
                      "Not available"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary/80"
                        title="View Details"
                        onClick={() => setSelectedParcel(parcel)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-slate-900" 
                        title="Generate QR"
                        onClick={() => {
                          handleGenerateQR(parcel.trackingNumber); 
                          }}
                      >
                        <QrCodeIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-slate-900" 
                        title="Send Alert"
                        onClick={() => handleSendAlert(parcel.trackingNumber)}
                      >
                        <BellIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-slate-500">No parcels found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <CardFooter className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium">1</span> to <span className="font-medium">{displayedParcels.length}</span> of <span className="font-medium">{filteredParcels.length}</span> parcels
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button variant="outline">
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
