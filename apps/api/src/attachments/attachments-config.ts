const SECOND_S = 1;
const MINUTE_S = 60 * SECOND_S;

export const ATTACHMENT_STORAGE = {
	defaultBucket: "attachments",
	downloadUrlTtlS: 60 * MINUTE_S,
	requestTimeoutMs: 10_000,
	listLimit: 200,
} as const;
