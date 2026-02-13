export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("activeWorkspaceId");
}

export function setActiveWorkspaceId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("activeWorkspaceId", id);
  window.dispatchEvent(new Event("workspace:active"));
}

export function resolveActiveWorkspaceId(workspaces: Array<{ id: string }>) {
  const stored = getActiveWorkspaceId();
  if (stored && workspaces.find((w) => w.id === stored)) return stored;
  return workspaces[0]?.id || null;
}
