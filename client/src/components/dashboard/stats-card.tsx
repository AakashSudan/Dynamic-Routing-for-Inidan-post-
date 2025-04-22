import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

type StatIcon = React.ElementType;

type StatCardProps = {
  title: string;
  value: string | number;
  icon: StatIcon;
  iconColor: string;
  iconBgColor: string;
  change?: {
    value: string;
    isIncrease: boolean;
  };
  className?: string;
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  change,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 flex items-center">
        <div className={cn("p-3 rounded-full mr-4", iconBgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {change && (
            <p className={cn(
              "text-xs flex items-center",
              change.isIncrease ? "text-green-600" : "text-red-600"
            )}>
              {change.isIncrease ? (
                <ArrowUpIcon className="mr-1 h-3 w-3" />
              ) : (
                <ArrowDownIcon className="mr-1 h-3 w-3" />
              )}
              {change.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
