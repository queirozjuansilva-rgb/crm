import { DEFAULT_WORKSPACE_NAME } from "@crm/auth/organization";
import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireMailboxAccess } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
	title: "Configurar",
};

export const instant = false;

export default async function OnboardingPage() {
	await requireMailboxAccess();

	return (
		<AuthShell>
			<AuthHeading
				title="Conte sobre sua empresa"
				description="Duas coisas, uma vez só. O nome é como o CRM chama você; o site é como o agente aprende o que você vende."
			/>

			<OnboardingForm placeholder={DEFAULT_WORKSPACE_NAME} />
		</AuthShell>
	);
}
