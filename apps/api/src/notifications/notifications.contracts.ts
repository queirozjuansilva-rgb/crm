import { z } from "zod";

export const notificationsTestOutput = z.object({
	queued: z.boolean(),
});
