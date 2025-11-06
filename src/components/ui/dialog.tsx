// import * as React from "react"
// import { XIcon } from "lucide-react"
// import { cn } from "@/lib/utils"

// interface DialogProps {
//   open?: boolean;
//   onOpenChange?: (open: boolean) => void;
//   children: React.ReactNode;
// }

// function Dialog({ open, onOpenChange, children }: DialogProps) {
//   React.useEffect(() => {
//     if (open) {
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = 'unset';
//     }
//     return () => {
//       document.body.style.overflow = 'unset';
//     };
//   }, [open]);

//   if (!open) return null;

//   return (
//     <div
//       data-slot="dialog"
//       onClick={(e) => {
//         if (e.target === e.currentTarget) {
//           onOpenChange?.(false);
//         }
//       }}
//     >
//       {children}
//     </div>
//   );
// }

// const DialogOverlay = React.forwardRef<
//   HTMLDivElement,
//   React.HTMLAttributes<HTMLDivElement>
// >(({ className, ...props }, ref) => (
//   <div
//     ref={ref}
//     data-slot="dialog-overlay"
//     className={cn(
//       "fixed inset-0 z-50 bg-black/50",
//       className
//     )}
//     {...props}
//   />
// ));
// DialogOverlay.displayName = "DialogOverlay";

// const DialogContent = React.forwardRef<
//   HTMLDivElement,
//   React.HTMLAttributes<HTMLDivElement> & {
//     showCloseButton?: boolean;
//     onClose?: () => void;
//   }
// >(({ className, children, showCloseButton = true, onClose, ...props }, ref) => (
//   <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
//     <DialogOverlay />
//     <div
//       ref={ref}
//       data-slot="dialog-content"
//       className={cn(
//         "bg-background relative z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg",
//         className
//       )}
//       onClick={(e) => e.stopPropagation()}
//       {...props}
//     >
//       {children}
//       {showCloseButton && onClose && (
//         <button
//           onClick={onClose}
//           data-slot="dialog-close"
//           className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
//         >
//           <XIcon />
//           <span className="sr-only">Close</span>
//         </button>
//       )}
//     </div>
//   </div>
// ));
// DialogContent.displayName = "DialogContent";

// function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
//   return (
//     <div
//       data-slot="dialog-header"
//       className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
//       {...props}
//     />
//   );
// }

// function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
//   return (
//     <div
//       data-slot="dialog-footer"
//       className={cn(
//         "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
//         className
//       )}
//       {...props}
//     />
//   );
// }

// const DialogTitle = React.forwardRef<
//   HTMLHeadingElement,
//   React.HTMLAttributes<HTMLHeadingElement>
// >(({ className, ...props }, ref) => (
//   <h2
//     ref={ref}
//     data-slot="dialog-title"
//     className={cn("text-lg leading-none font-semibold", className)}
//     {...props}
//   />
// ));
// DialogTitle.displayName = "DialogTitle";

// const DialogDescription = React.forwardRef<
//   HTMLParagraphElement,
//   React.HTMLAttributes<HTMLParagraphElement>
// >(({ className, ...props }, ref) => (
//   <p
//     ref={ref}
//     data-slot="dialog-description"
//     className={cn("text-muted-foreground text-sm", className)}
//     {...props}
//   />
// ));
// DialogDescription.displayName = "DialogDescription";

// function DialogTrigger({ ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
//   return <button data-slot="dialog-trigger" {...props} />;
// }

// function DialogClose({ ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
//   return <button data-slot="dialog-close" {...props} />;
// }

// function DialogPortal({ children }: { children: React.ReactNode }) {
//   return <>{children}</>;
// }

// export {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogOverlay,
//   DialogPortal,
//   DialogTitle,
//   DialogTrigger,
// };
