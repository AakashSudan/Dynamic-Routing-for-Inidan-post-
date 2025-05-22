import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Parcel, InsertParcel } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { PackagePlus, Loader2 } from "lucide-react";


// Define parcel form schema
const parcelFormSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  weight: z.string().min(1, "Weight is required"),
  dimensions: z.string().optional(),
  transportMode: z.enum(["road", "rail", "air", "multimodal"]),
  notes: z.string().optional(),
});

export default function NewParcel() {
   const { toast } = useToast();
  // Form for creating a new parcel
  const form = useForm<z.infer<typeof parcelFormSchema>>({
    resolver: zodResolver(parcelFormSchema),
    defaultValues: {
      origin: "",
      destination: "",
      weight: "",
      dimensions: "",
      transportMode: "road",
      notes: "",
    },
  });

  // Create parcel mutation
  const createParcelMutation = useMutation({
    mutationFn: async (newParcel: Omit<InsertParcel, "trackingNumber" | "userId">) => {
      const res = await apiRequest("POST", "/api/parcels", newParcel);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({
        title: "Parcel Created",
        description: "The new parcel has been created successfully.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Parcel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  // Handle parcel form submission
  function onSubmit(values: z.infer<typeof parcelFormSchema>) {
    // Create estimated delivery date (3 days from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
    
    // Create the new parcel
    createParcelMutation.mutate({
      ...values,
      status: "preparing",
      estimatedDelivery: estimatedDelivery,
      currentLocation: values.origin,
    });
  }
return( <div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    New Parcel
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Parcel</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new parcel you want to ship
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="origin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Origin</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., New Delhi, IN" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Mumbai, IN" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 5 kg" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dimensions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dimensions (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 10x20x30 cm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="transportMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transport Mode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select transport mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="road">Road</SelectItem>
                                <SelectItem value="rail">Rail</SelectItem>
                                <SelectItem value="air">Air</SelectItem>
                                <SelectItem value="multimodal">Multimodal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional information about the parcel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createParcelMutation.isPending}
                        >
                          {createParcelMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Parcel...
                            </>
                          ) : (
                            "Create Parcel"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
  </div>
  
)}