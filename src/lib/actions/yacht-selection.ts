"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "selected_yacht_id";

export async function setSelectedYacht(yachtId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, yachtId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
