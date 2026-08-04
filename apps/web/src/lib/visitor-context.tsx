"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Visitor } from "@beerfest/domain";

interface VisitorContextValue {
  visitor: Visitor | null;
  setVisitor: (v: Visitor | null) => void;
  loading: boolean;
}

const VisitorContext = createContext<VisitorContextValue>({
  visitor: null,
  setVisitor: () => {},
  loading: true,
});

export function useVisitor() {
  return useContext(VisitorContext);
}

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("beerfest_visitor");
    if (stored) {
      try {
        setVisitor(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const handleSetVisitor = (v: Visitor | null) => {
    setVisitor(v);
    if (v) {
      localStorage.setItem("beerfest_visitor", JSON.stringify(v));
      document.cookie = `beerfest_visitor_id=${v.visitorId};path=/;max-age=86400;SameSite=Lax`;
    } else {
      localStorage.removeItem("beerfest_visitor");
      document.cookie = "beerfest_visitor_id=;path=/;max-age=0";
    }
  };

  return (
    <VisitorContext.Provider
      value={{ visitor, setVisitor: handleSetVisitor, loading }}
    >
      {children}
    </VisitorContext.Provider>
  );
}
