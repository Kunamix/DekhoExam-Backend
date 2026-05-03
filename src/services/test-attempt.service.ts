import { prisma } from "@/configs";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";

interface SaveAnswerInput {
  attemptId: string;
  questionId: string;
  selectedOption?: number | null;
  timeSpent?: number;
}

export class TestAttemptService {
  async getTestQuestions(attemptId: string, userId: string) {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      include: {
        test: true,
      },
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_ATTEMPT,
      );
    }

    // ⏱ Time left calculation
    const now = new Date();
    const startTime = new Date(attempt.startedAt);
    const durationMs = attempt.test.durationMinutes * 60 * 1000;
    const expiryTime = new Date(startTime.getTime() + durationMs);

    let timeLeftSeconds = Math.floor(
      (expiryTime.getTime() - now.getTime()) / 1000,
    );
    if (timeLeftSeconds < 0) timeLeftSeconds = 0;

    // 📦 Fetch questions in stored order
    const questionIds = attempt.questionIds as string[];

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        questionText: true,
        option1: true,
        option2: true,
        option3: true,
        option4: true,
        questionImageUrl: true,
        difficultyLevel: true,
      },
    });

    const orderedQuestions = questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean);

    return {
      questions: orderedQuestions,
      timeLeftSeconds,
    };
  }

  async saveAnswer({
    attemptId,
    questionId,
    selectedOption,
    timeSpent = 0,
  }: SaveAnswerInput) {
    // Ensure attempt is still active
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: { status: true },
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.CANNOT_SAVE_ANSWER,
      );
    }

    const existingAnswer = await prisma.testAttemptAnswer.findFirst({
      where: {
        attemptId,
        questionId,
      },
    });

    if (existingAnswer) {
      await prisma.testAttemptAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          selectedOption:
            selectedOption !== undefined ? Number(selectedOption) : null,
          timeSpent,
        },
      });
    } else {
      await prisma.testAttemptAnswer.create({
        data: {
          attemptId,
          questionId,
          selectedOption:
            selectedOption !== undefined ? Number(selectedOption) : null,
          timeSpent,
        },
      });
    }
  }

  async submitTest(attemptId: string) {
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });

    if (!attempt || attempt.status === "SUBMITTED") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_ATTEMPT_OR_SUBMITTED,
      );
    }

    const userAnswers = await prisma.testAttemptAnswer.findMany({
      where: { attemptId },
      include: { question: true },
    });

    let correct = 0;
    let incorrect = 0;
    let unattempted = attempt.totalQuestions - userAnswers.length;

    const posMarks = Number(attempt.test.positiveMarks);
    const negMarks = Number(attempt.test.negativeMarks);

    for (const ans of userAnswers) {
      if (ans.selectedOption === null) {
        unattempted++;
        continue;
      }

      const isCorrect = ans.selectedOption === ans.question.correctOption;

      await prisma.testAttemptAnswer.update({
        where: { id: ans.id },
        data: {
          isCorrect,
          marksObtained: isCorrect ? posMarks : -negMarks,
        },
      });

      if (isCorrect) correct++;
      else incorrect++;
    }

    const totalMarks = correct * posMarks - incorrect * negMarks;

    const percentage = (totalMarks / (attempt.totalQuestions * posMarks)) * 100;

    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        correctCount: correct,
        incorrectCount: incorrect,
        attemptedCount: correct + incorrect,
        totalMarks,
        percentage,
      },
    });

    return { attemptId };
  }

  async getTestResult(attemptId: string) {
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          select: {
            name: true,
            totalQuestions: true,
            positiveMarks: true,
          },
        },
      },
    });

    if (!attempt || attempt.status !== "SUBMITTED") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.RESULT_NOT_AVAILABLE,
      );
    }

    const data = {
      testName: attempt.test.name,
      testId: attempt.testId,
      score: Number(attempt.totalMarks),
      totalScore:
        attempt.test.totalQuestions * Number(attempt.test.positiveMarks),
      percentage: Number(attempt.percentage),
      correct: attempt.correctCount,
      incorrect: attempt.incorrectCount,
      unattempted: attempt.totalQuestions - attempt.attemptedCount,
      accuracy:
        attempt.attemptedCount > 0
          ? ((attempt.correctCount / attempt.attemptedCount) * 100).toFixed(1)
          : 0,
      timeTaken: "25m 30s",
    };

    return data;
  }

  async viewTestSolution(attemptId: string, currentUserId: string) {
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          select: {
            name: true,
            positiveMarks: true,
            negativeMarks: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionImageUrl: true,
                option1: true,
                option2: true,
                option3: true,
                option4: true,
                correctOption: true,
                explanation: true,
                explanationImageUrl: true,
                difficultyLevel: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.TEST_ATTEMPT_NOT_FOUND,
      );
    }

    if (attempt.userId !== currentUserId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_MESSAGES.NO_PERMISSION_VIEW_SOLUTION,
      );
    }

    if (attempt.status !== "SUBMITTED") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.TEST_IN_PROGRESS,
      );
    }

    // 1️⃣ Fetch ALL questions of this attempt
    const questionIds = attempt.questionIds as string[];

    const allQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        questionText: true,
        questionImageUrl: true,
        option1: true,
        option2: true,
        option3: true,
        option4: true,
        correctOption: true,
        explanation: true,
        explanationImageUrl: true,
        difficultyLevel: true,
      },
    });

    // 2️⃣ Map answers by questionId
    const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    // 3️⃣ Build unified question list (ATTEMPTED + SKIPPED)
    const questions = allQuestions.map((q) => {
      const ans = answerMap.get(q.id);

      let status: "CORRECT" | "INCORRECT" | "SKIPPED" = "SKIPPED";

      if (ans) {
        status =
          ans.selectedOption === q.correctOption ? "CORRECT" : "INCORRECT";
      }

      return {
        id: q.id,
        questionText: q.questionText,
        difficulty: q.difficultyLevel,
        options: [q.option1, q.option2, q.option3, q.option4],
        correctOption: q.correctOption,
        userSelectedOption: ans?.selectedOption ?? null,
        status,
        marks: ans?.marksObtained ?? 0,
        timeSpent: ans?.timeSpent ?? 0,
        explanation: q.explanation,
        explanationImage: q.explanationImageUrl,
        questionImage: q.questionImageUrl,
      };
    });

    // 4️⃣ Summary
    const totalQuestions = attempt.totalQuestions;
    const attempted = attempt.attemptedCount;
    const skippedCount = totalQuestions - attempted;

    const summary = {
      totalQuestions,
      attempted,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      skippedCount,
      accuracy:
        attempted > 0
          ? Math.round((attempt.correctCount / attempted) * 100)
          : 0,
      totalScore: attempt.totalMarks,
    };

    return {
      test: {
        name: attempt.test.name,
        timeTakenSeconds: Math.floor(
          (new Date(attempt.submittedAt!).getTime() -
            new Date(attempt.startedAt).getTime()) /
            1000,
        ),
        maxScore: totalQuestions * Number(attempt.test.positiveMarks),
      },
      summary,
      questions,
    };
  }

  async getAttemptHistory(userId: string) {
    const attempts = await prisma.testAttempt.findMany({
      where: {
        userId,
        status: "SUBMITTED",
      },
      orderBy: { submittedAt: "desc" },
      include: {
        test: {
          select: {
            name: true,
            totalQuestions: true,
          },
        },
      },
    });

    return attempts.map((a) => ({
      attemptId: a.id,
      testName: a.test.name,
      score: Number(a.totalMarks),
      percentage: Number(a.percentage),
      submittedAt: a.submittedAt,
      accuracy:
        a.attemptedCount > 0
          ? Math.round((a.correctCount / a.attemptedCount) * 100)
          : 0,
    }));
  }
}

export const testAttemptService = new TestAttemptService();