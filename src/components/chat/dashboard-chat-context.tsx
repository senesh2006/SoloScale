"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ChatTurn = { role: "user" | "assistant"; content: string };

type Ctx = {
  messages: ChatTurn[];
  setMessages: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  appendMessages: (turns: ChatTurn[]) => void;
  dockOpen: boolean;
  setDockOpen: (v: boolean) => void;
  toggleDock: () => void;
};

const DashboardChatContext = createContext<Ctx | null>(null);

export function DashboardChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [dockOpen, setDockOpen] = useState(false);

  const appendMessages = useCallback((turns: ChatTurn[]) => {
    setMessages((m) => [...m, ...turns]);
  }, []);

  const toggleDock = useCallback(() => {
    setDockOpen((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      setMessages,
      appendMessages,
      dockOpen,
      setDockOpen,
      toggleDock,
    }),
    [messages, appendMessages, dockOpen, toggleDock],
  );

  return (
    <DashboardChatContext.Provider value={value}>
      {children}
    </DashboardChatContext.Provider>
  );
}

export function useDashboardChat(): Ctx {
  const c = useContext(DashboardChatContext);
  if (!c) {
    throw new Error("useDashboardChat must be used inside DashboardChatProvider");
  }
  return c;
}
