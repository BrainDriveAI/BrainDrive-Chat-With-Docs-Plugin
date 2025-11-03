import React, { createContext, useContext, useState } from "react";

// Define context shape
interface ChatMessagesContextValue {
  sendMessage: (msg: string) => Promise<void>;
  isLoading: boolean;
}

export type ChatStatus = "submitted" | "streaming" | "error";

// Create context
// add export here
export const ChatMessagesContext = createContext<ChatMessagesContextValue>({
  sendMessage: async () => {},
  isLoading: false,
});

// Provider with simulated behavior
export const ChatMessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (msg: string) => {
    setIsLoading(true);
    console.log("Sending message:", msg);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Message sent:", msg);
    setIsLoading(false);
  };

  return (
    <ChatMessagesContext.Provider value={{ sendMessage, isLoading }}>
      {children}
    </ChatMessagesContext.Provider>
  );
};

// Hook to consume the context
export const useChatMessages = () => useContext(ChatMessagesContext);
