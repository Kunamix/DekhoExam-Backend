import { Request, Response } from "express";
import { asyncHandler, ApiError, ApiResponse } from "@/utils";
import { subjectService } from "@/services/subject.service";

export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, imageUrl, displayOrder } = req.body;

    if (!name) {
      throw new ApiError(400, "Subject name is required");
    }

    const subject = await subjectService.createSubject({
      name,
      description,
      imageUrl,
      displayOrder,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, subject, "Subject created successfully"));
  }
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
      .status(200)
      .json(
        new ApiResponse(200, updatedSubject, "Subject updated successfully")
      );
  }
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
      .status(200)
      .json(new ApiResponse(200, result, "Subjects fetched successfully"));
  }
);

export const getSubjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subject = await subjectService.getSubjectById(id.toString());

    return res
      .status(200)
      .json(new ApiResponse(200, subject, "Subject fetched successfully"));
  }
);



export const deleteSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await subjectService.deleteSubject(id.toString());

    return res.status(200).json(new ApiResponse(200, {}, result.message));
  }
);

export const toggleSubjectStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const updatedSubject = await subjectService.toggleSubjectStatus(id.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedSubject,
          `Subject ${updatedSubject.isActive ? "activated" : "deactivated"} successfully`
        )
      );
  }
);

export const getSubjectStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const stats = await subjectService.getSubjectStats(id.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Subject statistics fetched successfully")
      );
  }
);

export const toggleStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const subject = await subjectService.toggleSubjectStatus(id.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subject,
          `Subject ${subject.isActive ? "activated" : "deactivated"} successfully`
        )
      );
  }
);

export const reorderSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      throw new ApiError(400, "Subjects array is required");
    }

    const result = await subjectService.reorderSubjects(subjects);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Subjects reordered successfully"));
  }
);