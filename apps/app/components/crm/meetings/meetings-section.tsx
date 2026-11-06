"use client";

import Add from "@carbon/icons-react/es/Add";
import Launch from "@carbon/icons-react/es/Launch";
import VideoChat from "@carbon/icons-react/es/VideoChat";
import { Button } from "@crm/ui/components/button";
import { DatePicker } from "@crm/ui/components/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@crm/ui/components/field";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Spinner } from "@crm/ui/components/spinner";
import { Switch } from "@crm/ui/components/switch";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { DetailSheetSection } from "@/components/detail-sheet";
import { LocalDateTime } from "@/components/local-date-time";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Meeting = RouterOutputs["meetings"]["forDeal"]["meetings"][number];
type Kind = "SCREENING" | "PROPOSAL";

const KINDS: Record<
	Kind,
	{ label: string; title: (company: string) => string }
> = {
	SCREENING: { label: "Triagem", title: (company) => `Triagem — ${company}` },
	PROPOSAL: {
		label: "Reunião de Proposta",
		title: (company) => `Reunião de Proposta — ${company}`,
	},
};

const DURATIONS = [15, 30, 45, 60, 90] as const;
const DEFAULT_DURATION = "30";
const DEFAULT_TIME = "10:00";
const FALLBACK_TIME_ZONE = "America/Fortaleza";

const WHEN = {
	weekday: "short",
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
} as const;

function isKind(value: string): value is Kind {
	return value === "SCREENING" || value === "PROPOSAL";
}

