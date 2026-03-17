
import React from 'react';

export const COLORS = {
  navy: "#070F1C",
  card: "#0C1A2E",
  card2: "#0F2040",
  border: "#1B3558",
  teal: "#00C9A7",
  blue: "#3B82F6",
  warn: "#F59E0B",
  danger: "#EF4444",
  success: "#10B981",
  muted: "#4B6280",
  sub: "#94A3B8",
  text: "#E2E8F0",
};

export const STARTER_CODE: Record<string, string> = {
  "Python 3": "",
  "C": "",
  "C++": "",
  "Java": "",
};

export const CONCEPTS: Record<string, { label: string; color: string }> = {
  NameError: { label: "Variables & Scope", color: COLORS.warn },
  IndexError: { label: "List Indexing", color: "#F97316" },
  ZeroDivisionError: { label: "Arithmetic Safety", color: COLORS.danger },
  TypeError: { label: "Data Type Conversion", color: "#A78BFA" },
  SyntaxError: { label: "Syntax Rules", color: COLORS.danger },
  IndentationError: { label: "Indentation", color: COLORS.warn },
  CompileError: { label: "Compilation Rules", color: "#F97316" },
  RuntimeError: { label: "Runtime Error", color: COLORS.muted },
};
