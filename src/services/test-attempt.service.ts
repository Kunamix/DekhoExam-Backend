import { prisma } from "@/configs";
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
      throw new ApiError(400, "Invalid attempt or test already submitted");
    }

    // ⏱ Time left calculation
    const now = new Date();
    const startTime = new Date(attempt.startedAt);
    const durationMs = attempt.test.durationMinutes * 60 * 1000;
    const expiryTime = new Date(startTime.getTime() + durationMs);

    let timeLeftSeconds = Math.floor(
      (expiryTime.getTime() - now.getTime()) / 1000
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
      throw new ApiError(400, "Cannot save answer. Test is not in progress.");
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
      throw new ApiError(400, "Invalid attempt or already submitted");
    }

    const userAnswers = await prisma.testAttemptAnswer.findMany({
      where: { attemptId },
      include: { question: true },
    });

    let correct = 0;
    let incorrect = 0;
    let unattempted =
      attempt.totalQuestions - userAnswers.length;

    const posMarks = Number(attempt.test.positiveMarks);
    const negMarks = Number(attempt.test.negativeMarks);

    for (const ans of userAnswers) {
      if (ans.selectedOption === null) {
        unattempted++;
        continue;
      }

      const isCorrect =
        ans.selectedOption === ans.question.correctOption;

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

    const totalMarks =
      correct * posMarks - incorrect * negMarks;

    const percentage =
      (totalMarks /
        (attempt.totalQuestions * posMarks)) *
      100;

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
      throw new ApiError(400, "Result not available");
    }

    const data = {
      testName: attempt.test.name,
      score: Number(attempt.totalMarks),
      totalScore:
        attempt.test.totalQuestions *
        Number(attempt.test.positiveMarks),
      percentage: Number(attempt.percentage),
      correct: attempt.correctCount,
      incorrect: attempt.incorrectCount,
      unattempted:
        attempt.totalQuestions - attempt.attemptedCount,
      accuracy:
        attempt.attemptedCount > 0
          ? (
              (attempt.correctCount /
                attempt.attemptedCount) *
              100
            ).toFixed(1)
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
            totalQuestions: true,
            positiveMarks: true,
            negativeMarks: true,
          },
        },
        answers: {
          orderBy: { question: { id: "asc" } },
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
                topicId: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new ApiError(404, "Test attempt not found");
    }

    if (attempt.userId.toString() !== currentUserId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to view this solution"
      );
    }

    if (attempt.status !== "SUBMITTED") {
      throw new ApiError(
        400,
        "Test is still in progress. Submit it to view solutions"
      );
    }

    const formattedSolutions = attempt.answers.map((ans) => {
      const q = ans.question;
      let status = "UNATTEMPTED";

      if (ans.selectedOption !== null) {
        status =
          ans.selectedOption === q.correctOption
            ? "CORRECT"
            : "INCORRECT";
      }

      return {
        id: q.id,
        questionText: q.questionText,
        questionImage: q.questionImageUrl,
        options: [
          q.option1,
          q.option2,
          q.option3,
          q.option4,
        ],
        userSelectedOption: ans.selectedOption,
        correctOption: q.correctOption,
        explanation: q.explanation,
        explanationImage: q.explanationImageUrl,
        status,
        marks: ans.marksObtained,
        timeSpent: ans.timeSpent,
        difficulty: q.difficultyLevel,
      };
    });

    const summary = {
      testName: attempt.test.name,
      totalScore: attempt.totalMarks,
      maxScore:
        attempt.test.totalQuestions *
        Number(attempt.test.positiveMarks),
      accuracy:
        attempt.attemptedCount > 0
          ? Math.round(
              (attempt.correctCount /
                attempt.attemptedCount) *
                100
            )
          : 0,
      timeTakenSeconds: Math.floor(
        (new Date(attempt.submittedAt!).getTime() -
          new Date(attempt.startedAt).getTime()) /
          1000
      ),
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unattemptedCount:
        attempt.test.totalQuestions -
        attempt.attemptedCount,
    };

    return {
      summary,
      questions: formattedSolutions,
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
          ? Math.round(
              (a.correctCount / a.attemptedCount) * 100
            )
          : 0,
    }));
  }
}

export const testAttemptService = new TestAttemptService();
