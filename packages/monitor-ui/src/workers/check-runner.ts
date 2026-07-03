/**
 * check-runner.ts
 *
 * BullMQ worker that executes HTTP monitor checks, writes results to
 * check_results, and dispatches alerts when status transitions occur.
 *
 * Runs as a separate process (`monitor-worker` container). The scheduler
 * loop enqueues one job per enabled HTTP monitor every intervalSeconds.
 *
 * Non-HTTP checks (TCP, DNS, SSL, ICMP) are delegated to Gatus.
 */

import { Worker, Queue } from "bullmq";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { dispatchAlerts } from "../lib/alerts";

const DB_URL = process.env.DATABASE_URL!;
const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";

const [redisHost, redisPortStr] = REDIS_URL.replace("redis://", "").split(":");
const redisPort = Number(redisPortStr ?? 6379);
const connection = { host: redisHost, port: redisPort };

const pg = postgres(DB_URL, { prepare: false });
const db = drizzle(pg, { schema });

const QUEUE_NAME = "http-checks";

// ── Scheduler ─────────────────────────────────────────────────────────────────
// Runs every 10 seconds, enqueues jobs for monitors whose time has come.

async function schedulerLoop() {
  const queue = new Queue(QUEUE_NAME, { connection });

  setInterval(async () => {
    const now = Date.now();
    const monitors = await db
      .select()
      .from(schema.monitors)
      .where(
        and(
          eq(schema.monitors.enabled, true),
          eq(schema.monitors.type, "http")
        )
      );

    for (const monitor of monitors) {
      // Check if a job for this monitor is already pending
      const jobId = `check-${monitor.id}`;
      const existing = await queue.getJob(jobId);
      if (existing) continue;

      // Schedule: enqueue jobs for monitors whose interval has elapsed since last check
      // (Using delay=0 for simplicity; production can use repeatable jobs)
      await queue.add(
        "run-check",
        { monitorId: monitor.id, orgId: monitor.orgId },
        { jobId, removeOnComplete: 100, removeOnFail: 50 }
      );
    }
  }, 10_000);

  console.log("Scheduler started — polling every 10s for due HTTP checks");
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker<{ monitorId: string; orgId: string }>(
  QUEUE_NAME,
  async (job) => {
    const { monitorId, orgId } = job.data;

    const [monitor] = await db
      .select()
      .from(schema.monitors)
      .where(eq(schema.monitors.id, monitorId));

    if (!monitor || !monitor.enabled) return;

    const start = Date.now();
    let status: "up" | "down" = "down";
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        monitor.timeoutSeconds * 1000
      );

      const res = await fetch(monitor.target, {
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);
      statusCode = res.status;
      const expected = monitor.expectedStatus ?? 200;
      status = res.status === expected ? "up" : "down";
      if (status === "down") {
        errorMessage = `Expected HTTP ${expected}, got ${res.status}`;
      }
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err);
      status = "down";
    }

    const responseTimeMs = Date.now() - start;

    // Write result
    await db.insert(schema.checkResults).values({
      monitorId,
      status,
      responseTimeMs,
      statusCode,
      errorMessage,
    });

    // Fetch previous result to detect transition
    const [prev] = await db
      .select()
      .from(schema.checkResults)
      .where(eq(schema.checkResults.monitorId, monitorId))
      .orderBy(desc(schema.checkResults.checkedAt))
      .offset(1)
      .limit(1);

    const prevStatus = prev?.status ?? "unknown";
    const isTransition = prevStatus !== status;

    if (isTransition && (status === "down" || status === "up")) {
      await dispatchAlerts({ monitorId, orgId, status, responseTimeMs, errorMessage });

      // Create or resolve incident
      if (status === "down") {
        await db.insert(schema.incidents).values({
          orgId,
          monitorId,
          title: `${monitor.name} is DOWN`,
          status: "investigating",
        });
      } else {
        // Mark the most recent open incident as resolved
        const [openIncident] = await db
          .select()
          .from(schema.incidents)
          .where(
            and(
              eq(schema.incidents.monitorId, monitorId),
              eq(schema.incidents.status, "investigating")
            )
          )
          .orderBy(desc(schema.incidents.startedAt))
          .limit(1);

        if (openIncident) {
          await db
            .update(schema.incidents)
            .set({ status: "resolved", resolvedAt: new Date() })
            .where(eq(schema.incidents.id, openIncident.id));
        }
      }
    }

    // Re-enqueue for next interval
    const queue = new Queue(QUEUE_NAME, { connection });
    await queue.add(
      "run-check",
      { monitorId, orgId },
      {
        jobId: `check-${monitorId}`,
        delay: monitor.intervalSeconds * 1000,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  },
  { connection, concurrency: 20 }
);

worker.on("failed", (job, err) => {
  console.error(`Check job failed for monitor ${job?.data.monitorId}:`, err.message);
});

worker.on("completed", (job) => {
  console.log(`Check complete: monitor ${job.data.monitorId}`);
});

// Start the scheduler
await schedulerLoop();

console.log(`Check runner worker started (concurrency=20)`);
