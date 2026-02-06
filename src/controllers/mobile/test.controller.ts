import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";
import { testAttemptService } from "@/services/test-attempt.service";
import { testService } from "@/services/test.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const getTestsByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const tests = await testService.getTestsByCategory(
      categoryId.toString(),
      userId,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, tests, SUCCESS_MESSAGES.TESTS_FETCHED),
      );
  },
);

export const getPopularTests = asyncHandler(
  async (_req: Request, res: Response) => {
    const tests = await testService.getPopularTests(5);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          tests,
          SUCCESS_MESSAGES.POPULAR_TESTS_FETCHED,
        ),
      );
  },
);

export const getTestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const test = await testService.getTestById(id.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, test, SUCCESS_MESSAGES.TEST_FETCHED));
});

export const getTestInstructions = asyncHandler(
  async (req: Request, res: Response) => {
    const { testId } = req.params;

    const instructions = await testService.getTestInstructions(
      testId.toString(),
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          instructions,
          SUCCESS_MESSAGES.INSTRUCTIONS_FETCHED,
        ),
      );
  },
);

export const startTest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { testId } = req.params;

  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
    );
  }

  const result = await testService.startTest(userId, testId.toString());

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        result,
        SUCCESS_MESSAGES.TEST_STARTED,
      ),
    );
});

export const getTestQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const result = await testAttemptService.getTestQuestions(
      attemptId.toString(),
      userId,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.QUESTIONS_LOADED,
        ),
      );
  },
);

export const saveAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { questionId, selectedOption, timeSpent } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
    );
  }

  await testAttemptService.saveAnswer({
    attemptId: attemptId.toString(),
    questionId,
    selectedOption,
    timeSpent,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.ANSWER_SAVED));
});

export const submitTest = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
    );
  }

  const result = await testAttemptService.submitTest(attemptId.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, result, SUCCESS_MESSAGES.TEST_SUBMITTED),
    );
});

export const getTestResult = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const result = await testAttemptService.getTestResult(attemptId.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.RESULT_FETCHED,
        ),
      );
  },
);

export const viewTestSolution = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userObj = req.user as any;
    const currentUserId = userObj?.id || userObj?.userId;

    if (!currentUserId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const result = await testAttemptService.viewTestSolution(
      attemptId.toString(),
      currentUserId,
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.SOLUTIONS_FETCHED,
        ),
      );
  },
);

export const getAttemptHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST,
      );
    }

    const history = await testAttemptService.getAttemptHistory(userId);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          history,
          SUCCESS_MESSAGES.HISTORY_FETCHED,
        ),
      );
  },
);
