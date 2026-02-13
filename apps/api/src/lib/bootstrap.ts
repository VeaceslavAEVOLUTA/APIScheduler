import bcrypt from "bcrypt";
import { prisma } from "./prisma.js";
import { config } from "../config.js";

export async function ensureSuperAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Super Admin";

  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isSuperAdmin) {
      await prisma.user.update({ where: { id: existing.id }, data: { isSuperAdmin: true } });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      isSuperAdmin: true,
    },
  });
}
