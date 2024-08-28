import type { Context, Env } from 'hono';
import { setCookie } from 'hono/cookie';
import { html } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import { decode, sign, verify } from 'hono/jwt'

export function randomString(length: number = 0) {
    // a-z: 97-122
    // A-Z: 65-90
    // 0-9: 48-57
    return Array.from({ length: length }, () => {
        const r = Math.floor(Math.random() * 62);
        if (r < 26) return String.fromCharCode(r + 97);
        if (r < 52) return String.fromCharCode(r + 39);
        return String.fromCharCode(r - 4);
    }).join('');
}

interface HeaderToolOptions {
    filter: (key: string, value: string) => boolean;
    exclude: string[];
}

const defaultHeaderToolOptions: HeaderToolOptions = {
    filter: () => true,
    exclude: [],
}

export class HeaderTool {
    opts: HeaderToolOptions;

    constructor(opts: Partial<HeaderToolOptions> = {}) {
        this.opts = Object.assign({}, defaultHeaderToolOptions, opts);
    }

    toJSON(headers: Headers) {
        let extract_head_list = ['Host']

        const keys: string[] = [];
        for (let key of extract_head_list) {
            if (headers.has(key)) keys.push(key);
        }
        headers.forEach((_, key) => {
            if (keys.includes(key)) return;
            keys.push(key);
        });
        const r: Record<string, string | string[]> = {};
        for (let key of keys) {
            let fmt_key = key.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('-');
            let h: string | string[]
            if (fmt_key === 'Set-Cookie') {
                h = headers.getAll(fmt_key).filter((s) =>
                    !this.opts.exclude.includes(fmt_key) && this.opts.filter(fmt_key, s)
                );
            } else {
                h = headers.get(fmt_key)!;
            }

            let need_skip = false;
            if (Array.isArray(h)) {
                need_skip = h.length <= 0
            } else {
                need_skip = this.opts.exclude.includes(fmt_key) || !this.opts.filter(fmt_key, h);
            }

            if (need_skip) continue;

            r[fmt_key] = h
        }
        return r;
    }

}

type SpanType = 'method' | 'path' | 'query' | 'http' | 'version' | 'header' | 'value' | 'body';

const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    ' ': '&nbsp;',
};

function escapeHtml(value: string) {
    return value.replace(/[&<>"'/ ]/g, (s) => escapeMap[s]);
}

function wrapSpan(value: string, type: SpanType) {
    if (!value) return '';
    return html`<span data-${type}>${value}</span>` as string;
}

interface CodeOptions {
    method: string;
    path: string;
    query?: string;
    http_version: string;
    headers: Record<string, string | string[]>;
    body?: string;
}

export function wrapCodeHtml(options: CodeOptions) {
    let lines: string[] = []
    lines.push([
        wrapSpan(options.method, 'method'),
        wrapSpan(options.path, 'path') + wrapSpan(options.query || '', 'query'),
        wrapSpan('HTTP', 'http') + '/' + wrapSpan(options.http_version, 'version'),
    ].join(' '));
    for (let key in options.headers) {
        let header_values = options.headers[key];
        if (!Array.isArray(header_values)) header_values = [header_values];
        for (let val of header_values) {
            lines.push([
                wrapSpan(key, 'header'),
                ': ',
                wrapSpan(val, 'value'),
            ].join(''));
        }
    }
    const crlf = html`<span class="icon-crlf" data-non-literal></span>` + '\r\n';
    const crlf_start = html`<span class="icon-crlf" data-non-literal></span>` + '\r\n';
    let final = lines.join(crlf) + crlf;
    final += crlf_start;
    final += options.body ? wrapSpan(options.body, 'body') : '';
    return final;
}

interface JwtPayload extends Record<string, any> {
    level: number;
}

export function jwt_sign(payload: Partial<JwtPayload>, secret: string = process.env['JWT_SECRET']!) {
    return sign(payload, secret);
}

export function jwt_verify(token: string, secret: string = process.env['JWT_SECRET']!): Promise<Partial<JwtPayload>> {
    try {
        return verify(token, secret).catch(() => ({}));
    } catch (e) {
        return Promise.resolve({});
    }
}

export async function setLevel<E extends Env = any>(c: Context<E>, level: number) {
    const token = await jwt_sign({ level: level });
    setCookie(c, 'token', token, { maxAge: 1 * 24 * 60 * 60 });
}

export function isContentType(headers: Headers, ...t: string[]): boolean {
    if (!headers.has("Content-Type")) return false
    let contentTypes = headers.get("Content-Type")?.split(",") || []
    return contentTypes.some(ct => t.includes(ct.split(";")[0].trim()))
}

export function parseBodyParams<E extends Env = {}>(c: Context<E>): Promise<Record<string, any>> {
    if (!c.req.raw.headers.has("Content-Type")) return Promise.resolve({})
    if (isContentType(c.req.raw.headers, 'application/json')) {
        return c.req.json();
    } else if (isContentType(c.req.raw.headers, 'multipart/form-data', 'application/x-www-form-urlencoded')) {
        return c.req.parseBody();
    } else {
        throw new HTTPException(415, { message: "Unsupported Content-Type" })
        // return Promise.resolve({})
    }
}

export type UserAgentData = {
    name: string
    version: string
    comment: string
}

export function parseUA(ua: string, toLower = false) {
    const ua_str = toLower ? ua.toLowerCase() : ua
    const res = new Array<UserAgentData>()
    const regex = /^\s*([^\/\s]+)\/([^\/\s]+)(\s+[^\/]+)?/
    let next_ua_str = ua_str
    let r = regex.exec(ua_str)
    while (r !== null) {
        let [match, product_name, _, product_version, comment] = r
        comment = comment?.replace(/\S+$/, '').trim() || ''
        res.push({ name: product_name, version: product_version, comment })
        match = match.replace(/[^\/\s]+$/, '')
        next_ua_str = next_ua_str.slice(match.length)
        r = regex.exec(next_ua_str)
    }
    return res
}

export function containsUA(ua: string, target: string) {
    return parseUA(ua).some((ua) => ua.name === target)
}
