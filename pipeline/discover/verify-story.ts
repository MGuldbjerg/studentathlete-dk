/**
 * LLM-based story-verification (disambiguation) layer.
 * Determines whether a news item is about a specific named college athlete,
 * solving name-doppelgänger false positives.
 */

import { ProviderChain } from "../lib/llm/provider-chain";
import { createD1Client } from "../lib/d1-client";

export interface VerifyCandidate {
  headline: string;
  summary?: string | null;
}

export interface VerifyAthlete {
  name: string;
  sport?: string;
  university?: string;
  hometown?: string;
  position?: string;
}

export interface VerifyResult {
  isAboutAthlete: boolean;
  confidence: number;
  reason: string;
}

/** Minimal interface — accepts ProviderChain or a stub for testing. */
interface ChainLike {
  generate(opts: {
    system: string;
    prompt: string;
    max_tokens: number;
  }): Promise<{ text: string }>;
}

const SYSTEM_MESSAGE =
  "You are a sports-news disambiguation checker. " +
  "Your sole task is to decide whether a given news item is about a specific named college athlete. " +
  "You will be given the athlete's known attributes (sport, school, hometown, position) and a news item " +
  "(headline + optional summary). Respond with ONLY a JSON object — no prose, no explanation outside the JSON. " +
  'The JSON must have exactly these fields: "match" (boolean), "confidence" (number between 0 and 1), ' +
  '"reason" (short string, max 20 words explaining the decision).';

/**
 * Strips markdown code fences and extracts the first JSON object found in a string.
 * Returns the raw JSON string, or null if nothing was found.
 */
function extractJsonString(text: string): string | null {
  // Remove ```json ... ``` or ``` ... ``` fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Try to find the first {...} block
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/** Clamps a number to [0, 1]. */
function clamp01(v: unknown): number {
  if (typeof v !== "number" || isNaN(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

/**
 * Decide whether a candidate news item is about the specified athlete.
 *
 * @param candidate - The news item to check (headline + optional summary).
 * @param athlete   - Known attributes of the athlete to match against.
 * @param chain     - Optional provider chain; created from env vars if omitted.
 * @returns A VerifyResult. Fails open (isAboutAthlete: true, confidence: 0.5)
 *          when the LLM is unavailable or returns unparseable output.
 */
export async function verifyStory(
  candidate: VerifyCandidate,
  athlete: VerifyAthlete,
  chain?: ChainLike,
): Promise<VerifyResult> {
  const resolvedChain: ChainLike =
    chain ?? new ProviderChain(createD1Client());

  // Build athlete context — only include fields that are populated
  const athleteLines: string[] = [`Name: ${athlete.name}`];
  if (athlete.sport)      athleteLines.push(`Sport: ${athlete.sport}`);
  if (athlete.university) athleteLines.push(`University: ${athlete.university}`);
  if (athlete.hometown)   athleteLines.push(`Hometown: ${athlete.hometown}`);
  if (athlete.position)   athleteLines.push(`Position: ${athlete.position}`);

  const candidateLines: string[] = [`Headline: ${candidate.headline}`];
  if (candidate.summary)  candidateLines.push(`Summary: ${candidate.summary}`);

  const prompt = [
    "Athlete to match:",
    ...athleteLines,
    "",
    "News item:",
    ...candidateLines,
    "",
    'Respond with ONLY a JSON object: {"match": boolean, "confidence": number, "reason": string}',
  ].join("\n");

  try {
    const response = await resolvedChain.generate({
      system: SYSTEM_MESSAGE,
      prompt,
      max_tokens: 200,
    });

    const jsonString = extractJsonString(response.text);
    if (!jsonString) {
      throw new Error(`No JSON object found in LLM response: ${response.text.slice(0, 100)}`);
    }

    const parsed = JSON.parse(jsonString) as Record<string, unknown>;

    const isAboutAthlete =
      typeof parsed.match === "boolean" ? parsed.match : Boolean(parsed.match);
    const confidence = clamp01(parsed.confidence);
    const reason =
      typeof parsed.reason === "string" && parsed.reason.length > 0
        ? parsed.reason
        : "no reason provided";

    return { isAboutAthlete, confidence, reason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isAboutAthlete: true,
      confidence: 0.5,
      reason: `verification unavailable: ${msg}`,
    };
  }
}
