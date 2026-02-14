import { useAuth } from "../stores/auth";

/**
 * Check if the current user has a specific permission.
 * Falls back to checking user.admin for backward compat with "admin" type.
 */
export function useHasPermission(type: string): boolean {
  const user = useAuth((s) => s.user);
  if (!user) return false;

  // Legacy admin boolean covers "admin" permission
  if (type === "admin" && user.admin) return true;

  return user.permissions?.some((p) => p.type === type && p.disclaimer_accepted) ?? false;
}

/**
 * Check if the user has a permission granted (even if disclaimer not yet accepted).
 */
export function useHasPermissionGranted(type: string): boolean {
  const user = useAuth((s) => s.user);
  if (!user) return false;
  if (type === "admin" && user.admin) return true;
  return user.permissions?.some((p) => p.type === type) ?? false;
}

/**
 * Check if the user has accepted the disclaimer for a permission.
 */
export function useDisclaimerAccepted(type: string): boolean {
  const user = useAuth((s) => s.user);
  if (!user) return false;
  return user.permissions?.some((p) => p.type === type && p.disclaimer_accepted) ?? false;
}
