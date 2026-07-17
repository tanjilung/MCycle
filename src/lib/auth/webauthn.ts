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

function parseCredentialIdCandidates(raw: string): Buffer[] {
  const values = new Map<string, Buffer>();

  const push = (buffer: Buffer) => {
    if (buffer.length === 0) {
      return;
    }
    values.set(buffer.toString("hex"), buffer);
  };

  if (!raw) {
    return [];
  }

  push(Buffer.from(raw));
  push(Buffer.from(raw, "base64url"));

  try {
    push(Buffer.from(raw, "base64"));
  } catch {
    // Ignore invalid base64 input.
  }

  return [...values.values()];
}

function findMatchingAuthenticator<T extends { credentialId: Uint8Array }>(
  credentials: T[],
  rawAssertionId: string,
  candidates: Buffer[],
): T | undefined {
  return credentials.find((cred) => {
    const storedBytes = Buffer.from(cred.credentialId);
    const storedUtf8 = storedBytes.toString("utf8");

    if (storedUtf8 === rawAssertionId) {
      return true;
    }

    if (storedBytes.toString("base64url") === rawAssertionId) {
      return true;
    }

    return candidates.some((candidate) => {
      if (storedBytes.equals(candidate)) {
        return true;
      }

      if (!storedUtf8) {
        return false;
      }

      const repaired = Buffer.from(storedUtf8, "base64url");
      return repaired.equals(candidate);
    });
  });
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
    authenticationResponse && typeof authenticationResponse === "object"
      ? (("rawId" in authenticationResponse
          ? (authenticationResponse as { rawId?: string }).rawId
          : undefined) ??
        ("id" in authenticationResponse
          ? (authenticationResponse as { id?: string }).id
          : "") ??
        "")
      : "";

  const candidates = parseCredentialIdCandidates(rawId);
  const canonicalCredentialId = candidates.find((value) => value.length > 0) ?? Buffer.alloc(0);

  const userCredentials = await prisma.passkeyCredential.findMany({
    where: { userId },
  });

  const authenticator = findMatchingAuthenticator(userCredentials, rawId, candidates);

  if (!authenticator) {
    const globalCredentials = await prisma.passkeyCredential.findMany();
    const credentialFromOtherAccount = findMatchingAuthenticator(globalCredentials, rawId, candidates);
    if (credentialFromOtherAccount) {
      throw new Error("Passkey belongs to a different account email");
    }
  }

  if (!authenticator) {
    throw new Error("Unknown passkey credential");
  }

  // Repair credential IDs saved with older encodings so future lookups are consistent.
  if (
    canonicalCredentialId.length > 0
    && !Buffer.from(authenticator.credentialId).equals(canonicalCredentialId)
  ) {
    await prisma.passkeyCredential.update({
      where: { id: authenticator.id },
      data: { credentialId: canonicalCredentialId },
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
