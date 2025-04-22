import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Issue } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClockIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ActiveIssues() {
  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues/active"],
    refetchInterval: 60000, // Refresh every minute
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-amber-500 bg-amber-50";
      case "low":
        return "border-blue-500 bg-blue-50";
      default:
        return "border-slate-500 bg-slate-50";
    }
  };
  
  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="p-4 border-b border-slate-200">
        <CardTitle className="font-semibold text-slate-800">Active Issues</CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {issues && issues.length > 0 ? (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`border-l-4 p-3 rounded-r ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm">{issue.title}</h3>
                      <p className="text-xs text-slate-700 mt-1">{issue.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeColor(issue.severity)}`}>
                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center">
                      <ClockIcon className="mr-1 h-3 w-3" />
                      {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                    </span>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary hover:text-primary/80">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-slate-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-slate-700">All Clear!</h3>
                <p className="text-sm text-slate-500 mt-1">No active issues at the moment</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      
      <CardFooter className="p-4 border-t border-slate-200 bg-slate-50">
        <Button variant="outline" className="w-full">
          View All Issues
        </Button>
      </CardFooter>
    </Card>
  );
}
