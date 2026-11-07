import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@crm/ui/globals.css";
import { Toaster } from "@crm/ui/components/sonner";
import { TooltipProvider } from "@crm/ui/components/tooltip";
import { cn } from "@crm/ui/lib/utils";
import type { Metadata, Viewport } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LocalDateTimeHydrator } from "@/components/local-date-time";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/lib/trpc/client";

export const metadata: Metadata = {
	title: {
		default: "Lugh CRM",
		template: "%s · Lugh CRM",
	},
	description: "CRM da Lugh, empresa de crescimento estratégico",
	icons: {
		icon: [
			{ url: "/lugh-icon.svg?v=3", type: "image/svg+xml" },
			{ url: "/lugh-icon-96.png?v=3", type: "image/png", sizes: "96x96" },
			{ url: "/favicon.ico?v=3", sizes: "any" },
		],
		apple: "/lugh-apple-icon.png?v=3",
		shortcut: "/favicon.ico?v=3",
	},
	manifest: "/site.webmanifest",
	appleWebApp: {
		capable: true,
		title: "Lugh CRM",
		statusBarStyle: "black-translucent",
	},
};

export const viewport: Viewport = {
	themeColor: "#100e18",
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={cn("h-full antialiased")}
		>
			<body className="flex min-h-full flex-col font-sans">
				<NuqsAdapter>
					<TRPCReactProvider>
						<ThemeProvider>
							<TooltipProvider>{children}</TooltipProvider>
							<Toaster richColors />
						</ThemeProvider>
					</TRPCReactProvider>
				</NuqsAdapter>
				<LocalDateTimeHydrator />
			</body>
		</html>
	);
}
