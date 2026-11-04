"use client";

import { useQueryState } from "nuqs";
import { PageShellDescription, PageShellTitle } from "@/components/page-shell";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { overviewParsers } from "./overview-search-params";

export function OverviewGreetingFallback() {
	return (
		<>
			<PageShellTitle>Bem-vindo de volta</PageShellTitle>
			<PageShellDescription>
				O que você fechou, o que ainda está em jogo e o que precisa de você
				hoje.
			</PageShellDescription>
		</>
	);
}

export function OverviewGreeting() {
	const [scope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	return (
		<>
			<PageShellTitle>Bem-vindo de volta</PageShellTitle>
			<PageShellDescription>
				{scope === "me"
					? "O que você fechou, o que ainda está em jogo e o que precisa de você hoje."
					: "O que o time fechou, o que ainda está em jogo e o que precisa de você hoje."}
			</PageShellDescription>
		</>
	);
}
