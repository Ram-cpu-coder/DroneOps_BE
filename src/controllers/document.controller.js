import { prisma } from "../config/prisma.js";
import { writeAudit } from "../services/audit.service.js";
import { storeUploadedFile } from "../services/fileStorage.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const documents = await prisma.document.findMany({
    where: {
      organisationId: req.user.organisationId,
      entityType: req.query.entityType,
      entityId: req.query.entityId
    },
    orderBy: { createdAt: "desc" }
  });
  return ok(res, documents);
});

export const create = asyncHandler(async (req, res) => {
  const document = await prisma.document.create({
    data: {
      organisationId: req.user.organisationId,
      uploadedById: req.user.id,
      ...req.body
    }
  });
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "DOCUMENT_CREATED",
    entityType: "DOCUMENT",
    entityId: document.id,
    metadata: { linkedEntityType: document.entityType, linkedEntityId: document.entityId }
  });
  return created(res, document, "Document metadata stored");
});

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("A file is required", 400);
  }

  const { entityType, entityId, category, title } = req.body;
  if (!entityType || !entityId || !category) {
    throw new AppError("entityType, entityId, and category are required", 400);
  }

  const storedFile = await storeUploadedFile(req.file, {
    organisationId: req.user.organisationId,
    entityType,
    entityId
  });

  const document = await prisma.document.create({
    data: {
      organisationId: req.user.organisationId,
      entityType,
      entityId,
      category,
      title: title || req.file.originalname,
      fileUrl: storedFile.fileUrl,
      uploadedById: req.user.id,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storageProvider: storedFile.storageProvider,
        publicId: storedFile.publicId,
        resourceType: storedFile.resourceType,
        bytes: storedFile.bytes
      }
    }
  });
  await writeAudit({
    organisationId: req.user.organisationId,
    actorId: req.user.id,
    action: "DOCUMENT_UPLOADED",
    entityType: "DOCUMENT",
    entityId: document.id,
    metadata: { linkedEntityType: document.entityType, linkedEntityId: document.entityId, fileUrl: document.fileUrl }
  });

  return created(res, document, "Document uploaded");
});
