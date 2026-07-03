import { db } from "@/lib/db";
import { alertChannels, monitors, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendMail } from "@/lib/mailer";

interface AlertPayload {
  monitorId: string;
  orgId: string;
  status: "down" | "up";
  responseTimeMs?: number;
  errorMessage?: string;
}

export async function dispatchAlerts(payload: AlertPayload) {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, payload.monitorId));
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, payload.orgId));

  if (!monitor || !org) return;

  const channels = await db
    .select()
    .from(alertChannels)
    .where(
      and(eq(alertChannels.orgId, payload.orgId), eq(alertChannels.enabled, true))
    );

  const subject =
    payload.status === "down"
      ? `🔴 DOWN: ${monitor.name} is unreachable`
      : `✅ UP: ${monitor.name} is back online`;

  const html =
    payload.status === "down"
      ? `
        <h2>Monitor Down</h2>
        <p><strong>${monitor.name}</strong> (${monitor.target}) is <strong>DOWN</strong>.</p>
        ${payload.errorMessage ? `<p>Error: ${payload.errorMessage}</p>` : ""}
        <p>View status page: <a href="https://${org.slug}.status.cig.technology">
          ${org.slug}.status.cig.technology</a></p>
      `
      : `
        <h2>Monitor Recovered</h2>
        <p><strong>${monitor.name}</strong> (${monitor.target}) is back <strong>UP</strong>.</p>
        ${payload.responseTimeMs ? `<p>Response time: ${payload.responseTimeMs}ms</p>` : ""}
      `;

  await Promise.allSettled(
    channels.map(async (ch) => {
      const cfg = ch.config as Record<string, string>;
      try {
        if (ch.type === "email" && cfg.to) {
          await sendMail({ to: cfg.to, subject, html });
        } else if ((ch.type === "slack" || ch.type === "webhook") && cfg.url) {
          await fetch(cfg.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: subject,
              monitor: monitor.name,
              target: monitor.target,
              status: payload.status,
              org: org.name,
              ...(payload.errorMessage && { error: payload.errorMessage }),
            }),
          });
        }
      } catch (err) {
        console.error(`Alert dispatch failed for channel ${ch.id}:`, err);
      }
    })
  );
}
