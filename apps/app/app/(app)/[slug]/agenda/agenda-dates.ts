export const AGENDA_PERIODS = ["week", "month"] as const;

export type AgendaPeriod = (typeof AGENDA_PERIODS)[number];

const WEEK_STARTS_ON = 0;

export function startOfDay(date: Date): Date {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function startOfWeek(date: Date): Date {
	const day = startOfDay(date);
	return addDays(day, -((day.getDay() - WEEK_STARTS_ON + 7) % 7));
}

export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function dayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDayKey(value: string | null): Date | null {
	if (!value) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const date = new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
	);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function visibleDays(anchor: Date, period: AgendaPeriod): Date[] {
	if (period === "week") {
		const start = startOfWeek(anchor);
		return Array.from({ length: 7 }, (_, index) => addDays(start, index));
	}
	const first = startOfMonth(anchor);
	const start = startOfWeek(first);
	const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
	const span =
		Math.ceil(((last.getTime() - start.getTime()) / 86_400_000 + 1) / 7) * 7;
	return Array.from({ length: span }, (_, index) => addDays(start, index));
}

export function shiftAnchor(
	anchor: Date,
	period: AgendaPeriod,
	direction: 1 | -1,
): Date {
	if (period === "week") return addDays(anchor, 7 * direction);
	return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

const time = new Intl.DateTimeFormat("pt-BR", {
	hour: "2-digit",
	minute: "2-digit",
});
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "short",
});
const monthYear = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});

export function formatTime(date: Date): string {
	return time.format(date);
}

export function formatWeekday(date: Date): string {
	return weekday.format(date).replace(".", "");
}

export function formatPeriodLabel(
	days: Date[],
	period: AgendaPeriod,
	anchor: Date,
): string {
	if (period === "month") return monthYear.format(anchor);
	const first = days[0];
	const last = days[days.length - 1];
	if (!first || !last) return "";
	return `${dayMonth.format(first).replace(".", "")} – ${dayMonth.format(last).replace(".", "")} de ${last.getFullYear()}`;
}
