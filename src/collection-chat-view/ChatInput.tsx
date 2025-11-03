import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useChatMessages } from "./context/chat-messages-provider";


export function ChatInput() {
    const { sendMessage, isLoading: isSessionLoading } = useChatMessages(); // Get sendMessage and isLoading from hook
    const [message, setMessage] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false); // Local state for message sending
    
    // Determine overall loading state (session loading OR message sending)
    const isLoading = isSessionLoading || isSendingMessage;

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmedMessage = message.trim();
        
        if (!trimmedMessage || isLoading) return; // Prevent sending if empty or loading

        setIsSendingMessage(true); // Set local sending state
        setMessage(""); // Clear input immediately for better UX

        try {
            await sendMessage(trimmedMessage); // Call the hook's sendMessage
            // toast.success("Message sent."); // useChatSession already handles toasts for success/failure
        } catch (error) {
            console.error("Error sending message from input:", error);
            // The hook should already show a toast for this, but if not, you could add one here.
            setMessage(trimmedMessage); // Restore message on failure
        } finally {
            setIsSendingMessage(false); // Reset local sending state
        }
    };
    
    return (
        <div className="relative flex w-full flex-col gap-4">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                <div className="relative flex items-end">
                    <Textarea
                        placeholder="Send a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                handleSend(e);
                            }
                        }}
                        className="min-h-[50px] pr-16 resize-none"
                        disabled={isLoading}
                    />
                    
                    {/* Buttons overlay */}
                    <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                        <Button 
                            type="submit" 
                            size="icon" 
                            disabled={!message.trim() || isLoading}
                            title="Send Message"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
