import type { FieldEntity } from "./fields-entity";

export const STANDARD_FIELDS = {
	COMPANY: [
		"Nome",
		"Domínio",
		"Site",
		"Telefone",
		"E-mail",
		"Cidade",
		"País",
		"Responsável",
	],
	CONTACT: [
		"Nome",
		"Sobrenome",
		"Cargo",
		"E-mail",
		"Telefone",
		"LinkedIn",
		"GitHub",
		"Cliente",
		"Responsável",
	],
	DEAL: [
		"Nome",
		"Valor",
		"Moeda",
		"Data de fechamento",
		"Cliente",
		"Responsável",
		"Etapa",
	],
} satisfies Record<FieldEntity, readonly string[]>;
