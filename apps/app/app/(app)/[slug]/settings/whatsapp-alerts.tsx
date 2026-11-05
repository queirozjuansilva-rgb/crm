"use client";

import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export function WhatsAppAlerts() {
	const trpc = useTRPC();

	const test = useMutation(
		trpc.notifications.testWhatsApp.mutationOptions({
			onSuccess: (result) =>
				result.queued
					? toast.success(
							"Teste na fila. A mensagem chega no WhatsApp em até um minuto.",
						)
					: toast.info("Já existe um teste na fila. Aguarde um minuto."),
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
			</CardHeader>
			<CardContent className="flex flex-col items-start gap-3">
				<p className="text-muted-foreground text-sm">
					Para ligar, defina WHATSAPP_ALERT_PHONE, CALLMEBOT_API_KEY e APP_URL
					no projeto do agente na Vercel e faça um novo deploy. Sem essas
					variáveis, o agente ignora o alerta.
				</p>
				<Button
					variant="outline"
					size="sm"
					disabled={test.isPending}
					onClick={() => test.mutate()}
				>
					{test.isPending ? <Spinner /> : null}
					Enviar mensagem de teste
				</Button>
			</CardContent>
		</Card>
	);
}
