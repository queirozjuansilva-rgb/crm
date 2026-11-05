"use client";

import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { Spinner } from "@crm/ui/components/spinner";
import { StatusIndicator } from "@crm/ui/components/status-indicator";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export function WhatsAppAlerts() {
	const trpc = useTRPC();
	const status = useQuery(trpc.notifications.status.queryOptions());
	const enabled = status.data?.whatsapp ?? false;

	const test = useMutation(
		trpc.notifications.testWhatsApp.mutationOptions({
			onSuccess: (result) =>
				result.sent
					? toast.success("Mensagem de teste enviada. Confira o WhatsApp.")
					: toast.error("Os alertas ainda não estão configurados."),
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Alertas no WhatsApp</CardTitle>
				<CardDescription>
					Uma mensagem no seu WhatsApp sempre que um lead chega pelo formulário.
				</CardDescription>
				<CardAction>
					<span className="text-xs">
						<StatusIndicator
							tone={enabled ? "success" : "neutral"}
							label={enabled ? "Ativo" : "Desligado"}
						/>
					</span>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-wrap items-center gap-3">
				{enabled ? (
					<Button
						variant="outline"
						size="sm"
						disabled={test.isPending}
						onClick={() => test.mutate()}
					>
						{test.isPending ? <Spinner /> : null}
						Enviar mensagem de teste
					</Button>
				) : (
					<p className="text-muted-foreground text-sm">
						Para ligar, defina WHATSAPP_ALERT_PHONE e CALLMEBOT_API_KEY no
						projeto da API na Vercel e faça um novo deploy.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
