import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

class Alert extends React.Component<AlertProps> {
  render() {
    const { className, variant = 'default', ...props } = this.props;

    const variantClasses = {
      default: "bg-card text-card-foreground",
      destructive: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
    };

    return (
      <div
        data-slot="alert"
        role="alert"
        className={cn(
          "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
}

class AlertTitle extends React.Component<React.HTMLAttributes<HTMLDivElement>> {
  render() {
    const { className, ...props } = this.props;

    return (
      <div
        data-slot="alert-title"
        className={cn(
          "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
          className
        )}
        {...props}
      />
    );
  }
}

class AlertDescription extends React.Component<React.HTMLAttributes<HTMLDivElement>> {
  render() {
    const { className, ...props } = this.props;

    return (
      <div
        data-slot="alert-description"
        className={cn(
          "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
          className
        )}
        {...props}
      />
    );
  }
}

export { Alert, AlertTitle, AlertDescription }
