const SECOND_MS = 1000;

export const LEAD_ALERT = {
	endpoint: "https://api.callmebot.com/whatsapp.php",
	timeoutMs: 8 * SECOND_MS,
	maxLength: 900,
	refusal: /ERROR[^\n]*/i,
} as const;
