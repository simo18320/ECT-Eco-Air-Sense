"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
};

export type RequestPasswordResetState = {
  error: string | null;
  sent: boolean;
  email: string | null;
};

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/overview");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || email } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/overview");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "");
  if (!email) {
    return { error: "Email is required.", sent: false, email: null };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { error: error.message, sent: false, email: null };
  }
  return { error: null, sent: true, email };
}

export type ConfirmPasswordResetState = {
  error: string | null;
};

export async function confirmPasswordReset(
  _prevState: ConfirmPasswordResetState,
  formData: FormData,
): Promise<ConfirmPasswordResetState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !token) {
    return { error: "Email and reset code are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (verifyError) {
    return { error: verifyError.message };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: updateError.message };
  }

  redirect("/overview");
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/overview");
}
