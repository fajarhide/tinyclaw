import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseIni, readTextOrNull, writePrivateTextFile } from "./fs";

export const DEFAULT_WHATSAPP_PROFILE_ID = "profile_default";

export interface WhatsAppConfigFile {
  phoneNumber: string;
  profileId: string;
  pairingCode: string | null;
  pairedJid: string | null;
}

export interface WhatsAppSettingsPublic {
  configured: boolean;
  phoneNumberMasked: string | null;
  pairingCode: string | null;
  pairedJid: string | null;
  profileId: string;
}

export interface UpdateWhatsAppSettingsInput {
  phoneNumber?: string;
  profileId?: string;
}

export function getWhatsAppConfigDir(): string {
  return join(homedir(), ".tinyclaw", "whatsapp");
}

export function getWhatsAppConfigPath(): string {
  return join(getWhatsAppConfigDir(), "config.ini");
}

export function maskPhoneNumber(phoneNumber: string): string | null {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 4) {
    return `+${"•".repeat(trimmed.length)}`;
  }

  return `+${"•".repeat(Math.min(trimmed.length - 2, 10))}${trimmed.slice(-2)}`;
}

export function generatePairingCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function normalizePairingCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function isWhatsAppUserAuthorized(
  jid: string,
  config: Pick<WhatsAppConfigFile, "pairedJid">,
): boolean {
  if (!config.pairedJid) {
    return false;
  }

  return config.pairedJid === jid;
}

export async function loadWhatsAppConfigFile(): Promise<WhatsAppConfigFile | null> {
  const raw = await readTextOrNull(getWhatsAppConfigPath());

  if (raw === null) {
    return null;
  }

  const values = parseIni(raw);
  const phoneNumber = values.phone_number?.trim() ?? "";
  const profileId = values.profile_id?.trim() || DEFAULT_WHATSAPP_PROFILE_ID;
  const pairingCode = values.pairing_code?.trim() || null;
  const pairedJid = values.paired_jid?.trim() || null;

  if (!phoneNumber) {
    return null;
  }

  return {
    phoneNumber,
    profileId,
    pairingCode,
    pairedJid,
  };
}

export function toWhatsAppSettingsPublic(
  file: WhatsAppConfigFile | null,
): WhatsAppSettingsPublic {
  if (!file) {
    return {
      configured: false,
      phoneNumberMasked: null,
      pairingCode: null,
      pairedJid: null,
      profileId: DEFAULT_WHATSAPP_PROFILE_ID,
    };
  }

  return {
    configured: Boolean(file.phoneNumber.trim()),
    phoneNumberMasked: maskPhoneNumber(file.phoneNumber),
    pairingCode: file.pairingCode,
    pairedJid: file.pairedJid,
    profileId: file.profileId,
  };
}

export async function loadWhatsAppSettingsPublic(): Promise<WhatsAppSettingsPublic> {
  return toWhatsAppSettingsPublic(await loadWhatsAppConfigFile());
}

async function writeWhatsAppConfigFile(config: WhatsAppConfigFile): Promise<void> {
  const lines = [
    "# TinyClaw WhatsApp bridge",
    `phone_number=${config.phoneNumber}`,
    `profile_id=${config.profileId}`,
    ...(config.pairingCode ? [`pairing_code=${config.pairingCode}`] : []),
    ...(config.pairedJid ? [`paired_jid=${config.pairedJid}`] : []),
    "",
  ];

  await writePrivateTextFile(getWhatsAppConfigPath(), lines.join("\n"), {
    ensureDir: getWhatsAppConfigDir(),
  });
}

function resolvePhoneNumber(
  input: UpdateWhatsAppSettingsInput,
  existing: WhatsAppConfigFile | null,
): string {
  return input.phoneNumber !== undefined
    ? input.phoneNumber.trim()
    : (existing?.phoneNumber ?? "");
}

function resolveProfileId(
  input: UpdateWhatsAppSettingsInput,
  existing: WhatsAppConfigFile | null,
): string {
  return input.profileId?.trim() || existing?.profileId || DEFAULT_WHATSAPP_PROFILE_ID;
}

function resolvePairingCode(
  existing: WhatsAppConfigFile | null,
  pairedJid: string | null,
): string | null {
  if (pairedJid || existing?.pairingCode) {
    return existing?.pairingCode ?? null;
  }

  return generatePairingCode();
}

function buildSavedWhatsAppConfig(
  input: UpdateWhatsAppSettingsInput,
  existing: WhatsAppConfigFile | null,
): WhatsAppConfigFile {
  const phoneNumber = resolvePhoneNumber(input, existing);

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  const pairedJid = existing?.pairedJid ?? null;

  return {
    phoneNumber,
    profileId: resolveProfileId(input, existing),
    pairingCode: resolvePairingCode(existing, pairedJid),
    pairedJid,
  };
}

export async function saveWhatsAppConfig(
  input: UpdateWhatsAppSettingsInput,
): Promise<WhatsAppSettingsPublic> {
  const existing = await loadWhatsAppConfigFile();
  const next = buildSavedWhatsAppConfig(input, existing);
  await writeWhatsAppConfigFile(next);
  return toWhatsAppSettingsPublic(next);
}

export async function regenerateWhatsAppPairingCode(): Promise<WhatsAppSettingsPublic> {
  const existing = await loadWhatsAppConfigFile();

  if (!existing?.phoneNumber.trim()) {
    throw new Error("Save a phone number before generating a pairing code.");
  }

  const next: WhatsAppConfigFile = {
    ...existing,
    pairingCode: generatePairingCode(),
  };

  await writeWhatsAppConfigFile(next);
  return toWhatsAppSettingsPublic(next);
}

export function resolveWhatsAppConfigFromSources(options: {
  env?: Record<string, string | undefined>;
  file?: WhatsAppConfigFile | null;
}): WhatsAppConfigFile | null {
  const env = options.env ?? process.env;
  const file = options.file ?? null;
  const phoneNumber = env.WHATSAPP_PHONE_NUMBER?.trim() || file?.phoneNumber?.trim() || "";

  if (!phoneNumber) {
    return null;
  }

  return {
    phoneNumber,
    profileId:
      env.TINYCLAW_WHATSAPP_PROFILE_ID?.trim() ||
      file?.profileId?.trim() ||
      DEFAULT_WHATSAPP_PROFILE_ID,
    pairingCode: file?.pairingCode ?? null,
    pairedJid: file?.pairedJid ?? null,
  };
}