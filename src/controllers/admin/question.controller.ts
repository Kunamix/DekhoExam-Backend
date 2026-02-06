import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { questionService } from "@/services/question.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const createQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    const {
      topicId,
      questionText,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      difficultyLevel,
    } = req.body;

    const files = (req as any).files;
    const questionImagePath = files?.questionImage?.[0]?.path;
    const explanationImagePath = files?.explanationImage?.[0]?.path;

    if (
      !topicId ||
      !questionText ||
      !option1 ||
      !option2 ||
      !option3 ||
      !option4 ||
      !correctOption
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.ALL_FIELDS_REQUIRED,
      );
    }

    const question = await questionService.createQuestion({
      userId,
      topicId,
      questionText,
      questionImagePath,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      explanationImagePath,
      difficultyLevel,
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          question,
          SUCCESS_MESSAGES.QUESTION_CREATED,
        ),
      );
  },
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
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.QUESTIONS_FETCHED,
        ),
      );
  },
);

export const getQuestionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const question = await questionService.getQuestionById(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          question,
          SUCCESS_MESSAGES.QUESTION_FETCHED,
        ),
      );
  },
);

export const updateQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      questionText,
      option1,
      option2,
      option3,
      option4,
      correctOption,
      explanation,
      difficultyLevel,
      isActive,
      removeImageQuestion,
      removeImageExplanation,
      displayOrder
    } = req.body;

    // Parse boolean and number fields from FormData
    const parsedIsActive = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const parsedRemoveImageQuestion = removeImageQuestion === 'true';
    const parsedRemoveImageExplanation = removeImageExplanation === 'true';
    const parsedDisplayOrder = displayOrder ? parseInt(displayOrder) : undefined;

    const files = (req as any).files;
    const questionImagePath = files?.questionImage?.[0]?.path;
    const explanationImagePath = files?.explanationImage?.[0]?.path;

    const updatedQuestion = await questionService.updateQuestion(
      id.toString(),
      {
        questionText,
        questionImagePath,
        option1,
        option2,
        option3,
        option4,
        correctOption,
        explanation,
        explanationImagePath,
        difficultyLevel,
        isActive: parsedIsActive,
        removeImageQuestion: parsedRemoveImageQuestion,
        removeImageExplanation: parsedRemoveImageExplanation,
        displayOrder: parsedDisplayOrder,
      },
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedQuestion,
          SUCCESS_MESSAGES.QUESTION_UPDATED,
        ),
      );
  },
);

export const deleteQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await questionService.deleteQuestion(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, {}, result.message));
  },
);

export const bulkUploadQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    const file = (req as any).file;
    const { topicId } = req.body;

    if (!topicId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TOPIC_ID_REQUIRED,
      );
    }

    const result = await questionService.bulkUploadQuestions({
      userId,
      file,
      topicId,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          `Bulk upload completed. ${result.successfullyCreated} questions created, ${result.failedRows} failed.`,
        ),
      );
  },
);

export const getQuestionStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { topicId, subjectId } = req.query;

    const stats = await questionService.getQuestionStats({
      topicId: topicId as string,
      subjectId: subjectId as string,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.QUESTION_STATS_FETCHED,
        ),
      );
  },
);