import { prisma } from "@/configs";
import { DifficultyLevel } from "@/generated/prisma/enums";
import { ApiError } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import {
  uploadImageFromPath,
  extractPublicIdFromUrl,
  deleteImage,
  deleteLocalFile,
} from "@/configs/cloudinary.config";

interface CreateQuestionInput {
  userId: string;
  topicId: string;
  questionText: string;
  questionImageUrl?: string;
  questionImagePath?: string; // Local file path from multer
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
  explanation?: string;
  explanationImageUrl?: string;
  explanationImagePath?: string; // Local file path from multer
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
  questionImagePath?: string; // Local file path from multer
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correctOption?: number;
  explanation?: string;
  explanationImageUrl?: string;
  explanationImagePath?: string; // Local file path from multer
  difficultyLevel?: DifficultyLevel;
  isActive?: boolean;
  removeImageQuestion?: boolean; // Flag to delete question image
  removeImageExplanation?: boolean; // Flag to delete explanation image
  displayOrder?: number;
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
      // Clean up uploaded files if validation fails
      if (data.questionImagePath) deleteLocalFile(data.questionImagePath);
      if (data.explanationImagePath) deleteLocalFile(data.explanationImagePath);
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CORRECT_OPTION_INVALID,
      );
    }

    const topic = await prisma.topic.findUnique({
      where: { id: data.topicId },
    });

    if (!topic) {
      // Clean up uploaded files if topic not found
      if (data.questionImagePath) deleteLocalFile(data.questionImagePath);
      if (data.explanationImagePath) deleteLocalFile(data.explanationImagePath);
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.TOPIC_NOT_FOUND);
    }

    let cloudinaryQuestionImageUrl = data.questionImageUrl;
    let cloudinaryExplanationImageUrl = data.explanationImageUrl;

    // Upload question image to Cloudinary if provided
    if (data.questionImagePath) {
      try {
        const uploadResult = await uploadImageFromPath(
          data.questionImagePath,
          "questions",
        );
        cloudinaryQuestionImageUrl = uploadResult.secure_url;
      } catch (error) {
        // Clean up both files on error
        if (data.explanationImagePath)
          deleteLocalFile(data.explanationImagePath);
        console.error("Failed to upload question image:", error);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.QUESTION_IMAGE_UPLOAD_FAILED,
        );
      }
    }

    // Upload explanation image to Cloudinary if provided
    if (data.explanationImagePath) {
      try {
        const uploadResult = await uploadImageFromPath(
          data.explanationImagePath,
          "questions/explanations",
        );
        cloudinaryExplanationImageUrl = uploadResult.secure_url;
      } catch (error) {
        // Delete question image if explanation upload fails
        if (cloudinaryQuestionImageUrl && data.questionImagePath) {
          const publicId = extractPublicIdFromUrl(cloudinaryQuestionImageUrl);
          if (publicId) {
            try {
              await deleteImage(publicId);
            } catch (deleteError) {
              console.warn("Failed to cleanup question image:", deleteError);
            }
          }
        }
        console.error("Failed to upload explanation image:", error);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.EXPLANATION_IMAGE_UPLOAD_FAILED,
        );
      }
    }

    const question = await prisma.question.create({
      data: {
        topicId: data.topicId,
        questionText: data.questionText,
        questionImageUrl: cloudinaryQuestionImageUrl,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correctOption: Number(data.correctOption),
        explanation: data.explanation,
        explanationImageUrl: cloudinaryExplanationImageUrl,
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
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.QUESTION_NOT_FOUND,
      );
    }

    return question;
  }

  async updateQuestion(id: string, data: UpdateQuestionInput) {
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      // Clean up uploaded files if question not found
      if (data.questionImagePath) deleteLocalFile(data.questionImagePath);
      if (data.explanationImagePath) deleteLocalFile(data.explanationImagePath);
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.QUESTION_NOT_FOUND,
      );
    }

    if (
      data.correctOption &&
      ![1, 2, 3, 4].includes(Number(data.correctOption))
    ) {
      // Clean up uploaded files if validation fails
      if (data.questionImagePath) deleteLocalFile(data.questionImagePath);
      if (data.explanationImagePath) deleteLocalFile(data.explanationImagePath);
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CORRECT_OPTION_INVALID,
      );
    }

    // Initialize with existing or provided URLs
    let cloudinaryQuestionImageUrl = question.questionImageUrl;
    let cloudinaryExplanationImageUrl = question.explanationImageUrl;

    // Handle question image logic
    if (data.removeImageQuestion) {
      // User wants to delete the question image
      if (question.questionImageUrl) {
        const publicId = extractPublicIdFromUrl(question.questionImageUrl);
        if (publicId) {
          try {
            await deleteImage(publicId);
            cloudinaryQuestionImageUrl = null;
          } catch (deleteError) {
            console.warn("Failed to delete question image:", deleteError);
          }
        }
      }
      cloudinaryQuestionImageUrl = null;
    } else if (data.questionImagePath) {
      // User is uploading a new question image
      let oldQuestionImagePublicId: string | null = null;

      if (question.questionImageUrl) {
        oldQuestionImagePublicId = extractPublicIdFromUrl(
          question.questionImageUrl,
        );
      }

      try {
        // Upload new question image
        const uploadResult = await uploadImageFromPath(
          data.questionImagePath,
          "questions",
        );
        cloudinaryQuestionImageUrl = uploadResult.secure_url;

        // Delete old question image from Cloudinary after successful upload
        if (oldQuestionImagePublicId) {
          try {
            await deleteImage(oldQuestionImagePublicId);
          } catch (deleteError) {
            console.warn("Failed to delete old question image:", deleteError);
          }
        }
      } catch (error) {
        // Clean up explanation image if uploaded
        if (data.explanationImagePath)
          deleteLocalFile(data.explanationImagePath);
        console.error("Failed to upload question image:", error);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.QUESTION_IMAGE_UPLOAD_FAILED,
        );
      }
    }
    // else: keep the existing image (cloudinaryQuestionImageUrl already set)

    // Handle explanation image logic
    if (data.removeImageExplanation) {
      // User wants to delete the explanation image
      if (question.explanationImageUrl) {
        const publicId = extractPublicIdFromUrl(question.explanationImageUrl);
        if (publicId) {
          try {
            await deleteImage(publicId);
            cloudinaryExplanationImageUrl = null;
          } catch (deleteError) {
            console.warn("Failed to delete explanation image:", deleteError);
          }
        }
      }
      cloudinaryExplanationImageUrl = null;
    } else if (data.explanationImagePath) {
      // User is uploading a new explanation image
      let oldExplanationImagePublicId: string | null = null;

      if (question.explanationImageUrl) {
        oldExplanationImagePublicId = extractPublicIdFromUrl(
          question.explanationImageUrl,
        );
      }

      try {
        // Upload new explanation image
        const uploadResult = await uploadImageFromPath(
          data.explanationImagePath,
          "questions/explanations",
        );
        cloudinaryExplanationImageUrl = uploadResult.secure_url;

        // Delete old explanation image from Cloudinary after successful upload
        if (oldExplanationImagePublicId) {
          try {
            await deleteImage(oldExplanationImagePublicId);
          } catch (deleteError) {
            console.warn(
              "Failed to delete old explanation image:",
              deleteError,
            );
          }
        }
      } catch (error) {
        console.error("Failed to upload explanation image:", error);
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_MESSAGES.EXPLANATION_IMAGE_UPLOAD_FAILED,
        );
      }
    }
    // else: keep the existing image (cloudinaryExplanationImageUrl already set)

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        questionText: data.questionText,
        questionImageUrl: cloudinaryQuestionImageUrl,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correctOption: data.correctOption
          ? Number(data.correctOption)
          : undefined,
        explanation: data.explanation,
        explanationImageUrl: cloudinaryExplanationImageUrl,
        difficultyLevel: data.difficultyLevel,
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
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.QUESTION_NOT_FOUND,
      );
    }

    if (question._count.answer > 0) {
      // Soft delete if question has been attempted
      await prisma.question.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        softDeleted: true,
        message:
          "Question has been deactivated (soft deleted) as it has associated attempts",
      };
    }

    // Delete both images from Cloudinary before hard delete
    const deletePromises = [];

    if (question.questionImageUrl) {
      const publicId = extractPublicIdFromUrl(question.questionImageUrl);
      if (publicId) {
        deletePromises.push(
          deleteImage(publicId).catch((err) =>
            console.warn("Failed to delete question image:", err),
          ),
        );
      }
    }

    if (question.explanationImageUrl) {
      const publicId = extractPublicIdFromUrl(question.explanationImageUrl);
      if (publicId) {
        deletePromises.push(
          deleteImage(publicId).catch((err) =>
            console.warn("Failed to delete explanation image:", err),
          ),
        );
      }
    }

    // Wait for all image deletions (continue even if some fail)
    await Promise.allSettled(deletePromises);

    // Hard delete the question from database
    await prisma.question.delete({
      where: { id },
    });

    return {
      softDeleted: false,
      message: "Question deleted successfully along with all associated images",
    };
  }

  async bulkUploadQuestions({ userId, file, topicId }: BulkUploadInput) {
    if (!file) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.FILE_REQUIRED);
    }

    // Validate topic once
    const topicExists = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topicExists) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TOPIC_NOT_FOUND,
      );
    }

    // Determine file type and parse accordingly
    const originalName = file.originalname?.toLowerCase() || "";
    const isExcel =
      originalName.endsWith(".xlsx") ||
      originalName.endsWith(".xls") ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel";
    const isCsv = originalName.endsWith(".csv") || file.mimetype === "text/csv";

    if (!isExcel && !isCsv) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_FILE_TYPE_CSV_EXCEL,
      );
    }

    let results: Record<string, string>[] = [];
    const errors: { row: number; error: string }[] = [];

    if (isExcel) {
      // Parse Excel file
      try {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            ERROR_MESSAGES.EXCEL_NO_SHEETS,
          );
        }

        const sheet = workbook.Sheets[sheetName];
        results = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
          raw: false,
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Failed to parse Excel file:", error);
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.EXCEL_PARSE_FAILED,
        );
      }
    } else {
      // Parse CSV file
      await new Promise<void>((resolve, reject) => {
        Readable.from(file.buffer)
          .pipe(csv())
          .on("data", (row: Record<string, string>) => results.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
    }

    if (results.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.FILE_EMPTY);
    }

    results = results.map((row) => {
      const normalized: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.replace(/^\uFEFF/, "").trim();
        normalized[cleanKey] = row[key];
      }
      return normalized;
    });

    // Process rows
    const questionsToCreate: {
      topicId: string;
      questionText: string;
      option1: string;
      option2: string;
      option3: string;
      option4: string;
      correctOption: number;
      explanation: string | null;
      difficultyLevel: DifficultyLevel;
      questionImageUrl: string | null;
      explanationImageUrl: string | null;
      isActive: boolean;
      createdById: string;
    }[] = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // header + 1-based index

      const questionText = row["Question"]?.trim();
      const option1 = row["Option A"]?.trim();
      const option2 = row["Option B"]?.trim();
      const option3 = row["Option C"]?.trim();
      const option4 = row["Option D"]?.trim();
      const explanation = row["Explanation"]?.trim() || null;
      const correctOption = mapCorrectAnswer(row["Correct Answer"]);
      const difficulty = row["Difficulty"]?.trim()?.toUpperCase();

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

      // Validate difficulty if provided
      const validDifficulty: DifficultyLevel =
        difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)
          ? (difficulty as DifficultyLevel)
          : "MEDIUM";

      questionsToCreate.push({
        topicId,
        questionText,
        option1,
        option2,
        option3,
        option4,
        correctOption,
        explanation,
        difficultyLevel: validDifficulty,
        questionImageUrl: null,
        explanationImageUrl: null,
        isActive: true,
        createdById: userId,
      });
    }

    if (questionsToCreate.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.NO_VALID_QUESTIONS,
      );
    }

    // Batch insert in chunks for production performance
    const BATCH_SIZE = 500;
    let totalCreated = 0;

    for (let i = 0; i < questionsToCreate.length; i += BATCH_SIZE) {
      const batch = questionsToCreate.slice(i, i + BATCH_SIZE);
      const created = await prisma.question.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalCreated += created.count;
    }

    return {
      totalRows: results.length,
      successfullyCreated: totalCreated,
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
