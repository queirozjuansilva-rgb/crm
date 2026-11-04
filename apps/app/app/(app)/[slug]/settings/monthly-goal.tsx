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
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

function centsToDraft(cents: number | null): string {
	if (cents === null) return "";
	return (cents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function draftToCents(draft: string): number | null | undefined {
	const clean = draft.trim();
	if (clean === "") return null;
	const normalized = clean
		.replace(/[^\d,.-]/g, "")
		.replace(/\./g, "")
		.replace(",", ".");
	const value = Number.parseFloat(normalized);
	if (!Number.isFinite(value) || value < 0) return undefined;
	return Math.round(value * 100);
}

export function MonthlyGoal() {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const queryClient = useQueryClient();
	const goalId = useId();
	const [draft, setDraft] = useState("");

	const goal = useQuery(trpc.settings.monthlyGoal.queryOptions());

	useEffect(() => {
		if (goal.data) setDraft(centsToDraft(goal.data.cents));
	}, [goal.data]);

	const save = useMutation(
		trpc.settings.setMonthlyGoal.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					cache.settings(),
					queryClient.invalidateQueries({
						queryKey: trpc.dashboard.summary.queryKey(),
					}),
				]);
				toast.success("Meta mensal salva.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (!goal.data) return null;

	const cents = draftToCents(draft);
	const unchanged = cents === goal.data.cents;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Meta do time</CardTitle>
				<CardDescription>
					Quanto o time quer ganhar por mês. Aparece na Visão geral.
				</CardDescription>

				<CardAction>
					<Button
						type="submit"
						form="monthly-goal"
						disabled={save.isPending || unchanged || cents === undefined}
					>
						{save.isPending ? <Spinner data-icon="inline-start" /> : null}
						Salvar
					</Button>
				</CardAction>
			</CardHeader>

			<CardContent>
				<form
					id="monthly-goal"
					onSubmit={(event) => {
						event.preventDefault();
						if (cents === undefined) {
							toast.error("Informe um valor em reais.");
							return;
						}
						save.mutate({ cents });
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={goalId}>Meta mensal de receita</FieldLabel>
							<Input
								id={goalId}
								inputMode="decimal"
								placeholder="62.000"
								value={draft}
								disabled={save.isPending}
								onChange={(event) => setDraft(event.target.value)}
							/>
							<FieldDescription>
								Na moeda dos relatórios. Deixe vazio para não usar meta.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
