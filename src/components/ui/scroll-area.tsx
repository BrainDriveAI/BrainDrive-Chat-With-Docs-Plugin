import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

class ScrollArea extends React.Component<ScrollAreaProps> {
  render() {
    const { className, children, ...props } = this.props;

    return (
      <div
        data-slot="scroll-area"
        className={cn("relative overflow-auto", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
}

interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

class ScrollBar extends React.Component<ScrollBarProps> {
  render() {
    // ScrollBar is now just a visual component, no functionality needed
    // In the simplified version, we rely on native scrollbars or hide them with CSS
    return null;
  }
}

export { ScrollArea, ScrollBar }
