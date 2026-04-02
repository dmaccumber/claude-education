"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useEffect,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { UIMessage, DefaultChatTransport } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: UIMessage[];
}

interface ChatContextType {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [input, setInput] = useState("");

  const {
    messages,
    sendMessage,
    status,
  } = useAIChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        files: fileSystem.serialize(),
        projectId,
      },
    }),
    messages: initialMessages,
  });

  // Process server-executed tool calls from streamed messages
  const processedToolCalls = useRef(new Set<string>());
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        const p = part as any;
        if (
          typeof p.type === "string" &&
          p.type.startsWith("tool-") &&
          p.type !== "tool-invocation" &&
          p.toolCallId &&
          p.state === "output-available" &&
          !processedToolCalls.current.has(p.toolCallId)
        ) {
          processedToolCalls.current.add(p.toolCallId);
          const toolName = p.type.replace(/^tool-/, "");
          handleToolCall({ toolName, args: p.input });
        }
      }
    }
  }, [messages, handleToolCall]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      sendMessage({ text: trimmed });
      setInput("");
    },
    [input, sendMessage]
  );

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}