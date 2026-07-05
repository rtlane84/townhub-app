import type { Page } from "@playwright/test";
import { hydrateAuthedPage, pageApiJson } from "./page-api";
import { ApplicantPendingApplicationError } from "./auth";

export type BusinessApplication = {
  id: number;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userId: string;
  businessId: number | null;
};

export type SubmitApplicationInput = {
  name: string;
  type?: string;
  description?: string;
};

function requireApplicationName(input: { name?: string; businessName?: string }): string {
  const name = input.name?.trim() || input.businessName?.trim();
  if (!name) {
    throw new Error("Application name is required (provide input.name).");
  }
  return name;
}

export async function listAdminApplications(page: Page): Promise<BusinessApplication[]> {
  const { ok, status, data } = await pageApiJson<BusinessApplication[]>(page, "/api/admin/applications");
  if (!ok) {
    throw new Error(`Failed to list applications: ${status}`);
  }
  return data;
}

export async function findPendingApplicationByName(
  page: Page,
  businessName: string,
): Promise<BusinessApplication | undefined> {
  const apps = await listAdminApplications(page);
  return apps.find((app) => app.name === businessName && app.status === "PENDING");
}

export async function findApprovedApplicationByName(
  page: Page,
  businessName: string,
): Promise<BusinessApplication | undefined> {
  const apps = await listAdminApplications(page);
  return apps.find(
    (app) => app.name === businessName && app.status === "APPROVED" && app.businessId != null,
  );
}

export async function rejectAllPendingApplications(page: Page): Promise<void> {
  let apps: BusinessApplication[];
  try {
    apps = await listAdminApplications(page);
  } catch {
    // Best-effort cleanup only; rate limits should not block the test run.
    return;
  }

  for (const app of apps.filter((entry) => entry.status === "PENDING")) {
    const { ok, status } = await pageApiJson(page, `/api/admin/applications/${app.id}/reject`, {
      method: "POST",
      body: { note: "E2E test cleanup" },
    });
    if (!ok && status !== 429 && status !== 409) {
      throw new Error(`Failed to reject application ${app.id}: ${status}`);
    }
  }
}

export async function approveApplicationViaApi(
  page: Page,
  applicationId: number,
): Promise<void> {
  const { ok, status } = await pageApiJson(page, `/api/admin/applications/${applicationId}/approve`, {
    method: "POST",
    body: {},
  });
  if (!ok) {
    throw new Error(`Failed to approve application ${applicationId}: ${status}`);
  }
}

export async function submitApplicationViaApi(
  page: Page,
  input: SubmitApplicationInput,
): Promise<BusinessApplication> {
  const name = requireApplicationName(input);
  await hydrateAuthedPage(page, "/list-your-business");

  const { ok, status, data } = await pageApiJson<BusinessApplication>(page, "/api/businesses/apply", {
    method: "POST",
    body: {
      name,
      type: input.type ?? "RESTAURANT",
      description: input.description ?? "E2E workflow application",
    },
  });
  if (!ok) {
    if (status === 409) {
      throw new ApplicantPendingApplicationError();
    }
    throw new Error(`Failed to submit application: ${status} ${JSON.stringify(data)}`);
  }
  return data;
}
