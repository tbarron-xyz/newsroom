import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { ServiceContainer } from "../../../services/service-container";
import type { JobType } from "../../../services/editor.service";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

const VALID_JOB_TYPES: JobType[] = [
  "reporter",
  "newspaper",
  "daily",
  "comments",
  "events",
  "prism-daily",
  "ticker"
];

export const POST = withAuth(
  async (request: NextRequest, _user, _redis) => {
    const container = await getContainer();
    const editorService = await container.getEditorService();

    const body = await request.json();
    const { jobType, count } = body;

    if (!jobType || typeof jobType !== "string") {
      return NextResponse.json(
        { error: "Job type is required and must be a string" },
        { status: 400 }
      );
    }

    if (!VALID_JOB_TYPES.includes(jobType as JobType)) {
      return NextResponse.json(
        {
          error: `Invalid job type. Must be one of: ${VALID_JOB_TYPES.join(", ")}`
        },
        { status: 400 }
      );
    }

    const jobQueueService = await container.getJobQueueService();

    if (jobType === "daily") {
      const jobId = await jobQueueService.addJob("daily_edition", {});
      return NextResponse.json({
        jobId,
        message: "Queued daily edition generation"
      });
    } else if (jobType === "reporter") {
      const jobId = await jobQueueService.addJob("reporter_articles", {});
      return NextResponse.json({
        jobId,
        message: "Queued reporter article generation"
      });
    } else {
      const result = await editorService.runJob(jobType as JobType, {
        enforceTimeConstraint: false,
        ...(count && { count })
      });
      return NextResponse.json({ message: result.message });
    }
  },
  { requiredRole: "admin" }
);

export async function GET() {
  try {
    const container = await getContainer();
    const redis = await container.getDataStorageService();

    const editor = await redis.getEditor();

    const [reporterRunning, newspaperRunning, dailyRunning] = await Promise.all(
      [
        redis.getJobRunning("reporter"),
        redis.getJobRunning("newspaper"),
        redis.getJobRunning("daily")
      ]
    );

    const [reporterLastRun, newspaperLastRun, dailyLastRun] = await Promise.all(
      [
        redis.getJobLastRun("reporter"),
        redis.getJobLastRun("newspaper"),
        redis.getJobLastRun("daily")
      ]
    );

    const calculateNextRun = (
      lastRun: number | null,
      periodMinutes: number
    ): Date | null => {
      if (!lastRun || !periodMinutes) return null;
      return new Date(lastRun + periodMinutes * 60 * 1000);
    };

    const status = {
      status: {
        reporterJob: reporterRunning,
        newspaperJob: newspaperRunning,
        dailyJob: dailyRunning
      },
      lastRuns: {
        reporterJob: reporterLastRun ? new Date(reporterLastRun) : null,
        newspaperJob: newspaperLastRun ? new Date(newspaperLastRun) : null,
        dailyJob: dailyLastRun ? new Date(dailyLastRun) : null
      },
      nextRuns: {
        reporterJob: calculateNextRun(
          reporterLastRun,
          editor?.articleGenerationPeriodMinutes || 15
        ),
        newspaperJob: calculateNextRun(newspaperLastRun, 60),
        dailyJob: calculateNextRun(dailyLastRun, 1440)
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}
