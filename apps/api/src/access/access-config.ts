const SECOND_MS = 1000;

export const ACCESS = {
	roleCacheMs: 30 * SECOND_MS,
	sdr: {
		busyLabel: "Ocupado",
		busyPages: 4,
	},
} as const;
