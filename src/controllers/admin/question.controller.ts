import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { questionService } from "@/services/question.service";

export const createQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const {
      topicId,
      questionText,
      questionImageUrl,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      explanationImageUrl,
      difficultyLevel,
    } = req.body;

    if (
      !topicId ||
      !questionText ||
      !option1 ||
      !option2 ||
      !option3 ||
      !option4 ||
      !correctOption
    ) {
      throw new ApiError(400, "All required fields must be provided");
    }

    const question = await questionService.createQuestion({
      userId,
      topicId,
      questionText,
      questionImageUrl,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      explanationImageUrl,
      difficultyLevel,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, question, "Question created successfully"));
  }
);

export const getAllQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page,
      limit,
      isActive,
      search,
      topicId,
      subjectId,
      difficultyLevel,
    } = req.query;

    const result = await questionService.getAllQuestions({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isActive: isActive as string,
      search: search as string,
      topicId: topicId as string,
      subjectId: subjectId as string,
      difficultyLevel: difficultyLevel?.toString(),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Questions fetched successfully"));
  }
);

export const getQuestionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const question = await questionService.getQuestionById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, question, "Question fetched successfully"));
  }
);

export const updateQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      questionText,
      questionImageUrl,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      explanationImageUrl,
      difficultyLevel,
      isActive,
    } = req.body;

    const updatedQuestion = await questionService.updateQuestion(id.toString(), {
      questionText,
      questionImageUrl,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      explanationImageUrl,
      difficultyLevel,
      isActive,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedQuestion, "Question updated successfully")
      );
  }
);

export const deleteQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await questionService.deleteQuestion(id.toString());

    return res.status(200).json(new ApiResponse(200, {}, result.message));
  }
);

export const bulkUploadQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const file = (req as any).file;
    const { topicId } = req.body;

    if (!topicId) {
      throw new ApiError(400, "Topic ID is required");
    }

    const result = await questionService.bulkUploadQuestions({
      userId,
      file,
      topicId,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Bulk upload completed. ${result.successfullyCreated} questions created, ${result.failedRows} failed.`
      )
    );
  }
);

export const getQuestionStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { topicId, subjectId } = req.query;

    const stats = await questionService.getQuestionStats({
      topicId: topicId as string,
      subjectId: subjectId as string,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Question statistics fetched successfully")
      );
  }
);