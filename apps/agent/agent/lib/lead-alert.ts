import { db, type Prisma } from "@crm/db";
import { parseLeadAlertPayload } from "@crm/validation/lead-alert";
import { LEAD_ALERT } from "./lead-alert-config";

type Target = { phone: string; apiKey: string };

const STAGE_LABELS: Record<string, string> = {
	BUILDING_SNIPER: "Montando Sniper",
	SNIPER_READY: "Sniper Pronta",
	SNIPER_SENT: "Contato Sniper Disparada",
	ENGAGED_CONVERSATION: "Conversa Efetiva",
	SCREENING_BOOKED: "Triagem Marcada",
	SCREENING_DONE: "Triagem Feita",
	PROPOSAL_MEETING: "Reunião de Proposta",
	NEGOTIATION: "Negociação",
	CLOSED_WON: "Venda",
	CLOSED_LOST: "Remarketing/Follow-up",
};

export type LeadAlertResult =
	| { outcome: "sent"; note: string }
	| { outcome: "skipped"; note: string }
	| { outcome: "retry"; note: string };

export function leadAlertTarget(
	env: Record<string, string | undefined> = process.env,
): Target | null {
	const phone = env.WHATSAPP_ALERT_PHONE?.replace(/[^\d+]/g, "");
	const apiKey = env.CALLMEBOT_API_KEY?.trim();
	return phone && apiKey ? { phone, apiKey } : null;
}

export async function leadAlertText(
	dealId: string,
	appUrl: string | undefined = process.env.APP_URL,
): Promise<string | null> {
	const deal = await db.deal.findUnique({
		where: { id: dealId },
		select: {
			name: true,
			stage: true,
			company: {
				select: {
					name: true,
					contacts: {
						orderBy: { createdAt: "desc" },
						take: 1,
						select: { firstName: true, lastName: true, phone: true },
					},
				},
			},
			contacts: {
				take: 1,
				select: {
					contact: { select: { firstName: true, lastName: true, phone: true } },
				},
			},
		},
	});
	if (!deal) return null;
	const person = deal.contacts[0]?.contact ?? deal.company.contacts[0];
	const name = person
		? [person.firstName, person.lastName].filter(Boolean).join(" ")
		: null;
	return [
		"🟣 *Novo lead no Lugh CRM*",
		deal.name,
		`Cliente: ${deal.company.name}`,
		name
			? `Contato: ${name}${person?.phone ? ` · ${person.phone}` : ""}`
			: null,
		`Etapa: ${STAGE_LABELS[deal.stage] ?? deal.stage}`,
		appUrl ? `${appUrl.replace(/\/+$/, "")}/deals` : null,
	]
		.filter((line): line is string => Boolean(line))
		.join("\n");
}

export async function sendWhatsApp(
	target: Target,
	text: string,
	send: typeof fetch = fetch,
): Promise<void> {
	const url = new URL(LEAD_ALERT.endpoint);
	url.searchParams.set("phone", target.phone);
	url.searchParams.set("apikey", target.apiKey);
	url.searchParams.set("text", text.slice(0, LEAD_ALERT.maxLength));
	const response = await send(url, {
		signal: AbortSignal.timeout(LEAD_ALERT.timeoutMs),
	});
	if (!response.ok) {
		throw new Error(`CallMeBot answered HTTP ${response.status}`);
	}
	const body = await response.text();
	const refusal = body.match(LEAD_ALERT.refusal);
	if (refusal) throw new CallMeBotRefusal(stripTags(refusal[0]));
}

export class CallMeBotRefusal extends Error {}

function stripTags(html: string): string {
	return html
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export async function runLeadAlert(
	payload: Prisma.JsonValue,
	options: {
		env?: Record<string, string | undefined>;
		send?: typeof fetch;
	} = {},
): Promise<LeadAlertResult> {
	const env = options.env ?? process.env;
	const target = leadAlertTarget(env);
	if (!target) {
		return {
			outcome: "skipped",
			note: "WhatsApp alerts are off: WHATSAPP_ALERT_PHONE or CALLMEBOT_API_KEY is not set.",
		};
	}

	const task = parseLeadAlertPayload(payload);
	const text =
		task.type === "lead.alert.test"
			? "✅ Alertas de lead do Lugh CRM ativados."
			: await leadAlertText(task.dealId, env.APP_URL);
	if (!text) return { outcome: "skipped", note: "The deal is gone." };

	try {
		await sendWhatsApp(target, text, options.send);
		return { outcome: "sent", note: "WhatsApp alert sent." };
	} catch (error) {
		if (error instanceof CallMeBotRefusal) {
			return {
				outcome: "skipped",
				note: `CallMeBot refused: ${error.message}`,
			};
		}
		return {
			outcome: "retry",
			note: error instanceof Error ? error.message : String(error),
		};
	}
}
