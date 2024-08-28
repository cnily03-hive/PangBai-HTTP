import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import { jwt_sign, jwt_verify } from '@/utils';
import type { Context } from 'hono';

type HonoHandler = (c: Context<EnvHono, string>, next: () => Promise<void>) => Promise<Response> | Response;

export function atLevel(lv: number, h: HonoHandler) {
    return createMiddleware(async (c, next) => {
        const token = getCookie(c, 'token');
        if (!token) return next();
        let payload = await jwt_verify(token);
        if (typeof payload.level === 'number' && payload.level == lv) return h(c, next);
        return next();
    })
}

export function noLevel(h: HonoHandler) {
    return createMiddleware(async (c, next) => {
        const token = getCookie(c, 'token');
        if (!token) return h(c, next);
        let payload = await jwt_verify(token);
        if (typeof payload.level !== 'number') return h(c, next);
        return next();
    })
}