import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────────

export const checkTypeEnum = pgEnum("check_type", [
  "http",
  "tcp",
  "dns",
  "ssl",
  "ping",
  "heartbeat",
]);

export const checkStatusEnum = pgEnum("check_status", [
  "up",
  "down",
  "degraded",
  "unknown",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

export const orgPlanEnum = pgEnum("org_plan", ["free", "starter", "pro"]);

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

// ── Organizations (tenants) ───────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  plan: orgPlanEnum("plan").notNull().default("free"),
  // Whitelabel: custom domain like status.hashpass.tech (null = use slug.status.cig.technology)
  customDomain: varchar("custom_domain", { length: 255 }),
  // Public status page enabled
  statusPageEnabled: boolean("status_page_enabled").notNull().default(true),
  statusPageTitle: varchar("status_page_title", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 512 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  // isSuperAdmin: CIG staff who can see all tenants
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Org memberships ───────────────────────────────────────────────────────────

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgUserIdx: index("org_members_org_user_idx").on(t.orgId, t.userId),
  })
);

// ── Monitors ──────────────────────────────────────────────────────────────────

export const monitors = pgTable(
  "monitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: checkTypeEnum("type").notNull().default("http"),
    // HTTP: full URL. TCP: host:port. DNS: hostname. Heartbeat: generated slug.
    target: varchar("target", { length: 2048 }).notNull(),
    intervalSeconds: integer("interval_seconds").notNull().default(60),
    timeoutSeconds: integer("timeout_seconds").notNull().default(10),
    enabled: boolean("enabled").notNull().default(true),
    // For HTTP: expected status code
    expectedStatus: integer("expected_status").default(200),
    // Flexible config (HTTP headers, DNS record type, etc.)
    config: jsonb("config").default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("monitors_org_idx").on(t.orgId),
  })
);

// ── Check results ─────────────────────────────────────────────────────────────

export const checkResults = pgTable(
  "check_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    status: checkStatusEnum("status").notNull(),
    responseTimeMs: integer("response_time_ms"),
    statusCode: integer("status_code"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (t) => ({
    monitorCheckedIdx: index("check_results_monitor_checked_idx").on(
      t.monitorId,
      t.checkedAt
    ),
  })
);

// ── Incidents ─────────────────────────────────────────────────────────────────

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    monitorId: uuid("monitor_id").references(() => monitors.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 512 }).notNull(),
    status: incidentStatusEnum("status").notNull().default("investigating"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("incidents_org_idx").on(t.orgId),
  })
);

export const incidentUpdates = pgTable("incident_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  status: incidentStatusEnum("status").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Alert channels ────────────────────────────────────────────────────────────

export const alertChannels = pgTable("alert_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  // type: email | slack | webhook | pagerduty
  type: varchar("type", { length: 64 }).notNull(),
  config: jsonb("config").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Deployment markers ────────────────────────────────────────────────────────

export const deployments = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 255 }).notNull(),
    environment: varchar("environment", { length: 64 }).notNull().default("production"),
    deployedAt: timestamp("deployed_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("deployments_org_idx").on(t.orgId),
  })
);

// ── API keys (per org, for CI/CD integration) ─────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  // Stored as bcrypt hash — only shown to user once at creation
  keyHash: varchar("key_hash", { length: 512 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const orgRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  monitors: many(monitors),
  incidents: many(incidents),
  alertChannels: many(alertChannels),
  deployments: many(deployments),
  apiKeys: many(apiKeys),
}));

export const monitorRelations = relations(monitors, ({ one, many }) => ({
  org: one(organizations, { fields: [monitors.orgId], references: [organizations.id] }),
  results: many(checkResults),
}));
