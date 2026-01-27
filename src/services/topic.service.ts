import { prisma } from "@/configs";
import { ApiError } from "@/utils";

interface CreateTopicInput {
  subjectId: string;
  name: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  displayOrder?: number;
}

interface GetAllTopicsInput {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  subjectId?: string;
}

interface UpdateTopicInput {
  id: string;
  name?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export class TopicService {
  // ================= CREATE =================
  async create({
    subjectId,
    name,
    description,
    content,
    videoUrl,
    pdfUrl,
    displayOrder = 0,
  }: CreateTopicInput) {
    if (!subjectId || !name) {
      throw new ApiError(
        400,
        "Subject ID and topic name are required",
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    return prisma.topic.create({
      data: {
        subjectId,
        name,
        description,
        content,
        videoUrl,
        pdfUrl,
        displayOrder,
      },
    });
  }

  // ================= GET ALL =================
  async getAll({
    page = 1,
    limit = 10,
    isActive,
    search,
    subjectId,
  }: GetAllTopicsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { displayOrder: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          subject: {
            select: { id: true, name: true },
          },
          _count: {
            select: { questions: true },
          },
        },
      }),
      prisma.topic.count({ where }),
    ]);

    return {
      topics,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================= GET BY ID =================
  async getById(id: string) {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        subject: {
          select: { id: true, name: true },
        },
        questions: {
          where: { isActive: true },
          select: {
            id: true,
            questionText: true,
            difficultyLevel: true,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

    return topic;
  }

  // ================= UPDATE =================
  async update({
    id,
    name,
    description,
    content,
    videoUrl,
    pdfUrl,
    displayOrder,
    isActive,
  }: UpdateTopicInput) {
    const topic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

    return prisma.topic.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(displayOrder !== undefined && {
          displayOrder,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  // ================= DELETE =================
  async delete(id: string) {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

    if (topic._count.questions > 0) {
      throw new ApiError(
        400,
        "Cannot delete topic with associated questions. Please delete or reassign questions first.",
      );
    }

    await prisma.topic.delete({
      where: { id },
    });
  }
}

export const topicService = new TopicService();
