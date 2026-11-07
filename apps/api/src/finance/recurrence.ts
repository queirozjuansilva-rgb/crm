const DAY_MS = 24 * 60 * 60 * 1000;

export function periodOf(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function periodStart(period: string): Date {
	const [year, month] = period.split("-").map(Number);
	return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
}

export function nextPeriod(period: string, offset = 1): string {
	const start = periodStart(period);
	return periodOf(
		new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)),
	);
}

export function periodEnd(period: string): Date {
	return periodStart(nextPeriod(period));
}

export function dueDateIn(period: string, dueDay: number): Date {
	const start = periodStart(period);
	const last = new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
	).getUTCDate();
	return new Date(
		Date.UTC(
			start.getUTCFullYear(),
			start.getUTCMonth(),
			Math.min(Math.max(dueDay, 1), last),
			12,
		),
	);
}

export function periodsBetween(from: Date, to: Date): string[] {
	const periods: string[] = [];
	let current = periodOf(from);
	const last = periodOf(new Date(to.getTime() - DAY_MS));
	while (current <= last) {
		periods.push(current);
		current = nextPeriod(current);
	}
	return periods;
}

export function activeIn(
	period: string,
	range: { startsOn: Date; endsOn: Date | null },
): boolean {
	return (
		range.startsOn < periodEnd(period) &&
		(range.endsOn === null || range.endsOn >= periodStart(period))
	);
}
