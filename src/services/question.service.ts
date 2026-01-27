import { prisma } from "@/configs";
import { DifficultyLevel } from "@/generated/prisma/enums";
import { ApiError } from "@/utils";
import csv from "csv-parser";
import { Readable } from "stream";

const MAX_IMAGE_SIZE_MB = 5;

interface CreateQuestionInput {
  userId: string;
  topicId: string;
  questionText: string;
  questionImageUrl?: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
  explanation?: string;
  explanationImageUrl?: string;
  difficultyLevel?: DifficultyLevel;
}

interface GetAllQuestionsInput {
  page?: number;
  limit?: number;
  isActive?: string;
  search?: string;
  topicId?: string;
  subjectId?: string;
  difficultyLevel?: string;
}

interface UpdateQuestionInput {
  questionText?: string;
  questionImageUrl?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correctOption?: number;
  explanation?: string;
  explanationImageUrl?: string;
  difficultyLevel?: DifficultyLevel;
  isActive?: boolean;
}

interface BulkUploadInput {
  userId: string;
  file: any;
  topicId: string;
}

interface GetQuestionStatsInput {
  topicId?: string;
  subjectId?: string;
}

const validateBase64Image = (base64?: string) => {
  if (!base64) return;

  const sizeInBytes =
    (base64.length * 3) / 4 -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > MAX_IMAGE_SIZE_MB) {
    throw new ApiError(400, "Image size must be less than 5MB");
  }
};

const mapCorrectAnswer = (value: string) => {
  if (!value) return null;

  const v = value.toString().trim().toLowerCase();
  if (v === "a") return 1;
  if (v === "b") return 2;
  if (v === "c") return 3;
  if (v === "d") return 4;

  const num = Number(v);
  return [1, 2, 3, 4].includes(num) ? num : null;
};

export class QuestionService {
  async createQuestion(data: CreateQuestionInput) {
    if (![1, 2, 3, 4].includes(Number(data.correctOption))) {
      throw new ApiError(400, "Correct option must be between 1 and 4");
    }

    validateBase64Image(data.questionImageUrl);
    validateBase64Image(data.explanationImageUrl);

    const topic = await prisma.topic.findUnique({
      where: { id: data.topicId },
    });

    if (!topic) {
      throw new ApiError(404, "Topic not found");
    }

    const question = await prisma.question.create({
      data: {
        topicId: data.topicId,
        questionText: data.questionText,
        questionImageUrl: data.questionImageUrl,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correctOption: Number(data.correctOption),
        explanation: data.explanation,
        explanationImageUrl: data.explanationImageUrl,
        difficultyLevel: data.difficultyLevel || "MEDIUM",
        createdById: data.userId,
      },
    });

    return question;
  }

  async getAllQuestions({
    page = 1,
    limit = 10,
    isActive,
    search,
    topicId,
    subjectId,
    difficultyLevel,
  }: GetAllQuestionsInput) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.questionText = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (topicId) {
      where.topicId = topicId;
    }

    if (subjectId) {
      where.topic = {
        subjectId: subjectId,
      };
    }

    if (difficultyLevel) {
      where.difficultyLevel = difficultyLevel;
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);

    return {
      questions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuestionById(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    return question;
  }

  async updateQuestion(id: string, data: UpdateQuestionInput) {
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    if (data.correctOption && ![1, 2, 3, 4].includes(Number(data.correctOption))) {
      throw new ApiError(400, "Correct option must be between 1 and 4");
    }

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        questionText: data.questionText,
        questionImageUrl: data.questionImageUrl,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correctOption: data.correctOption ? Number(data.correctOption) : undefined,
        explanation: data.explanation,
        explanationImageUrl: data.explanationImageUrl,
        difficultyLevel: data.difficultyLevel || "MEDIUM",
        isActive: data.isActive,
      },
    });

    return updatedQuestion;
  }

  async deleteQuestion(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            answer: true,
          },
        },
      },
    });

    if (!question) {
      throw new ApiError(404, "Question not found");
    }

    if (question._count.answer > 0) {
      // Soft delete if question has been attempted
      await prisma.question.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        softDeleted: true,
        message: "Question has been deactivated (soft deleted) as it has associated attempts",
      };
    }

    // Hard delete if no attempts
    await prisma.question.delete({
      where: { id },
    });

    return {
      softDeleted: false,
      message: "Question deleted successfully",
    };
  }

  async bulkUploadQuestions({ userId, file, topicId }: BulkUploadInput) {
    if (!file) {
      throw new ApiError(400, "CSV file is required");
    }

    // Validate topic once
    const topicExists = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topicExists) {
      throw new ApiError(400, "Topic not found");
    }

    // Parse CSV
    const results: any[] = [];
    const errors: any[] = [];

    await new Promise((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (results.length === 0) {
      throw new ApiError(400, "CSV file is empty");
    }

    // Process rows
    const questionsToCreate: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // header + index

      const questionText = row["Question"]?.trim();
      const option1 = row["Option A"]?.trim();
      const option2 = row["Option B"]?.trim();
      const option3 = row["Option C"]?.trim();
      const option4 = row["Option D"]?.trim();
      const explanation = row["Explanation"]?.trim() || null;
      const correctOption = mapCorrectAnswer(row["Correct Answer"]);

      if (
        !questionText ||
        !option1 ||
        !option2 ||
        !option3 ||
        !option4 ||
        !correctOption
      ) {
        errors.push({
          row: rowNum,
          error: "Missing or invalid required fields",
        });
        continue;
      }

      questionsToCreate.push({
        topicId,
        questionText,
        option1,
        option2,
        option3,
        option4,
        correctOption,
        explanation,
        difficultyLevel: "MEDIUM",
        questionImageUrl: null,
        explanationImageUrl: null,
        isActive: true,
        createdById: userId,
      });
    }

    // Bulk insert
    const created = await prisma.question.createMany({
      data: questionsToCreate,
      skipDuplicates: true,
    });

    return {
      totalRows: results.length,
      successfullyCreated: created.count,
      failedRows: errors.length,
      errors: errors.length ? errors : undefined,
    };
  }

  async getQuestionStats({ topicId, subjectId }: GetQuestionStatsInput) {
    const where: any = {};

    if (topicId) {
      where.topicId = topicId;
    }

    if (subjectId) {
      where.topic = {
        subjectId: subjectId,
      };
    }

    const [total, activeCount, byDifficulty] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.count({ where: { ...where, isActive: true } }),
      prisma.question.groupBy({
        by: ["difficultyLevel"],
        where,
        _count: true,
      }),
    ]);

    const stats = {
      total,
      active: activeCount,
      inactive: total - activeCount,
      byDifficulty: byDifficulty.reduce((acc, curr) => {
        acc[curr.difficultyLevel] = curr._count;
        return acc;
      }, {} as any),
    };

    return stats;
  }
}

export const questionService = new QuestionService();