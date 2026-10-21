export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "same-origin",
    ...(data === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server could not be reached." }));
  if (!response.ok)
    throw new ApiError(
      result.error || "Something went wrong.",
      response.status,
    );
  return result;
}
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}
export function exportSearch(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "witchsearch-report.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
