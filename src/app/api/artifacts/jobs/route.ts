import { NextResponse } from "next/server";
import { ServiceContainer } from "../../../services/service-container";

// GET /api/artifacts/jobs - Get all artifact jobs
export async function GET() {
  const container = ServiceContainer.getInstance();
  const jobQueueService = await container.getJobQueueService();
  const jobs = await jobQueueService.getJobs("artifact_generate");
  return NextResponse.json(jobs);
}
