import { prisma } from "@/configs";
import { ApiError } from "@/utils";

interface CreateSubjectInput {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

interface GetAllSubjectsInput {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
  categoryId?: string;
}

interface UpdateSubjectInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export class SubjectService {
  async createSubject(data: CreateSubjectInput) {
    // Check if subject with same name already exists
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: "insensitive",
        },
      },
    });

    if (existingSubject) {
      throw new ApiError(400, "Subject with this name already exists");
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        displayOrder: data.displayOrder || 0,
      },
      include: {
        _count: {
          select: {
            topics: true,
            categorySubjects: true,
            tests: true,
          },
        },
      },
    });

    return subject;
  }

  async getAllSubjects({
    page = 1,
    limit = 10,
    isActive,
    search,
    categoryId,
  }: GetAllSubjectsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categorySubjects = {
        some: {
          categoryId: categoryId,
        },
      };
    }

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: {
          categorySubjects: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          topics: {
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },
          _count: {
            select: {
              tests: true,
            },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);

    // Transform data to include total questions and categories
    const transformedSubjects = subjects.map((subject) => {
      const totalQuestions = subject.topics.reduce(
        (sum, topic) => sum + topic._count.questions,
        0,
      );

      const categories = subject.categorySubjects.map((cs) => ({
        id: cs.category.id,
        name: cs.category.name,
      }));

      return {
        id: subject.id,
        name: subject.name,
        description: subject.description,
        imageUrl: subject.imageUrl,
        displayOrder: subject.displayOrder,
        isActive: subject.isActive,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
        categories,
        totalTopics: subject.topics.length,
        totalQuestions,
        totalTests: subject._count.tests,
      };
    });

    return {
      subjects: transformedSubjects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubjectById(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
        categorySubjects: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    // Calculate total questions
    const totalQuestions = subject.topics.reduce(
      (sum, topic) => sum + topic._count.questions,
      0,
    );

    // Transform category data
    const categories = subject.categorySubjects.map((cs) => cs.category);

    return {
      ...subject,
      categories,
      totalQuestions,
      totalTopics: subject.topics.length,
      totalTests: subject._count.tests,
    };
  }

  async updateSubject(id: string, data: UpdateSubjectInput) {
    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    // Check if name is being changed and if new name already exists
    if (data.name && data.name !== subject.name) {
      const existingSubject = await prisma.subject.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: "insensitive",
          },
          id: {
            not: id,
          },
        },
      });

      if (existingSubject) {
        throw new ApiError(400, "Subject with this name already exists");
      }
    }

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.displayOrder !== undefined && {
          displayOrder: data.displayOrder,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        categorySubjects: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            topics: true,
            tests: true,
          },
        },
      },
    });

    // Get total questions count
    const topics = await prisma.topic.findMany({
      where: {
        subjectId: id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    const totalQuestions = topics.reduce(
      (sum, topic) => sum + topic._count.questions,
      0,
    );

    const categories = updatedSubject.categorySubjects.map((cs) => cs.category);

    return {
      ...updatedSubject,
      categories,
      totalQuestions,
      totalTopics: updatedSubject._count.topics,
      totalTests: updatedSubject._count.tests,
    };
  }

  async deleteSubject(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            topics: true,
            categorySubjects: true,
            tests: true,
          },
        },
      },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    // Check for dependencies
    if (
      subject._count.topics > 0 ||
      subject._count.categorySubjects > 0 ||
      subject._count.tests > 0
    ) {
      throw new ApiError(
        400,
        `Cannot delete subject. It has ${subject._count.topics} topic(s), ${subject._count.categorySubjects} category association(s), and ${subject._count.tests} test(s)`,
      );
    }

    await prisma.subject.delete({
      where: { id },
    });

    return { message: "Subject deleted successfully" };
  }

  async toggleSubjectStatus(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        isActive: !subject.isActive,
      },
    });

    return updatedSubject;
  }

  async getSubjectStats(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
            questions: {
              select: {
                difficultyLevel: true,
              },
            },
          },
        },
        categorySubjects: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    if (!subject) {
      throw new ApiError(404, "Subject not found");
    }

    // Calculate statistics
    const totalTopics = subject.topics.length;
    const activeTopics = subject.topics.filter((t) => t.isActive).length;

    let totalQuestions = 0;
    let easyQuestions = 0;
    let mediumQuestions = 0;
    let hardQuestions = 0;

    subject.topics.forEach((topic) => {
      topic.questions.forEach((question) => {
        totalQuestions++;
        if (question.difficultyLevel === "EASY") easyQuestions++;
        if (question.difficultyLevel === "MEDIUM") mediumQuestions++;
        if (question.difficultyLevel === "HARD") hardQuestions++;
      });
    });

    return {
      subjectInfo: {
        id: subject.id,
        name: subject.name,
        description: subject.description,
        isActive: subject.isActive,
      },
      topicStats: {
        total: totalTopics,
        active: activeTopics,
        inactive: totalTopics - activeTopics,
      },
      questionStats: {
        total: totalQuestions,
        easy: easyQuestions,
        medium: mediumQuestions,
        hard: hardQuestions,
      },
      categories: subject.categorySubjects.map((cs) => ({
        id: cs.category.id,
        name: cs.category.name,
      })),
      totalTests: subject._count.tests,
    };
  }

  async reorderSubjects(subjects: Array<{ id: string; displayOrder: number }>) {
    // Validate all subject IDs exist
    const subjectIds = subjects.map((sub) => sub.id);
    const existingSubjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true },
    });

    if (existingSubjects.length !== subjectIds.length) {
      throw new ApiError(404, "One or more subjects not found");
    }

    // Update display orders in a transaction
    const updatePromises = subjects.map((sub) =>
      prisma.subject.update({
        where: { id: sub.id },
        data: { displayOrder: sub.displayOrder },
      }),
    );

    await prisma.$transaction(updatePromises);

    // Return updated subjects
    const updatedSubjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      orderBy: { displayOrder: "asc" },
      include: {
        categorySubjects: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            topics: true,
            tests: true,
          },
        },
      },
    });

    return updatedSubjects;
  }
}

export const subjectService = new SubjectService();
