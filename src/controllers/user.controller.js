import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    // Keep user directories tenant-scoped so one organisation never sees another
    // organisation's accounts in management screens or assignment dropdowns.
    where: {
      organisationId: req.user.organisationId
    },
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
