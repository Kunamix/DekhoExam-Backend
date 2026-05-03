import { topicService } from "@/services/topic.service";
import { ApiResponse, asyncHandler } from "@/utils";
import { Request, Response } from "express";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";

export const createTopic = asyncHandler(async (req: Request, res: Response) => {
  const topic = await topicService.create(req.body);

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        topic,
        SUCCESS_MESSAGES.TOPIC_CREATED,
      ),
    );
});

export const getAllTopics = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = 1, limit = 10, isActive, search, subjectId } = req.query;

    const result = await topicService.getAll({
      page: Number(page),
      limit: Number(limit),
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      search: search as string | undefined,
      subjectId: subjectId as string | undefined,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          SUCCESS_MESSAGES.TOPICS_FETCHED,
        ),
      );
  },
);

export const getTopicById = asyncHandler(
  async (req: Request, res: Response) => {
    const topic = await topicService.getById(req.params.id.toString());

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, topic, SUCCESS_MESSAGES.TOPIC_FETCHED),
      );
  },
);

export const updateTopic = asyncHandler(async (req: Request, res: Response) => {
  const updated = await topicService.update({
    id: req.params.id,
    ...req.body,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, updated, SUCCESS_MESSAGES.TOPIC_UPDATED),
    );
});

export const deleteTopic = asyncHandler(async (req: Request, res: Response) => {
  await topicService.delete(req.params.id.toString());

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, SUCCESS_MESSAGES.TOPIC_DELETED));
});
