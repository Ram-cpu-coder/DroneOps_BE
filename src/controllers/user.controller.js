import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: {},
    select: {
      id: true,
      organisation: {
        select: {
          id: true,
          name: true
        }
      },
      name: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  return ok(res, users);
});
