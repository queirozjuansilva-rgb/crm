import { z } from "zod";

export const notificationsStatusOutput = z.object({
	whatsapp: z.boolean(),
});

export const notificationsTestOutput = z.object({
	sent: z.boolean(),
});
