export const FINANCE = {
	currency: "BRL",
	maxRepeatMonths: 24,
	maxRangeDays: 400,
	listLimit: 1000,
	summaryMonths: { min: 1, max: 12, default: 6 },
	recurring: {
		aheadMonths: 12,
		dueDay: { min: 1, max: 31, default: 10 },
		maxPayouts: 10,
		categories: {
			contract: "Contratos",
			payout: "Repasses",
			fixed: "Contas fixas",
		},
	},
} as const;