function tomorrow(): string {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function browserTimeZone(): string {
	try {
		return (
			Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE
		);
	} catch {
		return FALLBACK_TIME_ZONE;
	}
}

function defaultKind(stage: string): Kind {
	return ["SCREENING_DONE", "PROPOSAL_MEETING", "NEGOTIATION"].includes(stage)
		? "PROPOSAL"
		: "SCREENING";
}

export function MeetingsSection({
	dealId,
	companyName,
	stage,
}: {
	dealId: string;
	companyName: string;
	stage: string;
}) {
	const trpc = useTRPC();
	const params = useParams<{ slug: string }>();
	const [open, setOpen] = useState(false);
	const meetings = useQuery(trpc.meetings.forDeal.queryOptions({ dealId }));

	const rows = meetings.data?.meetings ?? [];
	const canSchedule = meetings.data?.canSchedule ?? false;
	const now = Date.now();
	const upcoming = rows.filter((row) => new Date(row.endsAt).getTime() > now);
	const past = rows.filter((row) => new Date(row.endsAt).getTime() <= now);

	return (
		<DetailSheetSection
			title={rows.length > 0 ? `Reuniões · ${rows.length}` : "Reuniões"}
			action={
				canSchedule ? (
					<Button variant="outline" size="xs" onClick={() => setOpen(true)}>
						<Add />
						Agendar
					</Button>
				) : null
			}
		>
			{meetings.isPending ? (
				<Spinner />
			) : !canSchedule ? (
				<p className="text-muted-foreground text-sm">
					Para agendar triagens e reuniões daqui,{" "}
					<Link
						href={`/${params.slug}/settings/connections/google`}
						className="text-foreground underline underline-offset-4"
					>
						conecte o Google Agenda
					</Link>
					.
				</p>
			) : rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nenhuma reunião ainda. Agende a triagem e o negócio vai para Triagem
					Marcada.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{upcoming.map((meeting) => (
						<MeetingRow key={meeting.id} meeting={meeting} />
					))}
					{past.map((meeting) => (
						<MeetingRow key={meeting.id} meeting={meeting} past />
					))}
				</ul>
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					{open ? (
						<ScheduleForm
							dealId={dealId}
							companyName={companyName}
							initialKind={defaultKind(stage)}
							suggestedGuest={meetings.data?.suggestedGuest ?? ""}
							onDone={() => setOpen(false)}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</DetailSheetSection>
	);
}

function MeetingRow({
	meeting,
	past = false,
}: {
	meeting: Meeting;
	past?: boolean;
}) {
	return (
		<li
			data-past={past ? "" : undefined}
			className="flex items-center gap-3 rounded-lg border bg-card p-2.5 data-past:opacity-60"
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
				<VideoChat className="size-4" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate font-medium text-[13px]">
					{meeting.title ?? "Reunião"}
				</span>
				<span className="truncate text-muted-foreground text-xs">
					<LocalDateTime date={meeting.startsAt} options={WHEN} />
					{meeting.kind ? ` · ${KINDS[meeting.kind].label}` : ""}
					{past ? " · realizada" : ""}
				</span>
			</span>
			{meeting.conferenceUrl && !past ? (
				<Button variant="outline" size="xs" asChild>
					<a
						href={meeting.conferenceUrl}
						target="_blank"
						rel="noreferrer noopener"
					>
						<Launch />
						Meet
					</a>
				</Button>
			) : null}
		</li>
	);
}

function ScheduleForm({
	dealId,
	companyName,
	initialKind,
	suggestedGuest,
	onDone,
}: {
	dealId: string;
	companyName: string;
	initialKind: Kind;
	suggestedGuest: string;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const queryClient = useQueryClient();
	const titleId = useId();
	const dateId = useId();
	const timeId = useId();
	const guestId = useId();
	const notesId = useId();
	const meetId = useId();

	const [kind, setKind] = useState<Kind>(initialKind);
	const [title, setTitle] = useState(KINDS[initialKind].title(companyName));
	const [date, setDate] = useState(tomorrow());
	const [time, setTime] = useState(DEFAULT_TIME);
	const [duration, setDuration] = useState(DEFAULT_DURATION);
	const [guest, setGuest] = useState(suggestedGuest);
	const [notes, setNotes] = useState("");
	const [withMeet, setWithMeet] = useState(true);

	const schedule = useMutation(
		trpc.meetings.schedule.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.meetings.forDeal.queryKey({ dealId }),
					}),
					cache.deal(dealId),
					cache.activity(),
				]);
				toast.success(
					result.stageChanged
						? "Reunião agendada no Google Agenda. A etapa do negócio mudou."
						: "Reunião agendada no Google Agenda.",
				);
				onDone();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const changeKind = (next: Kind) => {
		if (title === KINDS[kind].title(companyName)) {
			setTitle(KINDS[next].title(companyName));
		}
		setKind(next);
	};

	const startsAt = date && time ? new Date(`${date}T${time}`) : null;
	const valid =
		title.trim() !== "" &&
		startsAt !== null &&
		!Number.isNaN(startsAt.getTime());

	return (
		<>
			<DialogHeader>
				<DialogTitle>Agendar reunião</DialogTitle>
				<DialogDescription>
					O evento entra no seu Google Agenda. Triagem move o negócio para
					Triagem Marcada, e proposta para Reunião de Proposta.
				</DialogDescription>
			</DialogHeader>

			<form
				id="meeting-form"
				className="px-4"
				onSubmit={(event) => {
					event.preventDefault();
					if (!valid || !startsAt) return;
					schedule.mutate({
						dealId,
						kind,
						title: title.trim(),
						startsAt: startsAt.toISOString(),
						durationMinutes: Number(duration),
						timeZone: browserTimeZone(),
						guestEmail: guest.trim(),
						withMeet,
						notes: notes.trim() || undefined,
					});
				}}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="meeting-kind">Tipo</FieldLabel>
						<Select
							value={kind}
							onValueChange={(next) => {
								if (isKind(next)) changeKind(next);
							}}
						>
							<SelectTrigger id="meeting-kind">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="SCREENING">Triagem</SelectItem>
								<SelectItem value="PROPOSAL">Reunião de Proposta</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={titleId}>Título</FieldLabel>
						<Input
							id={titleId}
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							autoComplete="off"
							required
						/>
					</Field>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<Field>
							<FieldLabel htmlFor={dateId}>Dia</FieldLabel>
							<DatePicker id={dateId} value={date} onChange={setDate} />
						</Field>
						<Field>
							<FieldLabel htmlFor={timeId}>Hora</FieldLabel>
							<Input
								id={timeId}
								type="time"
								value={time}
								onChange={(event) => setTime(event.target.value)}
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="meeting-duration">Duração</FieldLabel>
							<Select value={duration} onValueChange={setDuration}>
								<SelectTrigger id="meeting-duration">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DURATIONS.map((minutes) => (
										<SelectItem key={minutes} value={String(minutes)}>
											{minutes} min
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor={guestId}>E-mail do convidado</FieldLabel>
						<Input
							id={guestId}
							type="email"
							value={guest}
							onChange={(event) => setGuest(event.target.value)}
							placeholder="opcional"
							autoComplete="off"
						/>
						<FieldDescription>
							Com e-mail, o Google manda o convite para o cliente.
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={notesId}>Pauta</FieldLabel>
						<Textarea
							id={notesId}
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="opcional"
							rows={3}
						/>
					</Field>
					<Field orientation="horizontal">
						<Switch
							id={meetId}
							checked={withMeet}
							onCheckedChange={setWithMeet}
						/>
						<FieldLabel htmlFor={meetId}>Criar link do Google Meet</FieldLabel>
					</Field>
				</FieldGroup>
			</form>

			<DialogFooter>
				<Button
					type="submit"
					form="meeting-form"
					disabled={schedule.isPending || !valid}
				>
					{schedule.isPending ? <Spinner /> : null}
					Agendar
				</Button>
				<Button variant="outline" onClick={onDone}>
					Cancelar
				</Button>
			</DialogFooter>
		</>
	);
}
