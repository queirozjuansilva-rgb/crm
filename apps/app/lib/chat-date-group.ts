const DAY_MS = 86_400_000;

export type ChatDateGroup = "Hoje" | "Ontem" | "Últimos 7 dias";

export function chatDateGroup(
	lastMessageAt: string,
	now: number,
): ChatDateGroup | null {
	if (!now) return null;

	const daysAgo =
		Math.floor(now / DAY_MS) -
		Math.floor(new Date(lastMessageAt).getTime() / DAY_MS);
	if (daysAgo <= 0) return "Hoje";
	if (daysAgo === 1) return "Ontem";
	if (daysAgo <= 7) return "Últimos 7 dias";
	return null;
}
