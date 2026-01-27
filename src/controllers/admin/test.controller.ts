import { testService } from "@/services/test.service";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";


export const getAllTests = asyncHandler(
  async (req: Request, res: Response) => {
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
      isActive:
        isActive !== undefined
          ? isActive === "true"
          : undefined,
      isPaid:
        isPaid !== undefined
          ? isPaid === "true"
          : undefined,
      search: search as string | undefined,
      categoryId: categoryId as string | undefined,
      subjectId: subjectId as string | undefined,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Tests fetched successfully",
      ),
    );
  },
);

export const createTest = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const {
      categoryId,
      subjectId,
      name,
      description,
      durationMinutes,
      positiveMarks,
      negativeMarks,
      isPaid,
      testNumber,
    } = req.body;

    const result = await testService.createTest({
      userId,
      categoryId,
      subjectId,
      name,
      description,
      durationMinutes:
        durationMinutes !== undefined
          ? Number(durationMinutes)
          : undefined,
      positiveMarks,
      negativeMarks,
      isPaid,
      testNumber: Number(testNumber),
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          ...result.test,
          questionsAssigned: result.questionsAssigned,
        },
        "Test created successfully with auto-assigned unused questions",
      ),
    );
  },
);

export const getTestStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { testId } = req.query;

    const stats =
      await testService.getStats(
        testId as string | undefined,
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        stats,
        "Test statistics fetched successfully",
      ),
    );
  },
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

export const updateTest = asyncHandler(
  async (req: Request, res: Response) => {
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

    return res.status(200).json(
      new ApiResponse(
        200,
        updated,
        "Test updated successfully",
      ),
    );
  },
);

export const cloneTest = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { id } = req.params;
    const { testNumber } = req.body;

    const cloned = await testService.clone(
      id.toString(),
      Number(testNumber),
      userId,
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        cloned,
        "Test cloned successfully",
      ),
    );
  },
);

export const deleteTest = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await testService.delete(id.toString());

    const message = result.deactivated
      ? "Test deactivated (soft deleted) due to existing attempts"
      : "Test deleted successfully";

    return res
      .status(200)
      .json(new ApiResponse(200, {}, message));
  },
);

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const test =
      await testService.toggleStatus(id.toString());

    return res.status(200).json(
      new ApiResponse(
        200,
        test,
        `Test ${
          test.isActive ? "activated" : "deactivated"
        } successfully`,
      ),
    );
  },
);