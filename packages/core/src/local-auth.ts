import { SignJWT } from "jose";
import { loadUserConfig } from "./user-config";

const LOCAL_CLIENT_EMAIL = "local-client@tinyclaw.internal";
const LOCAL_TOKEN_TTL = "7d";

export async function loadLocalAuthToken(
  email = LOCAL_CLIENT_EMAIL,
): Promise<string | null> {
  const config = await loadUserConfig();
  const jwtSecret = config?.jwtSecret?.trim();

  if (!jwtSecret) {
    return null;
  }

  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(LOCAL_TOKEN_TTL)
    .sign(new TextEncoder().encode(jwtSecret));
}
