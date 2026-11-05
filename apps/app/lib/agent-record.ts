export type AgentRecordKind = "contact" | "company" | "deal";

export type AgentRecord = { kind: AgentRecordKind; id: string };

type RecordCopy = {
	header: string;
	field: "contactId" | "companyId" | "dealId";
	title: string;
	blurb: string;
	placeholder: string;
	suggestions: string[];
};

type RecordCopyByKind = Record<AgentRecordKind, RecordCopy>;

export type AgentRecordHeader = Record<string, string>;

export type AgentRecordFilter = {
	contactId?: string;
	companyId?: string;
	dealId?: string;
};

const COPY: RecordCopyByKind = {
	contact: {
		header: "x-crm-contact",
		field: "contactId",
		title: "Pergunte sobre esta pessoa",
		blurb: "Cada passo aparece na hora, inclusive as pistas que ele descarta.",
		placeholder: "Ainda trabalham lá?",
		suggestions: [
			"Quem é esta pessoa?",
			"Ainda trabalha lá?",
			"O que preciso saber antes de uma ligação?",
		],
	},
	company: {
		header: "x-crm-company",
		field: "companyId",
		title: "Pergunte sobre este cliente",
		blurb:
			"Lê o site deles e o nosso histórico com eles, e mostra o raciocínio.",
		placeholder: "O que eles vendem?",
		suggestions: [
			"O que eles fazem?",
			"Quem conhecemos lá?",
			"O que mudou recentemente?",
		],
	},
	deal: {
		header: "x-crm-deal",
		field: "dealId",
		title: "Pergunte sobre este negócio",
		blurb: "Lê os e-mails, as reuniões e as pessoas dos dois lados.",
		placeholder: "Onde isso travou?",
		suggestions: [
			"Em que pé está?",
			"Quem mais deveria participar?",
			"Qual é o risco aqui?",
		],
	},
};

export function recordCopy(kind: AgentRecordKind): RecordCopy {
	return COPY[kind];
}

export function recordHeader(record: AgentRecord): AgentRecordHeader {
	return { [COPY[record.kind].header]: record.id };
}

export function recordFilter(record: AgentRecord): AgentRecordFilter {
	return { [COPY[record.kind].field]: record.id };
}
