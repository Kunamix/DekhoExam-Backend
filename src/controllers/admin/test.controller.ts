import { testService } from "@/services/test.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const getAllTests = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    isActive,
    isPaid,
    search,
    categoryId,
    subjectId,
  } = req.query;

  const result = await testService.getAllTests({
    page: Number(page),
    limit: Number(limit),
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPaid: isPaid !== undefined ? isPaid === "true" : undefined,
    search: search as string | undefined,
    categoryId: categoryId as string | undefined,
    subjectId: subjectId as string | undefined,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, result, SUCCESS_MESSAGES.TESTS_FETCHED),
    );
});

export const createTest = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  const {
    categoryId,
    subjectId,
    name,
    description,
    durationMinutes,
    positiveMarks,
    negativeMarks,
    testNumber,
  } = req.body;

  const result = await testService.createTest({
    userId,
    categoryId,
    subjectId,
    name,
    description,
    durationMinutes:
      durationMinutes !== undefined ? Number(durationMinutes) : undefined,
    positiveMarks,
    negativeMarks,
    testNumber: Number(testNumber),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      {
        ...result.test,
        questionsAssigned: result.questionsAssigned,
      },
      SUCCESS_MESSAGES.TEST_CREATED,
    ),
  );
});

export const getTestStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { testId } = req.query;

    const stats = await testService.getStats(testId as string | undefined);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.TEST_STATS_FETCHED,
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

export const updateTest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updated = await testService.update({
    id,
    ...req.body,
    totalQuestions:
      req.body.totalQuestions !== undefined
        ? Number(req.body.totalQuestions)
        : undefined,
    durationMinutes:
      req.body.durationMinutes !== undefined
        ? Number(req.body.durationMinutes)
        : undefined,
    testNumber:
      req.body.testNumber !== undefined
        ? Number(req.body.testNumber)
        : undefined,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, updated, SUCCESS_MESSAGES.TEST_UPDATED),
    );
});

export const cloneTest = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  const { id } = req.params;
  const { testNumber } = req.body;

  const cloned = await testService.clone(
    id.toString(),
    Number(testNumber),
    userId,
  );

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        cloned,
        SUCCESS_MESSAGES.TEST_CLONED,
      ),
    );
});

export const deleteTest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await testService.delete(id.toString());

  const message = result.deactivated
    ? "Test deactivated (soft deleted) due to existing attempts"
    : "Test deleted successfully";

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, message));
});

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const test = await testService.toggleStatus(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          test,
          `Test ${test.isActive ? "activated" : "deactivated"} successfully`,
        ),
      );
  },
);
