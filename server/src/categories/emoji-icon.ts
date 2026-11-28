import { z } from "zod";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
// Keycaps (1️⃣) and flags (🇧🇷) carry no Extended_Pictographic code point.
const EMOJI_CODE_POINT = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/** One emoji as the user's device draws it, skin tones and ZWJ sequences included. */
export function isSingleEmoji(value: string) {
	const graphemes = [...segmenter.segment(value)];
	return graphemes.length === 1 && EMOJI_CODE_POINT.test(value);
}

/** Category and Goal icons are a single emoji. */
export const emojiIcon = z.string().max(40).refine(isSingleEmoji, { message: "Pick one emoji" });
