const HOUR_MS = 60 * 60 * 1000;

export const REPORTS = {
	periods: [3, 6, 12] as const,
	dayMs: 24 * HOUR_MS,
	followUpsShown: 6,
	maxDeals: 5000,
} as const;
