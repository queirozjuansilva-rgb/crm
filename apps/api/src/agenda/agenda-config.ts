const DAY_MS = 24 * 60 * 60 * 1000;

export const AGENDA = {
	maxRangeMs: 45 * DAY_MS,
	maxItems: 500,
	attendeesShown: 6,
} as const;
