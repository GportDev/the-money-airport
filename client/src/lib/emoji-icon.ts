export const DEFAULT_CATEGORY_EMOJI = "🏷️";
export const DEFAULT_GOAL_EMOJI = "💰";

// Categories and Goals saved before the emoji kit hold a lucide icon key. Draw those as the
// nearest emoji until the user picks a new one.
const LEGACY_ICON_EMOJI: Record<string, string> = {
	circle: DEFAULT_CATEGORY_EMOJI,
	"circle-question-mark": "❓",
	house: "🏠",
	zap: "⚡",
	shield: "🛡️",
	"credit-card": "💳",
	"shopping-cart": "🛒",
	car: "🚗",
	bus: "🚌",
	fuel: "⛽",
	plane: "✈️",
	utensils: "🍽️",
	coffee: "☕",
	film: "🎬",
	music: "🎵",
	"shopping-bag": "🛍️",
	shirt: "👕",
	"heart-pulse": "🩺",
	dumbbell: "🏋️",
	repeat: "🔁",
	wifi: "📶",
	smartphone: "📱",
	gift: "🎁",
	"graduation-cap": "🎓",
	baby: "👶",
	"paw-print": "🐾",
	"piggy-bank": "🐷",
	wallet: "👛",
	landmark: "🏛️",
	briefcase: "💼",
	receipt: "🧾",
	"arrow-left-right": "↔️",
};

const isIconKey = (icon: string) => /^[a-z-]+$/.test(icon);

/** The emoji to draw for a stored icon, legacy keys included. */
export function toEmoji(icon: string) {
	if (!isIconKey(icon)) return icon;
	return LEGACY_ICON_EMOJI[icon] ?? DEFAULT_CATEGORY_EMOJI;
}
