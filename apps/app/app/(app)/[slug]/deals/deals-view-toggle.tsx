"use client";

import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useQueryStates } from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { DEALS_VIEWS, type DealsView, dealsViewParser } from "./deals-view";

const LABELS: Record<DealsView, string> = {
	board: "Kanban",
	list: "Lista",
};

function isView(value: string): value is DealsView {
	return (DEALS_VIEWS as readonly string[]).includes(value);
}

export function DealsViewToggleFallback() {
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			disabled
			aria-label="Como mostrar os negócios"
		>
			{DEALS_VIEWS.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{LABELS[value]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function DealsViewToggle() {
	const [state, setState] = useQueryStates(dealsViewParser);
	const view = state[SEARCH_PARAM.deals.view];

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={view}
			onValueChange={(next) => {
				if (isView(next)) void setState({ [SEARCH_PARAM.deals.view]: next });
			}}
			aria-label="Como mostrar os negócios"
		>
			{DEALS_VIEWS.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{LABELS[value]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function DealsViewSwitch({
	board,
	list,
}: {
	board: React.ReactNode;
	list: React.ReactNode;
}) {
	const [state] = useQueryStates(dealsViewParser);
	return state[SEARCH_PARAM.deals.view] === "board" ? board : list;
}
