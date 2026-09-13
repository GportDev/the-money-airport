import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Headers,
	HttpCode,
	Param,
	Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { PlaidService } from "./plaid.service";

const exchangeBody = z.object({
	publicToken: z.string().min(1),
	metadata: z
		.object({
			institution: z
				.object({
					institution_id: z.string().optional(),
					name: z.string().optional(),
				})
				.optional(),
		})
		.optional(),
});

const linkTokenBody = z.object({
	itemId: z.string().uuid().optional(),
});

@Controller("plaid")
export class PlaidController {
	constructor(private readonly plaid: PlaidService) {}

	@Post("create-link-token")
	@HttpCode(200)
	async createLinkToken(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = linkTokenBody.safeParse(body ?? {});
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.plaid.createLinkToken(user.id, parsed.data.itemId) };
	}

	@Post("exchange-token")
	@HttpCode(200)
	async exchange(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = exchangeBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return {
			data: await this.plaid.exchange(
				user.id,
				parsed.data.publicToken,
				parsed.data.metadata?.institution?.name,
			),
		};
	}

	@Post("sync-all")
	@HttpCode(200)
	async syncAll(@CurrentUser() user: { id: string }) {
		return { data: await this.plaid.syncAll(user.id) };
	}

	@Post("sync/:itemId")
	@HttpCode(200)
	async syncItem(@CurrentUser() user: { id: string }, @Param("itemId") itemId: string) {
		return { data: await this.plaid.syncItem(user.id, itemId) };
	}

	@Delete("items/:itemId")
	@HttpCode(200)
	async disconnect(@CurrentUser() user: { id: string }, @Param("itemId") itemId: string) {
		return { data: await this.plaid.disconnect(user.id, itemId) };
	}

	@Post("items/:itemId/reconnect")
	@HttpCode(200)
	async reconnect(@CurrentUser() user: { id: string }, @Param("itemId") itemId: string) {
		return { data: await this.plaid.reconnect(user.id, itemId) };
	}

	@Public()
	@Post("webhook")
	@HttpCode(200)
	async webhook(
		@Headers("plaid-verification") verification: string | undefined,
		@Body() body: { item_id?: string },
	) {
		return this.plaid.handleWebhook(verification, body);
	}
}
