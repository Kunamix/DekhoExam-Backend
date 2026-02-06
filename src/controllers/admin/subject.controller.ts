import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { subjectService } from "@/services/subject.service";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants";

export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, imageUrl, displayOrder } = req.body;

    if (!name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.SUBJECT_NAME_REQUIRED,
      );
    }

    const subject = await subjectService.createSubject({
      name,
      description,
      imageUrl,
      displayOrder,
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          subject,
          SUCCESS_MESSAGES.SUBJECT_CREATED,
        ),
      );
  },
);

export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, imageUrl, displayOrder, isActive } = req.body;

    const updatedSubject = await subjectService.updateSubject(id.toString(), {
      name,
      description,
      imageUrl,
      displayOrder,
      isActive,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedSubject,
          SUCCESS_MESSAGES.SUBJECT_UPDATED,
        ),
      );
  },
);

export const getAllSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, isActive, search, categoryId } = req.query;

    const result = await subjectService.getAllSubjects({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isActive: isActive as string,
      search: search as string,
      categoryId: categoryId as string,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.SUBJECTS_FETCHED,
        ),
      );
  },
);

export const getSubjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subject = await subjectService.getSubjectById(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          subject,
          SUCCESS_MESSAGES.SUBJECT_FETCHED,
        ),
      );
  },
);

export const deleteSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await subjectService.deleteSubject(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, {}, result.message));
  },
);

export const toggleSubjectStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const updatedSubject = await subjectService.toggleSubjectStatus(
      id.toString(),
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          updatedSubject,
          `Subject ${updatedSubject.isActive ? "activated" : "deactivated"} successfully`,
        ),
      );
  },
);

export const getSubjectStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const stats = await subjectService.getSubjectStats(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          stats,
          SUCCESS_MESSAGES.SUBJECT_STATS_FETCHED,
        ),
      );
  },
);

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subject = await subjectService.toggleSubjectStatus(id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          subject,
          `Subject ${subject.isActive ? "activated" : "deactivated"} successfully`,
        ),
      );
  },
);

export const reorderSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.SUBJECTS_ARRAY_REQUIRED,
      );
    }

    const result = await subjectService.reorderSubjects(subjects);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.SUBJECTS_REORDERED,
        ),
      );
  },
);
