import type { Db } from "@crm/db";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../config/env.validation";
import { InjectDatabase } from "../database/database.constants";
import { NOTIFICATIONS } from "./notifications-config";

type WhatsAppTarget = { phone: string; apiKey: string };

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

@Injectable()
export class LeadAlertService {
	private readonly logger = new Logger(LeadAlertService.name);
	private readonly target: WhatsAppTarget | null;
	private readonly appUrl: string | null;

	constructor(
		@InjectDatabase() private readonly db: Db,
		@Inject(ConfigService)
		config: ConfigService<EnvironmentVariables, true>,
	) {
		const phone = config.get("WHATSAPP_ALERT_PHONE", { infer: true });
		const apiKey = config.get("CALLMEBOT_API_KEY", { infer: true });
		this.target =
			phone && apiKey ? { phone: phone.replace(/[^\d+]/g, ""), apiKey } : null;
		this.appUrl =
			config.get("APP_URL", { infer: true })?.replace(/\/+$/, "") ?? null;
	}

	get enabled(): boolean {
		return this.target !== null;
	}

	async newLead(dealId: string): Promise<void> {
		if (!this.target) return;
		try {
			const deal = await this.db.deal.findUnique({
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
							contact: {
								select: { firstName: true, lastName: true, phone: true },
							},
						},
					},
				},
			});
			if (!deal) return;
			const person = deal.contacts[0]?.contact ?? deal.company.contacts[0];
			const lines = [
				"🟣 *Novo lead no Lugh CRM*",
				deal.name,
				`Cliente: ${deal.company.name}`,
				person
					? `Contato: ${[person.firstName, person.lastName].filter(Boolean).join(" ")}${person.phone ? ` · ${person.phone}` : ""}`
					: null,
				`Etapa: ${STAGE_LABELS[deal.stage] ?? deal.stage}`,
				this.appUrl ? `${this.appUrl}/deals` : null,
			].filter((line): line is string => Boolean(line));
			await this.send(lines.join("\n"));
		} catch (error) {
			this.logger.warn({
				message: "New lead alert failed",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async test(): Promise<boolean> {
		if (!this.target) return false;
		await this.send("✅ Alertas de lead do Lugh CRM ativados.");
		return true;
	}

	private async send(text: string): Promise<void> {
		if (!this.target) return;
		const url = new URL(NOTIFICATIONS.whatsapp.endpoint);
		url.searchParams.set("phone", this.target.phone);
		url.searchParams.set("apikey", this.target.apiKey);
		url.searchParams.set(
			"text",
			text.slice(0, NOTIFICATIONS.whatsapp.maxLength),
		);
		const response = await fetch(url, {
			signal: AbortSignal.timeout(NOTIFICATIONS.whatsapp.timeoutMs),
		});
		if (!response.ok) {
			throw new Error(`WhatsApp alert returned HTTP ${response.status}`);
		}
	}
}
