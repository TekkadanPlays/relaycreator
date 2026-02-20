import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

/**
 * Check that the authenticated user is a super admin.
 * Returns true if admin, false (and sends error response) otherwise.
 */
export async function ensureAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user?.admin) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}
