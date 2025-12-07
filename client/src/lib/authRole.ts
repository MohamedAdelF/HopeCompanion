const ROLE_KEY = "pinkhope.role";

export type AppRole = "patient" | "doctor" | "admin";

export function setRole(role: AppRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function getRole(): AppRole | null {
  const v = localStorage.getItem(ROLE_KEY);
  return v === "patient" || v === "doctor" || v === "admin" ? v : null;
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY);
}


