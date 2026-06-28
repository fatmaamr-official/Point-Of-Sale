import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  delay?: number;
}

export function MetricCard({ title, value, change, changeType = 'neutral', icon: Icon, delay = 0 }: MetricCardProps) {
  return (
    <div
      className="bg-card border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {change && (
            <p
              className={`text-xs font-medium ${
                changeType === 'positive'
                  ? 'text-success'
                  : changeType === 'negative'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
