import { prisma } from "../config/prisma.js";

export const writeAudit = async ({ organisationId, actorId, action, entityType, entityId, metadata }) => {
  return prisma.auditLog.create({
    data: {
      organisationId,
      actorId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
};

export const listAuditLogs = async (organisationId, filters = {}) => {
  return prisma.auditLog.findMany({
    where: {
      organisationId,
      entityType: filters.entityType,
      entityId: filters.entityId,
      actorId: filters.actorId
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(filters.limit ?? 100), 500)
  });
};
