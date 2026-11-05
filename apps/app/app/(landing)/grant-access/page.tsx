import { type MailboxProviderId, mailboxGrantsNeeded } from "@crm/auth/scopes";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireSession, signInAccounts } from "@/lib/session";
import { GrantAccess } from "./grant-access";

export const metadata: Metadata = {
	title: "Conceder acesso",
};

export const instant = false;

const DESCRIPTION = {
	google:
		"This CRM reads your Gmail and Calendar so meetings and email threads show up on the right company. It is read-only — nothing is ever sent on your behalf.",
	microsoft:
		"Este CRM lê seu Outlook para mostrar as conversas no cliente certo. É só leitura: nada é enviado em seu nome.",
} satisfies Record<MailboxProviderId, string>;

const BOTH =
	"This CRM reads your mail and calendar so meetings and email threads show up on the right company. It is read-only — nothing is ever sent on your behalf.";

export default async function GrantAccessPage() {
	const { user } = await requireSession();

	const providers = mailboxGrantsNeeded(await signInAccounts(user.id));

	if (providers.length === 0) {
		redirect("/");
	}

	const only = providers.length === 1 ? providers[0] : undefined;

	return (
		<AuthShell>
			<AuthHeading
				title="Mais um passo"
				description={(only ? DESCRIPTION[only] : undefined) ?? BOTH}
			/>

			<GrantAccess providers={providers} />

			<p className="text-center text-muted-foreground text-sm/5">
				Só ficam salvas as conversas com clientes do CRM. E-mails pessoais são
				descartados sem salvar.
			</p>
		</AuthShell>
	);
}
