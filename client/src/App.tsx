import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import RouteOptimization from "@/pages/route-optimization";
import ParcelTracking from "@/pages/parcel-tracking";
import Notifications from "@/pages/notifications";
import UserManagement from "@/pages/user-management";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/route-optimization" component={RouteOptimization} />
      <ProtectedRoute path="/parcel-tracking" component={ParcelTracking} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/user-management" component={UserManagement} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
