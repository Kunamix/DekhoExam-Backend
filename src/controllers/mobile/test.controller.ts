import { testAttemptService } from "@/services/test-attempt.service";
import { testService } from "@/services/test.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";

export const getTestsByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const tests = await testService.getTestsByCategory(
      categoryId.toString(),
      userId,
    );

    return res
      .status(200)
      .json(new ApiResponse(200, tests, "Tests fetched successfully"));
  },
);

export const getPopularTests = asyncHandler(
  async (_req: Request, res: Response) => {
    const tests = await testService.getPopularTests(5);

    return res
      .status(200)
      .json(new ApiResponse(200, tests, "Popular tests fetched"));
  }
);

export const getTestById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const test = await testService.getTestById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, test, "Test fetched successfully"));
  }
);

export const getTestInstructions = asyncHandler(
  async (req: Request, res: Response) => {
    const { testId } = req.params;

    const instructions = await testService.getTestInstructions(testId.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(200, instructions, "Instructions fetched")
      );
  }
);

export const startTest = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { testId } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result = await testService.startTest(userId, testId);

    return res.status(201).json(
      new ApiResponse(201, result, "Test started successfully")
    );
  }
);

export const getTestQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result = await testAttemptService.getTestQuestions(
      attemptId.toString(),
      userId
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Questions fetched"
      )
    );
  }
);

export const saveAnswer = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const { questionId, selectedOption, timeSpent } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    await testAttemptService.saveAnswer({
      attemptId:attemptId.toString(),
      questionId,
      selectedOption,
      timeSpent,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Saved"));
  }
);

export const submitTest = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result =
      await testAttemptService.submitTest(attemptId.toString());

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Test submitted successfully"
      )
    );
  }
);

export const getTestResult = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result =
      await testAttemptService.getTestResult(attemptId.toString());

    return res.status(200).json(
      new ApiResponse(200, result, "Result fetched")
    );
  }
);

export const viewTestSolution = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const userObj = req.user as any;
    const currentUserId =
      userObj?.id || userObj?.userId;

    if (!currentUserId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const result =
      await testAttemptService.viewTestSolution(
        attemptId.toString(),
        currentUserId
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Solutions fetched successfully"
      )
    );
  }
);

export const getAttemptHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const history =
      await testAttemptService.getAttemptHistory(userId);

    return res.status(200).json(
      new ApiResponse(
        200,
        history,
        "History fetched"
      )
    );
  }
);