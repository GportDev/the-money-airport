import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
	const req = context.switchToHttp().getRequest<Request>();
	return req.user;
});
