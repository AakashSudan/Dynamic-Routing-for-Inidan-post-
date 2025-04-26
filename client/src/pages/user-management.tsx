import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, InsertUser } from "@shared/schema";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Loader2,
  Mail,
  Phone,
  PlusCircle,
  Search,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Redirect } from "wouter";

// Define user form schema
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["sender", "staff", "admin"]),
});

export default function UserManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Guard: Redirect non-admin/staff users
  if (user?.role === "sender") {
    return <Redirect to="/" />;
  }
  
  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", newUser);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Created",
        description: "The new user has been created successfully.",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Create User",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form for creating a new user
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      fullName: "",
      role: "sender",
    },
  });
  
  // Handle user form submission
  function onSubmit(values: z.infer<typeof userFormSchema>) {
    createUserMutation.mutate(values);
  }
  
  // Filter users based on search term
  const filteredUsers = users?.filter(
    (user) => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Get selected user
  const selectedUser = users?.find(user => user.id === selectedUserId);
  
  // Count users by role
  const counts = {
    all: filteredUsers.length,
    senders: filteredUsers.filter(user => user.role === "sender").length,
    staff: filteredUsers.filter(user => user.role === "staff").length,
    admins: filteredUsers.filter(user => user.role === "admin").length,
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Get badge variant based on user role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "staff":
        return "secondary";
      case "sender":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-500 mt-1">Manage system users and their access levels</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-10 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new user account
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sender">Sender</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Defines what permissions the user will have
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating User...
                            </>
                          ) : (
                            "Create User"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User List */}
            <Card className="lg:col-span-2">
              <CardHeader className="px-6">
                <Tabs defaultValue="all" className="w-full">
                  <div className="flex justify-between items-center">
                    <TabsList>
                      <TabsTrigger value="all" className="relative">
                        All Users
                        <Badge className="ml-2">{counts.all}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="senders">
                        Senders
                        <Badge variant="outline" className="ml-2">{counts.senders}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="staff">
                        Staff
                        <Badge variant="secondary" className="ml-2">{counts.staff}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="admins">
                        Admins
                        <Badge variant="default" className="ml-2">{counts.admins}</Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="all" className="m-0 pt-4">
                    <UsersTable 
                      users={filteredUsers} 
                      isLoading={isLoading}
                      onSelectUser={setSelectedUserId}
                      selectedUserId={selectedUserId}
                      roleFilter="all"
                    />
                  </TabsContent>
                  
                  <TabsContent value="senders" className="m-0 pt-4">
                    <UsersTable 
                      users={filteredUsers.filter(user => user.role === "sender")} 
                      isLoading={isLoading}
                      onSelectUser={setSelectedUserId}
                      selectedUserId={selectedUserId}
                      roleFilter="sender"
                    />
                  </TabsContent>
                  
                  <TabsContent value="staff" className="m-0 pt-4">
                    <UsersTable 
                      users={filteredUsers.filter(user => user.role === "staff")} 
                      isLoading={isLoading}
                      onSelectUser={setSelectedUserId}
                      selectedUserId={selectedUserId}
                      roleFilter="staff"
                    />
                  </TabsContent>
                  
                  <TabsContent value="admins" className="m-0 pt-4">
                    <UsersTable 
                      users={filteredUsers.filter(user => user.role === "admin")} 
                      isLoading={isLoading}
                      onSelectUser={setSelectedUserId}
                      selectedUserId={selectedUserId}
                      roleFilter="admin"
                    />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
            
            {/* User Details */}
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>
                  {selectedUser 
                    ? `Information about ${selectedUser.fullName}`
                    : "Select a user to view details"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedUser ? (
                  <div className="space-y-6">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                        <UserIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{selectedUser.fullName}</h3>
                        <p className="text-sm text-slate-500">@{selectedUser.username}</p>
                        <Badge className="mt-1" variant={getRoleBadgeVariant(selectedUser.role)}>
                          {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-slate-500 mr-2" />
                        <p className="text-sm">{selectedUser.email}</p>
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-slate-500 mr-2" />
                          <p className="text-sm">{selectedUser.phone}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Account Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="flex items-center">
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Permissions</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Route Management</span>
                          {selectedUser.role !== "sender" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Issue Management</span>
                          {selectedUser.role !== "sender" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">User Management</span>
                          {selectedUser.role === "admin" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">View Deliveries</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Users className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500">Select a user from the list</p>
                    <p className="text-slate-400 text-sm mt-1">
                      User details will be shown here
                    </p>
                  </div>
                )}
              </CardContent>
              {selectedUser && (
                <CardFooter className="flex justify-between border-t p-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUserId(null)}
                  >
                    Close
                  </Button>
                  <Button>View Activity</Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onSelectUser: (userId: number) => void;
  selectedUserId: number | null;
  roleFilter: string;
}

function UsersTable({ users, isLoading, onSelectUser, selectedUserId, roleFilter }: UsersTableProps) {
  // Get badge variant based on user role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "staff":
        return "secondary";
      case "sender":
        return "outline";
      default:
        return "outline";
    }
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-slate-500">Loading users...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : users.length > 0 ? (
            users.map((user) => (
              <TableRow 
                key={user.id}
                className={selectedUserId === user.id ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                      <span className="text-xs font-semibold text-primary">
                        {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    {user.fullName}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSelectUser(user.id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <div className="flex flex-col items-center justify-center">
                  <Users className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-slate-500">
                    {roleFilter === "all" 
                      ? "No users found" 
                      : `No ${roleFilter} users found`}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
