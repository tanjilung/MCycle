import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import {
  DEFAULT_RP_ID,
  DEFAULT_RP_ORIGIN,
} from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";

type ChallengeRecord = {
  challenge: string;
  userId: string;
  createdAt: number;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const registrationChallenges = new Map<string, ChallengeRecord>();
const authenticationChallenges = new Map<string, ChallengeRecord>();

function now(): number {
  return Date.now();
}

function assertChallenge(record: ChallengeRecord | undefined): ChallengeRecord {
  if (!record || now() - record.createdAt > CHALLENGE_TTL_MS) {
    throw new Error("Challenge expired");
  }
  return record;
}

export async function getRegistrationOptions(userId: string, email: string) {
  const userCredentials = await prisma.passkeyCredential.findMany({
    where: { userId },
    select: { credentialId: true },
  });

  const options = await generateRegistrationOptions({
    rpName: "MCycle",
    rpID: DEFAULT_RP_ID,
    userName: email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: userCredentials.map((cred) => ({
      id: Buffer.from(cred.credentialId).toString("base64url"),
      transports: ["internal"],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  registrationChallenges.set(userId, {
    challenge: options.challenge,
    userId,
    createdAt: now(),
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  registrationResponse: unknown,
): Promise<VerifiedRegistrationResponse> {
  const record = assertChallenge(registrationChallenges.get(userId));

  const verification = await verifyRegistrationResponse({
    response: registrationResponse as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: record.challenge,
    expectedOrigin: DEFAULT_RP_ORIGIN,
    expectedRPID: DEFAULT_RP_ID,
    requireUserVerification: true,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo;
    const credentialId = Buffer.from(credential.id, "base64url");

    await prisma.passkeyCredential.create({
      data: {
        userId,
        credentialId,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: registrationResponse && typeof registrationResponse === "object" && "response" in registrationResponse
          ? ((registrationResponse as { response?: { transports?: string[] } }).response?.transports ?? [])
          : [],
      },
    });
  }

  registrationChallenges.delete(userId);
  return verification;
}

export async function getAuthenticationOptions(userId: string) {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId },
    select: { credentialId: true },
  });

  const options = await generateAuthenticationOptions({
    rpID: DEFAULT_RP_ID,
    allowCredentials: credentials.map((cred) => ({
      id: Buffer.from(cred.credentialId).toString("base64url"),
      transports: ["internal"],
    })),
    userVerification: "preferred",
  });

  authenticationChallenges.set(userId, {
    challenge: options.challenge,
    userId,
    createdAt: now(),
  });

  return options;
}

export async function verifyAuthentication(
  userId: string,
  authenticationResponse: unknown,
): Promise<VerifiedAuthenticationResponse> {
  const record = assertChallenge(authenticationChallenges.get(userId));

  const rawId =
    authenticationResponse && typeof authenticationResponse === "object" && "id" in authenticationResponse
      ? (authenticationResponse as { id: string }).id
      : "";

  const credentialId = rawId ? Buffer.from(rawId, "base64url") : Buffer.alloc(0);
  const legacyCredentialId = rawId ? Buffer.from(rawId) : Buffer.alloc(0);

  const authenticator = await prisma.passkeyCredential.findFirst({
    where: {
      userId,
      OR: [{ credentialId }, { credentialId: legacyCredentialId }],
    },
  });

  if (!authenticator) {
    throw new Error("Unknown passkey credential");
  }

  // Repair credential IDs saved with older UTF-8 encoding so future lookups are consistent.
  if (!Buffer.from(authenticator.credentialId).equals(credentialId)) {
    await prisma.passkeyCredential.update({
      where: { id: authenticator.id },
      data: { credentialId },
    }).catch(() => {
      return;
    });
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse as Parameters<
      typeof verifyAuthenticationResponse
    >[0]["response"],
    expectedChallenge: record.challenge,
    expectedOrigin: DEFAULT_RP_ORIGIN,
    expectedRPID: DEFAULT_RP_ID,
    credential: {
      id: Buffer.from(authenticator.credentialId).toString("base64url"),
      publicKey: new Uint8Array(authenticator.publicKey),
      counter: authenticator.counter,
      transports:
        authenticator.transports && Array.isArray(authenticator.transports)
          ? (authenticator.transports as (
              | "ble"
              | "cable"
              | "hybrid"
              | "internal"
              | "nfc"
              | "smart-card"
              | "usb"
            )[])
          : undefined,
    },
    requireUserVerification: true,
  });

  if (verification.verified) {
    await prisma.passkeyCredential.update({
      where: { id: authenticator.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });
  }

  authenticationChallenges.delete(userId);
  return verification;
}
