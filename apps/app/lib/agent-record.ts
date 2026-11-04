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
		blurb:
			"Every step is shown as it happens — including the leads it throws away.",
		placeholder: "Ainda trabalham lá?",
		suggestions: [
			"Who is this person?",
			"Are they still there?",
			"What should I know before a call?",
		],
	},
	company: {
		header: "x-crm-company",
		field: "companyId",
		title: "Pergunte sobre esta empresa",
		blurb:
			"It reads their site and our own history with them, and shows its working.",
		placeholder: "O que eles vendem?",
		suggestions: [
			"What do they do?",
			"Who do we know here?",
			"What has changed recently?",
		],
	},
	deal: {
		header: "x-crm-deal",
		field: "dealId",
		title: "Pergunte sobre este negócio",
		blurb:
			"It can read the thread, the meetings and the people on both sides of it.",
		placeholder: "Onde isso travou?",
		suggestions: [
			"Where does this stand?",
			"Who else should be involved?",
			"What is the risk here?",
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
