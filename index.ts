import { Hono, type Context, type Env } from "hono";
import { Viewer } from "@/mw/render";
import { serveStatic } from "hono/bun";
import { setCookie } from "hono/cookie";
import { atLevel, noLevel } from "@/mw/level";
import { containsUA, HeaderTool, isContentType, randomString, parseBodyParams, setLevel, wrapCodeHtml } from "@/utils";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { HTTPException } from "hono/http-exception";
import { html } from "hono/html";


const JWT_KEY = process.env["JWT_SECRET"] = process.env["JWT_SECRET"] || randomString(16);
const UUID_LV_2 = randomUUID();

const BACK_HTML = html`<a onclick='return window.history.back(),false'>${'返回看看'}</a>`
const RESET_HTML = html`<a href='/reset' target='_self'>${'重新试试'}</a>`

const TITLE = 'PangBai 过家家 (1)';

const app = new Hono<EnvHono>();
const view = new Viewer({
    rootDir: 'views',
    suffix: 'html',
    defaultData: {
        page_title: TITLE,
        initial_text: '',
        language: 'HTTP'
    }
});
const ht = new HeaderTool({
    filter(key: string, value: string) {
        if (/^(Sec|Cache)-/i.test(key)) return false;
        return true;
    },
    exclude: ['Upgrade-Insecure-Requests']
});

const getURLObject = <E extends Env = {}>(c: Context<E>, host = 'localhost') => {
    return new URL(c.req.url, `${c.req.url.startsWith('https://') ? 'https://' : 'http://'}${c.req.header('Host') || host}`);
}

app.use(async (c, next) => {
    c.header('X-Powered-By', 'Hono');
    return next();
})

app.onError(async (err, c) => {
    if (err instanceof HTTPException) {
        return c.html(
            view.render('error', {
                title: err.message,
                description: `出现问题了呢，${BACK_HTML}吧 ~`
            }),
            err.status
        )
    } else {
        console.error(err);
        return c.html(
            view.render('error', {
                title: 'Internal Server Error',
                description: `出现问题了呢 ~`
            }),
            500
        )
    }
})

app.notFound(async (c) => {
    if (c.req.path === '/') {
        // invalid level
        return c.html(
            view.render('error', {
                title: '404 Not Found',
                description: `找不到关卡了呢，${RESET_HTML}吧 ~`
            })
        )
    } else {
        // invalid page
        return c.html(
            view.render('error', {
                title: '404 Not Found',
                description: `当前页面不存在呢，${BACK_HTML}吧 ~`
            })
        )
    }
})

app.all('/start', async (c) => {
    // set cookie (level 1)
    await setLevel(c, 1);
    return c.redirect('/');
})

app.all('/reset', (c) => {
    // clear cookie
    setCookie(c, 'token', 'null', { maxAge: 0 });
    return c.redirect('/');
})

app.all(UUID_LV_2, async (c) => {
    const u = getURLObject(c);
    await setLevel(c, 2);
    return c.redirect('/' + u.search);
})

app.all('/', noLevel((c) => {
    return c.html(
        view.render('start', {
            title: 'PangBai 过家家（1）',
            initial_text: "点击屏幕任意位置开始游戏"
        })
    )
}))

