const SECOND_MS = 1000;

export const NOTIFICATIONS = {
	whatsapp: {
		endpoint: "https://api.callmebot.com/whatsapp.php",
		timeoutMs: 6 * SECOND_MS,
		maxLength: 900,
	},
} as const;
