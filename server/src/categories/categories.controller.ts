import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { CategoriesService } from "./categories.service";

const kind = z.enum(["income", "expense"]);
const budgetGroup = z.enum(["fixed", "flexible", "non_monthly"]).nullable();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const icon = z.string().min(1).max(40);

const createBody = z.object({
	name: z.string().trim().min(1).max(60),
	color: color.default("#6B7280"),
	icon: icon.default("circle"),
	kind: kind.default("expense"),
	budgetGroup: budgetGroup.optional(),
});

const updateBody = z.object({
	name: z.string().trim().min(1).max(60).optional(),
	color: color.optional(),
	icon: icon.optional(),
	kind: kind.optional(),
	budgetGroup: budgetGroup.optional(),
});

@Controller("categories")
export class CategoriesController {
	constructor(private readonly categories: CategoriesService) {}

	@Get()
	async list(@CurrentUser() user: { id: string }) {
		return { data: await this.categories.list(user.id) };
	}

	@Post()
	async create(@CurrentUser() user: { id: string }, @Body() body: unknown) {
		const parsed = createBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.categories.create(user.id, parsed.data) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: { id: string },
		@Param("id", ParseUUIDPipe) id: string,
		@Body() body: unknown,
	) {
		const parsed = updateBody.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}
		return { data: await this.categories.update(user.id, id, parsed.data) };
	}

	@Delete(":id")
	async remove(@CurrentUser() user: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
		return { data: await this.categories.remove(user.id, id) };
	}
}
