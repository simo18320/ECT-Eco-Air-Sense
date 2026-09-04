"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/current-user";
import { aircareLogin, aircareGetRegistry } from "@/lib/aircare/client";

export type AircareDeviceOption = {
  /** Raw AirCare device code, e.g. "Cabin_1" (underscores, matches the API). */
  device: string;
  resources: string[];
  assignedTo: {
    pointId: string;
    pointName: string;
    yachtId: string;
    yachtName: string;
  } | null;
};

/**
 * Lists every sensor registered on the (single, shared) AirCare account,
 * plus which monitoring point/yacht each one is already wired to — so an
 * admin can see, when setting up a new yacht, which sensors are free to
 * assign and which already belong to another boat.
 */
export async function getAircareDeviceOptions(): Promise<AircareDeviceOption[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (user.role !== "admin" && user.role !== "technical") {
    throw new Error("You do not have permission to view AirCare sensors.");
  }

  const token = await aircareLogin();
  const { groups } = await aircareGetRegistry(token);

  const deviceMap = new Map<string, Set<string>>();
  for (const group of groups ?? []) {
    for (const device of group.devices ?? []) {
      const resources = deviceMap.get(device.name) ?? new Set<string>();
      for (const r of device.resources ?? []) resources.add(r.name);
      deviceMap.set(device.name, resources);
    }
  }

  const supabase = await createClient();
  const { data: points } = await supabase
    .from("monitoring_points")
    .select("id, code, name, yacht_id, yachts!inner(name, company_id)")
    .eq("yachts.company_id", user.companyId)
    .not("code", "is", null);

  const codeToAssignment = new Map<string, AircareDeviceOption["assignedTo"]>();
  for (const p of points ?? []) {
    if (!p.code) continue;
    const yacht = Array.isArray(p.yachts) ? p.yachts[0] : p.yachts;
    // Stored codes use spaces ("Cabin 1"); AirCare device names use underscores.
    codeToAssignment.set(p.code.replace(/ /g, "_"), {
      pointId: p.id,
      pointName: p.name,
      yachtId: p.yacht_id,
      yachtName: yacht?.name ?? "Unknown yacht",
    });
  }

  return [...deviceMap.entries()]
    .map(([device, resources]) => ({
      device,
      resources: [...resources],
      assignedTo: codeToAssignment.get(device) ?? null,
    }))
    .sort((a, b) => a.device.localeCompare(b.device));
}
