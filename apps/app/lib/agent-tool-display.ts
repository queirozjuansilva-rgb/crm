import { vendorBySlug } from "@crm/mcp-integrations/catalog";
import type { EveToolInput } from "@crm/validation/eve-tool";
import { z } from "zod";

type ArtifactNames = Record<string, string>;

const ARTIFACT_NAMES: ArtifactNames = {
	"agent/instructions.md": "as instruções",
	"agent/manifest.json": "o manifesto",
	"agent/README.md": "o readme",
};

type LabelInput = {
	tool: string;
	input: EveToolInput;
	label: string;
	pending: boolean;
};

const MCP_TOOL_NAME = /^([a-z][a-z0-9-]{0,63})__[a-z][a-z0-9_-]{0,127}$/i;
const writeAgentFileInput = z.object({ path: z.string().catch("") }).catch({
	path: "",
});
const connectionExecuteInput = z.object({
	connection: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
	tool: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,127}$/),
});

export function toolLabel(item: LabelInput): string {
	const match = MCP_TOOL_NAME.exec(item.tool);
	if (match) {
		const vendor = vendorBySlug(match[1]?.toLowerCase() ?? "");
		if (!vendor) {
			return item.pending
				? "Usando uma ferramenta conectada"
				: "Usou uma ferramenta conectada";
		}

		return item.pending ? `Usando ${vendor.name}` : `Usou ${vendor.name}`;
	}

	if (item.tool === "write_agent_file") {
		const path = writeAgentFileInput.parse(item.input).path;
		const name = ARTIFACT_NAMES[path] ?? "um arquivo";
		return item.pending ? `Escrevendo ${name}` : `Escreveu ${name}`;
	}

	if (item.tool === "connection_execute") {
		const input = connectionExecuteInput.safeParse(item.input);
		const vendor = input.success
			? vendorBySlug(input.data.connection.toLowerCase())
			: null;
		if (!input.success || !vendor) {
			return item.pending
				? "Usando uma ferramenta conectada"
				: "Usou uma ferramenta conectada";
		}

		const action = input.data.tool.replaceAll("_", " ");
		return item.pending
			? `Pedindo ao ${vendor.name}: ${action}`
			: `Pediu ao ${vendor.name}: ${action}`;
	}

	if (item.tool === "save_agent_draft") {
		return item.pending ? "Salvando rascunho" : "Rascunho salvo";
	}

	if (item.tool === "set_chat_title") {
		return item.pending ? "Dando nome ao chat" : "Deu nome ao chat";
	}

	return item.label;
}
