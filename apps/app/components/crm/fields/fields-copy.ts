import type { RecordKind } from "@/components/crm/record-sheet/record-stack";
import type { FieldEntity } from "./fields-entity";

export const SHEET_TITLE = "Campos";

const SUBTITLE = {
	company: "Isto vale para todos os clientes do CRM.",
	contact: "Isto vale para todos os contatos do CRM.",
	deal: "Isto vale para todos os negócios do CRM.",
} satisfies Record<RecordKind, string>;

export function subtitleFor(kind: RecordKind): string {
	return SUBTITLE[kind];
}

export const STANDARD_ROW = "Campos padrão";
export const STANDARD_NOTE = "reorder and hide only";
export const SUGGESTED_ROW = "Campos sugeridos";
export const SUGGESTED_NOTE = "one click to add";
export const ADD = "Adicionar";
export const CUSTOM_GROUP = "Campos personalizados";
export const DRAG_NOTE = "Arraste para ordenar";
export const ARCHIVED_ROW = "Arquivados";
export const ARCHIVED_NOTE = "values kept, hidden everywhere";
export const NEW_FIELD = "Novo campo";
export const ORDER_NOTE = "A ordem aqui é a ordem na ficha";
export const MANUAL_ONLY = "Só manual";
export const TABLE_NOTE = "also a column on the table";
export const FILTER_NOTE = "also a filter";

export const EMPTY_TITLE = "Nenhum campo personalizado ainda";
export const EMPTY_BODY =
	"Crie campos que os agentes podem pesquisar e preencher.";

export const ERROR_TITLE = "Não foi possível carregar seus campos";
export const ERROR_BODY =
	"Seus campos continuam lá. Tente de novo em instantes, antes de criar algo novo.";
export const RETRY = "Tentar de novo";

export const LABEL_LABEL = "Rótulo";
export const KEY_LABEL = "Chave";
export const KEY_HELP =
	"Como a API e os agentes chamam o campo. Vem do rótulo e fica fixo ao salvar; renomear depois não quebra nada.";
export const AGENT_LABEL = "Deixar os agentes preencherem";
export const AGENT_HELP =
	"Eles sugerem um valor com fonte e nunca sobrescrevem o seu.";
export const BRIEF_LABEL = "O que conta como resposta";
export const BRIEF_HELP = "Deixe vazio e os agentes usam só o rótulo e o tipo.";
export const TYPE_LABEL = "Tipo";
export const OPTIONS_LABEL = "Opções";
export const ADD_OPTION = "Adicionar opção";
export const ALL_FILLED = "Nada a preencher";

export function optionLabel(index: number): string {
	return `Option ${index + 1}`;
}
export const ADD_FIELD = "Criar campo";
export const CANCEL = "Cancelar";
export const SAVE = "Salvar alterações";
export const ARCHIVE = "Arquivar";
export const FILL_REST = "Preencher o resto";

const SHEET_PLACEMENT = {
	COMPANY: "Mostrar na ficha do cliente",
	CONTACT: "Mostrar na ficha do contato",
	DEAL: "Mostrar na ficha do negócio",
} satisfies Record<FieldEntity, string>;

const TABLE_PLACEMENT = {
	COMPANY: "Oferecer como coluna na tabela de Clientes",
	CONTACT: "Oferecer como coluna na tabela de Contatos",
	DEAL: "Oferecer como coluna na tabela de Negócios",
} satisfies Record<FieldEntity, string>;

const FILTER_PLACEMENT = {
	COMPANY: "Oferecer como filtro na tabela de Clientes",
	CONTACT: "Oferecer como filtro na tabela de Contatos",
	DEAL: "Oferecer como filtro na tabela de Negócios",
} satisfies Record<FieldEntity, string>;

export function sheetPlacement(entity: FieldEntity): string {
	return SHEET_PLACEMENT[entity];
}

export function tablePlacement(entity: FieldEntity): string {
	return TABLE_PLACEMENT[entity];
}

export function filterPlacement(entity: FieldEntity): string {
	return FILTER_PLACEMENT[entity];
}

export const ENTITY_TABS = [
	{ kind: "company", label: "Clientes" },
	{ kind: "contact", label: "Contatos" },
	{ kind: "deal", label: "Negócios" },
] as const satisfies readonly { kind: RecordKind; label: string }[];
