import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import type { Auth } from "./auth";
import { AUTH } from "./auth.constants";
import { IS_PUBLIC } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		@Inject(AUTH) private readonly auth: Auth,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext) {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		const req = context.switchToHttp().getRequest<Request>();
		const session = await this.auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});
		if (!session) {
			throw new UnauthorizedException();
		}
		req.user = session.user;
		return true;
	}
}
