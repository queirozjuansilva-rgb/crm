"use client";

import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";

const LAYOUTS = ["cards", "list"] as const;

type CompaniesLayout = (typeof LAYOUTS)[number];

const LABELS: Record<CompaniesLayout, string> = {
	cards: "Cards",
	list: "Lista",
};

const layoutParser = {
	[SEARCH_PARAM.companies.layout]:
		parseAsStringLiteral(LAYOUTS).withDefault("cards"),
};

function isLayout(value: string): value is CompaniesLayout {
	return (LAYOUTS as readonly string[]).includes(value);
}

function LayoutToggle({
	value,
	onChange,
	disabled = false,
}: {
	value?: CompaniesLayout;
	onChange?: (next: CompaniesLayout) => void;
	disabled?: boolean;
}) {
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={value}
			disabled={disabled}
			onValueChange={(next) => {
				if (isLayout(next)) onChange?.(next);
			}}
			aria-label="Como mostrar os clientes"
		>
			{LAYOUTS.map((layout) => (
				<ToggleGroupItem key={layout} value={layout}>
					{LABELS[layout]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function CompaniesLayoutToggleFallback() {
	return <LayoutToggle disabled />;
}

export function CompaniesLayoutToggle() {
	const [state, setState] = useQueryStates(layoutParser);
	return (
		<LayoutToggle
			value={state[SEARCH_PARAM.companies.layout]}
			onChange={(next) =>
				void setState({ [SEARCH_PARAM.companies.layout]: next })
			}
		/>
	);
}

export function CompaniesLayoutSwitch({
	cards,
	list,
}: {
	cards: React.ReactNode;
	list: React.ReactNode;
}) {
	const [state] = useQueryStates(layoutParser);
	return state[SEARCH_PARAM.companies.layout] === "cards" ? cards : list;
}
