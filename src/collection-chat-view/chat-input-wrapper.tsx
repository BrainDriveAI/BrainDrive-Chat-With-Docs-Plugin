// import { useState, useEffect, useRef, useCallback } from "react";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { Send } from "lucide-react";
// import {
//     PromptInput,
//     PromptInputModelSelect,
//     PromptInputModelSelectContent,
//     PromptInputSubmit,
//     PromptInputTextarea,
//     PromptInputToolbar,
//     PromptInputTools,
//   } from "./elements/prompt-input";
//   import {
//     ArrowUpIcon,
//     ChevronDownIcon,
//     CpuIcon,
//     PaperclipIcon,
//     StopIcon,
//   } from "./icons";
// import { useChatMessages } from "./context/chat-messages-provider";
// import { cn } from "@/lib/utils";
// import { useWindowSize } from "usehooks-ts";


// export function ChatInput({className}: {className?: string}) {
//     const { sendMessage, isLoading: isSessionLoading, status: chatStatus } = useChatMessages();
//     const [message, setMessage] = useState("");
//     const [isSendingMessage, setIsSendingMessage] = useState(false);

//     const textareaRef = useRef<HTMLTextAreaElement>(null);
//   const { width } = useWindowSize();

//   const adjustHeight = useCallback(() => {
//     if (textareaRef.current) {
//       textareaRef.current.style.height = "44px";
//     }
//   }, []);

//   useEffect(() => {
//     if (textareaRef.current) {
//       adjustHeight();
//     }
//   }, [adjustHeight]);

//   const resetHeight = useCallback(() => {
//     if (textareaRef.current) {
//       textareaRef.current.style.height = "44px";
//     }
//   }, []);
    
//     // Determine overall loading state (session loading OR message sending)
//     const isLoading = isSessionLoading || isSendingMessage;

//     const handleSend = async (e?: React.FormEvent) => {
//         e?.preventDefault();
//         const trimmedMessage = message.trim();
        
//         if (!trimmedMessage || isLoading) return; // Prevent sending if empty or loading

//         setIsSendingMessage(true); // Set local sending state
//         setMessage(""); // Clear input immediately for better UX

//         try {
//             await sendMessage(trimmedMessage); // Call the hook's sendMessage
//             // toast.success("Message sent."); // useChatSession already handles toasts for success/failure
//         } catch (error) {
//             console.error("Error sending message from input:", error);
//             // The hook should already show a toast for this, but if not, you could add one here.
//             setMessage(trimmedMessage); // Restore message on failure
//         } finally {
//             setIsSendingMessage(false); // Reset local sending state
//         }
//     };

//     const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
//         setMessage(event.target.value);
//     };
    
//     return (
//         <div className={cn("relative flex w-full flex-col gap-4", className)}>
//             <PromptInput
//                 className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
//                 onSubmit={(event) => {
//                 event.preventDefault();
//                 if (status !== "ready") {
//                     toast.error("Please wait for the model to finish its response!");
//                 } else {
//                     handleSend();
//                 }
//                 }}
//             >
//                 <div className="flex flex-row items-start gap-1 sm:gap-2">
//                 <PromptInputTextarea
//                     autoFocus
//                     className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
//                     data-testid="multimodal-input"
//                     disableAutoResize={true}
//                     maxHeight={200}
//                     minHeight={44}
//                     onChange={handleInput}
//                     placeholder="Send a message..."
//                     ref={textareaRef}
//                     rows={1}
//                     value={message}
//                 />{" "}
//                     <Context {...contextProps} />
//                 </div>
//                 <PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">

//                 {status === "submitted" ? (
//                     <StopButton setMessages={setMessages} stop={stop} />
//                 ) : (
//                     <PromptInputSubmit
//                     className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
//                     disabled={!message.trim()}
//                     status={status}
//                     data-testid="send-button"
//                     >
//                     <ArrowUpIcon size={14} />
//                     </PromptInputSubmit>
//                 )}
//                 </PromptInputToolbar>
//             </PromptInput>
//         </div>
//         // <form onSubmit={handleSend} className="max-w-4xl mx-auto">
//         //     <div className="relative flex items-end w-xl">
//         //         <Textarea
//         //             placeholder="Send a message..."
//         //             value={message}
//         //             onChange={(e) => setMessage(e.target.value)}
//         //             onKeyDown={(e) => {
//         //                 if (e.key === "Enter" && !e.shiftKey) {
//         //                     handleSend(e);
//         //                 }
//         //             }}
//         //             className="min-h-[50px] pr-16 resize-none"
//         //             disabled={isLoading}
//         //         />
                
//         //         {/* Buttons overlay */}
//         //         <div className="absolute right-2 bottom-2 flex items-center space-x-1">
//         //             <Button 
//         //                 type="submit" 
//         //                 size="icon" 
//         //                 disabled={!message.trim() || isLoading}
//         //                 title="Send Message"
//         //             >
//         //                 <Send className="h-5 w-5" />
//         //             </Button>
//         //         </div>
//         //     </div>
//         // </form>
//     );
// }
