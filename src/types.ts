export type User = {
  username: string;
  unlimited: boolean;
  credits: number | null;
  role: "member" | "owner" | "special";
  createdAt: string;
};
export type Result = {
  source: string;
  title: string;
  url: string;
  description: string;
  fields: { label: string; value: string }[];
};
export type Source = {
  name: string;
  status: "found" | "no_match" | "unavailable";
  duration: number;
  results: Result[];
  message?: string;
};
export type Search = {
  id: string;
  mode: string;
  toolId?: string;
  query: string;
  createdAt: string;
  status: "complete" | "failed" | "pending";
  saved: boolean;
  sources: Source[];
  error?: string;
};
export type Tool = {
  id: string;
  name: string;
  icon: string;
  mode?: string;
  provider?: string;
  description?: string;
  available: boolean;
};
export type Config = {
  packages: { id: string; name: string; credits: number; price: number }[];
  cashapp: string;
  webSearch: boolean;
  accessCodes: boolean;
  toolGroups: { label: string; tools: Tool[] }[];
};
export type Payment = {
  id: string;
  username: string;
  packageId: string;
  credits: number;
  price: number;
  reference: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  delivered?: boolean;
};
