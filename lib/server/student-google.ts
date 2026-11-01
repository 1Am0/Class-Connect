import { createRemoteJWKSet, jwtVerify } from "jose";
import { schoolIdentityFromClaims } from "@/lib/student-checkin";
import { STUDENT_EMAIL_DOMAIN } from "@/lib/school-student-id";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export function studentGoogleConfig() {
  const clientId = process.env.GOOGLE_STUDENT_CLIENT_ID?.trim();
  const domain = process.env.GOOGLE_STUDENT_DOMAIN?.trim().toLowerCase();
  const hostedDomain =
    process.env.GOOGLE_STUDENT_HOSTED_DOMAIN?.trim().toLowerCase() || domain;
  if (
    !clientId ||
    domain !== STUDENT_EMAIL_DOMAIN ||
    !hostedDomain ||
    !/^[a-z0-9.-]+$/.test(hostedDomain)
  )
    return null;
  return { clientId, domain, hostedDomain };
}

export async function verifyStudentGoogleCredential(credential: string) {
  const config = studentGoogleConfig();
  if (!config) return null;
  const { payload } = await jwtVerify(credential, googleKeys, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: config.clientId,
    algorithms: ["RS256"],
  });
  return schoolIdentityFromClaims(
    payload,
    config.clientId,
    config.domain,
    config.hostedDomain,
  );
}
