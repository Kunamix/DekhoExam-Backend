import { topicService } from "@/services/topic.service";
import { ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";


export const createTopic = asyncHandler(
  async (req: Request, res: Response) => {
    const topic = await topicService.create(req.body);

    return res.status(201).json(
      new ApiResponse(
        201,
        topic,
        "Topic created successfully",
      ),
    );
  },
);


export const getAllTopics = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      isActive,
      search,
      subjectId,
    } = req.query;

    const result = await topicService.getAll({
      page: Number(page),
      limit: Number(limit),
      isActive:
        isActive !== undefined
          ? isActive === "true"
          : undefined,
      search: search as string | undefined,
      subjectId: subjectId as string | undefined,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Topics fetched successfully",
      ),
    );
  },
);


export const getTopicById = asyncHandler(
  async (req: Request, res: Response) => {
    const topic = await topicService.getById(
      req.params.id.toString(),
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        topic,
        "Topic fetched successfully",
      ),
    );
  },
);


export const updateTopic = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await topicService.update({
      id: req.params.id,
      ...req.body,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        updated,
        "Topic updated successfully",
      ),
    );
  },
);

export const deleteTopic = asyncHandler(
  async (req: Request, res: Response) => {
    await topicService.delete(req.params.id.toString());

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Topic deleted successfully",
        ),
      );
  },
);
