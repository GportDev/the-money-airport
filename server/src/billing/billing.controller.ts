import { Controller, Get, Headers, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
	constructor(@Inject(BillingService) private readonly billing: BillingService) {}

	@Get()
	async get(@CurrentUser() user: { id: string; email?: string; name?: string }) {
		const row = await this.billing.ensure(user.id, user.email, user.name);
		return {
			data: {
				status: row?.status ?? null,
				priceId: row?.stripePriceId ?? null,
				stripeCustomerId: row?.stripeCustomerId ?? null,
			},
		};
	}

	@Public()
	@Post("webhook")
	async webhook(@Req() req: Request, @Headers("stripe-signature") signature: string | undefined) {
		const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
		await this.billing.handleWebhook(raw, signature);
		return { received: true };
	}
}
