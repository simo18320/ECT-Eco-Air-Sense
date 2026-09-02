import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";
import path from "node:path";

/**
 * fits-ws.aircare.it serves its leaf certificate without the intermediate
 * ("Sectigo Public Server Authentication CA OV R36") — a server-side
 * misconfiguration, confirmed via `openssl s_client -showcerts` and reported
 * to AirCare. Rather than disabling verification, we supply the missing
 * intermediate alongside Node's normal trusted roots so the chain still
 * verifies for real (openssl verify: OK once the intermediate is present).
 */
const sectigoIntermediate = fs.readFileSync(
  path.join(process.cwd(), "src/lib/aircare/sectigo-intermediate.pem"),
  "utf-8",
);
const trustedCa = [...tls.rootCertificates, sectigoIntermediate];

function request<T>(
  method: "GET" | "POST",
  urlPath: string,
  options: { headers?: Record<string, string> } = {},
): Promise<{ status: number; body: T }> {
  const base = (process.env.AIRCARE_WS_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("AIRCARE_WS_BASE_URL is not configured.");

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${base}${urlPath}`,
      { method, ca: trustedCa, headers: options.headers },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: raw ? JSON.parse(raw) : (null as T) });
          } catch {
            reject(new Error(`AirCare API returned non-JSON response: ${raw.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export type AircareAuth = { token: string; token_type: string; expires_in: number };

export async function aircareLogin(): Promise<string> {
  const username = process.env.AIRCARE_WS_USERNAME;
  const password = process.env.AIRCARE_WS_PASSWORD;
  if (!username || !password) {
    throw new Error("AIRCARE_WS_USERNAME / AIRCARE_WS_PASSWORD are not configured.");
  }

  const query = `email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const { status, body } = await request<{ success: boolean; auth: AircareAuth; message?: string }>(
    "POST",
    `/auth/login?${query}`,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  if (status !== 200 || !body?.auth?.token) {
    throw new Error(`AirCare login failed (${status}): ${body?.message ?? "unknown error"}`);
  }
  return body.auth.token;
}

export type AircareResource = { name: string };
export type AircareDevice = { name: string; resources: AircareResource[] };
export type AircareGroup = { name: string; devices: AircareDevice[] };

export async function aircareGetRegistry(
  token: string,
): Promise<{ groups: AircareGroup[] }> {
  const { status, body } = await request<{ success: boolean; data: { groups: AircareGroup[] } }>(
    "GET",
    "/registry",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (status !== 200) throw new Error(`AirCare registry request failed (${status}).`);
  return body.data;
}

export type AircareReading = {
  device: string;
  resource: string;
  severity: string;
  output: string;
  checktime: number;
  value: number | null;
  um: string;
};

export async function aircareGetLastData(token: string): Promise<AircareReading[]> {
  const { status, body } = await request<{ success: boolean; data: AircareReading[] }>(
    "GET",
    "/last-data",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (status !== 200) throw new Error(`AirCare last-data request failed (${status}).`);
  return body.data ?? [];
}
