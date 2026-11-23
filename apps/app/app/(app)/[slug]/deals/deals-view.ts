import { parseAsString, parseAsStringLiteral } from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";

export const DEALS_VIEWS = ["board", "list"] as const;

export type DealsView = (typeof DEALS_VIEWS)[number];

export const dealsViewParser = {
	[SEARCH_PARAM.deals.view]:
		parseAsStringLiteral(DEALS_VIEWS).withDefault("board"),
};

export const LUGH_PIPELINE = "lugh";

export const dealsPipelineParser = {
	[SEARCH_PARAM.deals.pipeline]: parseAsString.withDefault(LUGH_PIPELINE),
};
