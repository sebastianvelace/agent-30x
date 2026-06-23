export type Role = "user" | "assistant";

export interface Citation {
  source_doc: string;
  content: string;
  similarity: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  escalate?: boolean;
  sources?: string[];
  citations?: Citation[];
  timestamp: Date;
}
