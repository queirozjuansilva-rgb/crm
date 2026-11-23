"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export const SDR_SECTIONS = ["/deals", "/agenda"];

export function useIsSdr(): boolean {
	const trpc = useTRPC();
	const workspace = useQuery(trpc.workspace.get.queryOptions());
	return workspace.data?.viewerRole === "sdr";
}

export function sectionsFor<T extends { href: string }>(
	items: readonly T[],
	sdr: boolean,
): T[] {
	return sdr
		? items.filter((item) => SDR_SECTIONS.includes(item.href))
		: [...items];
}