// Level 1
app.all('/', atLevel(1, async (c, next) => {
    if (c.req.method !== 'GET') {
        throw new HTTPException(405, { message: 'Method Not Allowed' });
    }

    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    c.header('Location', `/${UUID_LV_2}${u.search}`);

    return c.html(
        view.render('http', {
            page_title: 'Level 1 初出茅庐' + ` - ${TITLE}`,
            title: 'Level 1: 初出茅庐',
            description: [
                '教育孩子的第一步，就是学会如何倾听他们的声音。'
            ].join('\n'),
            hint: 'PangBai 的头部（Header）里便隐藏着一些秘密，需要你主动去发现。',
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

// Level 2
app.all('/', atLevel(2, async (c, next) => {
    if (c.req.method !== 'GET') {
        throw new HTTPException(405, { message: 'Method Not Allowed' });
    }

    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    if ((c.req.query('ask') || '').trim() !== '') {
        await setLevel(c, 3);
        return c.redirect(u.pathname + u.search);
    }

    return c.html(
        view.render('http', {
            page_title: 'Level 2 云程发轫' + ` - ${TITLE}`,
            title: 'Level 2: 云程发轫',
            description: [
                '有时主动的沟通，胜如缜密的推理。',
                '正确的沟通会使事物朝着顺心的方向发展。'
            ].join('\n'),
            hint: '向 PangBai 询问（Query）一下（<code>ask=miao</code>）吧 ~',
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

// Level 3
app.all('/', atLevel(3, async (c, next) => {
    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    const body_params = await parseBodyParams(c);
    const bypass = {
        ask: (c.req.query('ask') || '').trim() !== '',
        method: c.req.method === 'POST',
        say: (String(body_params['say'] || '')).toLowerCase() === 'hello'
    }

    let hints: string[] = []
    // hints for previous level missing
    if (!bypass.ask) {
        hints = [
            'PangBai 看了你一眼，对你投来鄙夷的眼神。你依稀记得，一位自称「塔塔洛夫」的贤者曾经告诫过你：沟通之前要先询问（Query, or <code>ask</code>）。'
        ];
    }
    // hints for previous correct (current stage)
    if (bypass.ask && !bypass.method) {
        hints = ['用另一种方法（Method）打声招呼（<code>say=hello</code>）吧 ~']
    }
    // hints for incorrect parameter value
    if (bypass.ask && bypass.method) { // `say`
        if ((String(body_params['say'] || '')).trim() === '') {
            hints = ['打声招呼（<code>say=hello</code>）吧，PangBai 也许会对你有所回应。'];
        } else if (!bypass.say) {
            hints = ['PangBai 似乎对你的打招呼不太感冒，或许说「hello」能够奏效。'];
        }
    }
    // all correct
    if (bypass.method && bypass.ask && bypass.say) {
        await setLevel(c, 4);
        return c.redirect(u.pathname + u.search);
    }

    return c.html(
        view.render('http', {
            page_title: 'Level 3 探赜索隐' + ` - ${TITLE}`,
            title: 'Level 3: 探赜索隐',
            description: [
                '理解是深入的途径，将心比心是有效沟通的方法论。',
                '与孩子沟通的方式并不唯一，先入后导，顺其者自然。'
            ].join('\n'),
            hint: hints.join('\n'),
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

// Level 4
app.all('/', atLevel(4, async (c, next) => {
    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    const body_params = await parseBodyParams(c);
    const bypass = {
        ask: (c.req.query('ask') || '').trim() !== '',
        method: c.req.method === 'POST',
        say: body_params['say'] === '玛卡巴卡阿卡哇卡米卡玛卡呣',
        ua: containsUA(c.req.header('User-Agent') || '', 'Papa')
    }

    let hints: string[] = []
    // hints for previous level missing
    if (!bypass.ask) {
        hints = [
            'PangBai 看了你一眼，对你投来鄙夷的眼神。',
            '你依稀记得，一位名为塔塔洛夫的智者曾经告诫过你：沟通之前要先询问（Query, or <code>ask</code>）。'
        ];
    } else if (!bypass.method) {
        hints = ['你需要使用正确的方法（Method）来与 PangBai 沟通。'];
    }
    // hints for previous correct (current stage)
    if (bypass.ask && bypass.method && !bypass.ua) {
        hints = [
            'PangBai 回应了呢！可只有 <code>Papa</code> 的话语才能让她感到安心。',
            '代理人（Agent)，这个委托你就接了吧！'
        ];
    }
    // hints for incorrect parameter value
    if (bypass.ask && bypass.method && bypass.ua) { // `say`
        if ((body_params['say'] || '').trim() === '') {
            hints = ['PangBai 有些开心起来了呢，你想对她<strong>说</strong>些什么？'];
        } else if (!bypass.say) {
            hints = ['你的话语似乎没有对 PangBai 起效，试着说「玛卡巴卡阿卡哇卡米卡玛卡呣」。'];
        }
    }
    // all correct
    if (bypass.ask && bypass.method && bypass.ua && bypass.say) {
        await setLevel(c, 5);
        return c.redirect(u.pathname + u.search);
    }

    return c.html(
        view.render('http', {
            page_title: 'Level 4 不悱不发' + ` - ${TITLE}`,
            title: 'Level 4: 不悱不发',
            description: [
                '不愤不启，不悱不发。因势利导，顺势而为。'
            ].join('\n'),
            hint: hints.join('\n'),
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

// Level 5
app.all('/', atLevel(5, async (c, next) => {
    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    let hints: string[] = []

    const body_params = await parseBodyParams(c);
    const contains_file =
        isContentType(c.req.raw.headers, 'multipart/form-data') &&
        (body_params['file'] || null) !== null &&
        body_params['file'] instanceof File &&
        body_params['file'].name
    const bypass = {
        ask: (c.req.query('ask') || '').trim() !== '',
        say: body_params['say'] === '玛卡巴卡阿卡哇卡米卡玛卡呣',
        ua: containsUA(c.req.header('User-Agent') || '', 'Papa'),
        method: c.req.method === 'PATCH',
        file: contains_file && (body_params['file'] as File).name.endsWith('.zip')
    }
    // hints for previous level missing
    if (!bypass.ask) {
        hints = [
            'PangBai 看了你一眼，对你投来鄙夷的眼神。',
            '你依稀记得，一位名为塔塔洛夫的智者曾经告诫过你：沟通之前要先询问（Query, or <code>ask</code>）。'
        ];
    } else if (!bypass.say) {
        hints = ['PangBai 依然对你比较警惕，因此「玛卡巴卡阿卡哇卡米卡玛卡呣」或许是不可省略的。'];
    } else if (!bypass.ua) {
        hints = ['PangBai 回应了呢！可代理人（Agent）似乎忘了，只有 <code>Papa</code> 的话语才能让她感到安心——这可不是合格的绳匠哦！'];
    }
    // hints for incorrect parameter value
    if (bypass.ask && bypass.say && bypass.ua && !(bypass.method && bypass.file)) {
        // method, content-type
        if (bypass.method && contains_file) {
            // extension not match
            hints = ['PangBai 驳回了你的补丁包，并翻开了英语书阅读起 Zoom 和 <strong>Zip</strong> 的对话。']
        } else {
            hints = [
                '这里便是 PangBai 的心境了呢！试着解开心结吧 ~',
                '或许可以尝试用修改（PATCH）的方法提交一个补丁包（<code>name="file"; filename="*.zip"</code>）试试。'
            ]
        }
    }
    // all correct
    if (bypass.ask && bypass.say && bypass.ua && bypass.method && bypass.file) {
        await setLevel(c, 6);
        return c.redirect(u.pathname + u.search);
    }

    return c.html(
        view.render('http', {
            page_title: 'Level 5 渐入佳境' + ` - ${TITLE}`,
            title: 'Level 5: 渐入佳境',
            description: [
                '发现症结，直面矛盾。实事求是，平心相待。'
            ].join('\n'),
            hint: hints.join('\n'),
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

app.all('/', atLevel(6, async (c, next) => {
    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    let hints: string[] = [
        '还在等什么？距离成为 PangBai 的亲人（<code>localhost</code>）只有一步之遥了呢！',
        '这里的前方是一方通行啊！Level 6 可不是容易的！'
    ]

    const test_host_port = (host: any) => {
        if (typeof host !== 'string') return false;
        let port_str = host.slice(host.lastIndexOf(':') + 1).trim();
        if (port_str.length > 0) {
            if (/[^0-9]/.test(port_str)) return false;
            let port = parseInt(port_str);
            if (isNaN(port) || port < 0 || port > 65535) return false;
        }
        return true;
    }
    const test_local_ip = (ip: any) => {
        if (typeof ip !== 'string') return false;
        if (!test_host_port(ip)) return false;
        ip = ip.slice(0, ip.lastIndexOf(':'));
        ip = ip.slice(0, ip.lastIndexOf(':'));
        let test = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
        if (!test) return false;
        let parts = ip.split('.').map(Number);
        return parts.every((p: number) => p >= 0 && p <= 255);
    };
    const test_local_host = (host: any) => {
        if (typeof host !== 'string') return false;
        if (!test_host_port(host)) return false;
        host = host.slice(0, host.lastIndexOf(':'));
        return /^localhost$/.test(host) || test_local_ip(host);
    }
    const test_local_uri = (uri: any) => {
        if (typeof uri !== 'string') return false;
        const u = new URL(uri, 'http://1.1.1.1');
        return test_local_host(u.hostname);
    }

    const xff = (c.req.header('X-Forwarded-For') || '').split(/\s*,\s*/)
    if (xff[0] === '') xff.shift();

    const bypass = {
        host: test_local_host(c.req.header('Host')),
        x_real_ip: test_local_ip(c.req.header('X-Real-IP')),
        x_forwarded_for: xff.length > 0 && (xff.length > 1 ? [xff[0], xff[xff.length - 1]] : xff).every(test_local_host),
        referrer: test_local_uri(c.req.header('Referer')),
    }

    const conditions = [
        bypass.host && bypass.referrer && xff.length === 0,
        bypass.x_real_ip,
        bypass.x_forwarded_for,
    ]
    if (conditions.some(Boolean)) {
        hints = [
            'PangBai 以一种难以形容的表情望着你——激动的、怀念的，却带着些不安与惊恐，像落单后归家的雏鸟，又宛若雷暴中遇难的船员。',
            '你似乎无法抵御这种感觉的萦绕，像是一瞬间被推入到无法言喻的深渊。尽管你尽力摆脱，但即便今后夜间偶见酣眠，这一瞬间塑成的梦魇也成为了美梦的常客。',
            `「像■■■■验体■■不可能■■■■ JWT 这种■■ ${JWT_KEY} ■■■密钥，除非■■■■■走，难道■■■■■■吗？！」`,
            `「......」`
        ]
        // await setLevel(c, 0);
        // return c.redirect(u.pathname + u.search);
    }

    return c.html(
        view.render('http', {
            page_title: 'Level 6 一方通行' + ` - ${TITLE}`,
            title: 'Level 6: 一方通行',
            description: [
                '「君子素其位而行，不愿乎其外。」',
                html`<span style="display: inline-block; width: 20em; max-width: 100%; text-align: right;">${'——《中庸·第十四章》'}</span>`
            ].join('\n'),
            hint: hints.join('\n'),
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

app.all('/', atLevel(0, async (c, next) => {
    const u = getURLObject(c);
    const raw = c.req.raw.clone();

    function xor_string(str: string, key: string) {
        let res: number[] = [];
        for (let i = 0; i < str.length; i++) {
            res.push(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
        }
        return res
    }

    const FLAG = process.env['FLAG'] || 'flag{PangBai_is_so_cute}';
    let data_flag = Buffer.from(xor_string(encodeURIComponent(FLAG), 'PangBai!!')).toString('base64').replace(/=+$/g, '');

    let hints: string[] = [
        '「PangBai！危险！PangBai！！PangBai！！！」',
        html`<a data-continue>${'从梦中醒来'}</a>`
    ].map(String);

    return c.html(
        view.render('http.lv0', {
            page_title: 'Level 0 此心安处是吾乡' + ` - ${TITLE}`,
            title: 'Level 0: 此心安处是吾乡',
            description: [
                '平凡的普通人，是世界的基调。无数平凡的人们，书写了波澜壮阔的历史。',
                '「我将无我，不负人民。」'
            ].join('\n'),
            hint: hints.join('\n'),
            flag: data_flag,
            code_html: wrapCodeHtml({
                method: c.req.method,
                path: c.req.path,
                query: u.search,
                http_version: '1.1',
                headers: ht.toJSON(c.req.raw.headers),
                body: await raw.clone().text()
            })
        })
    );
}))

app.use('/*', serveStatic({ root: './public' }));

export default {
    port: 3000,
    fetch: app.fetch
}