"use client";

import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useQuery } from "@tanstack/react-query";
import {
	parseAsInteger,
	parseAsNativeArrayOf,
	parseAsString,
	useQueryStates,
} from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useTRPC } from "@/lib/trpc/client";
import { useIsSdr } from "@/lib/use-access";
import { LUGH_PIPELINE } from "./deals-pipeline-key";
import { dealsPipelineParser } from "./deals-view";

const pipelineSwitchParsers = {
	...dealsPipelineParser,
	[SEARCH_PARAM.list.page]: parseAsInteger,
	owner: parseAsNativeArrayOf(parseAsString),
};

export function useDealsPipeline(): string {
	const [state] = useQueryStates(dealsPipelineParser);
	return state[SEARCH_PARAM.deals.pipeline];
}

export function DealsPipelineSwitch() {
	const trpc = useTRPC();
	const sdr = useIsSdr();
	const users = useQuery(trpc.users.list.queryOptions());
	const [state, setState] = useQueryStates(pipelineSwitchParsers);
	const pipeline = state[SEARCH_PARAM.deals.pipeline];

	const sdrs = (users.data ?? []).filter((user) => user.sdr);

	const choose = (next: string) =>
		setState({
			[SEARCH_PARAM.deals.pipeline]: next,
			[SEARCH_PARAM.list.page]: null,
			owner: null,
		});

	if (sdr || sdrs.length === 0) return null;

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={pipeline}
			onValueChange={(next) => {
				if (next) void choose(next);
			}}
			aria-label="Qual pipeline mostrar"
		>
			<ToggleGroupItem value={LUGH_PIPELINE}>Lugh</ToggleGroupItem>
			{sdrs.map((user) => (
				<ToggleGroupItem key={user.id} value={user.id}>
					{user.name.split(" ")[0]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
