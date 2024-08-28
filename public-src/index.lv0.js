import './styles/index.scss'
import './styles/black.scss'

function fromBase64(base64) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const padding = (base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0));
    const len = base64.length * 3 / 4 - padding;
    const arrayBuffer = new ArrayBuffer(len);
    const bytes = new Uint8Array(arrayBuffer);

    let enc1, enc2, enc3, enc4;
    let dec1, dec2, dec3;

    let i = 0;
    let p = 0;

    while (i < base64.length) {
        enc1 = alphabet.indexOf(base64[i++]);
        enc2 = alphabet.indexOf(base64[i++]);
        enc3 = alphabet.indexOf(base64[i++]);
        enc4 = alphabet.indexOf(base64[i++]);

        dec1 = (enc1 << 2) | (enc2 >> 4);
        dec2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        dec3 = ((enc3 & 3) << 6) | enc4;

        bytes[p++] = dec1;
        if (enc3 !== 64) bytes[p++] = dec2;
        if (enc4 !== 64) bytes[p++] = dec3;
    }

    return arrayBuffer;
}

function decode_uri_xor(buf, key) {
    const bytes = new Uint8Array(buf)
    let res = ''
    for (let i = 0; i < bytes.length; i++) {
        res += String.fromCharCode(bytes.at(i) ^ key.charCodeAt(i % key.length))
    }
    return decodeURIComponent(res)
}

const $ = document.querySelector.bind(document)

const BG_MUSIC_URI = '/bg.mp3'
const FIANL_MUSIC_URI = '//music.163.com/song/media/outer/url?id=2086092043.mp3'

const append_music = (src, mark, attr = []) => {
    const div = document.createElement('div')
    div.innerHTML = `<audio data-audio="${mark}"${(attr.length ? ' ' : '') + attr.join(' ')}><source src="${src}" type="audio/mpeg">Your browser does not support the audio element.</audio>`
    div.style.display = 'none'
    document.body.appendChild(div)
}

const play_misc = (mark) => {
    $(`audio[data-audio="${mark}"]`).play()
}

document.addEventListener('DOMContentLoaded', () => {
    append_music(BG_MUSIC_URI, 'bg')
    const box = $('[data-black-box]')
    const ctl = $('[data-control]')
    const contentEl = box.querySelector('[data-content]')
    const delay = 1000
    let _flag = $('[data-flag]').getAttribute('data-flag')
    const flag = decode_uri_xor(fromBase64(_flag), 'PangBai!!')
    async function display(ms = 0, content) {
        await sleep(250)
        let time_to_wait = setContent(content)
        ctl.classList.remove('hide-content')
        await sleep(delay + time_to_wait + ms)
    }
    async function hide() {
        ctl.classList.add('hide-content')
        await sleep(delay + 250)
    }
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/ /g, "&nbsp;")
    }
    function setContent(content) {
        let time_to_wait = 0
        let lines = typeof content === 'string' ? content.split(/\r?\n/) : content
        contentEl.innerHTML = lines.map(line => {
            let _delay = /^:([0-9]+):/.exec(line)
            let span_tag_start = `span class='span-line'`
            if (_delay) {
                line = line.slice(_delay[0].length)
                _delay = parseInt(_delay[1])
                time_to_wait = _delay > time_to_wait ? _delay : time_to_wait
                span_tag_start = `span class='span-line' style='opacity: 0; animation: shade-in 1s ease-in-out ${_delay + delay}ms forwards;'`
            }
            return `<${span_tag_start}>${escapeHtml(line)}</$>`
        }).join('\n')
        return time_to_wait
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
    async function message() {
        await display(3500, [
            '「PangBai！PangBai！！」',
            ':2000:女孩稚嫩、清脆的声音化作绝望的大雨'
        ])
        await hide()
        await display(7000, [
            '「PangBai...」',
            ':1500:嘈杂中已无法分辨啜泣声和雨声，但雷声却能轻易打破这脆弱的寂静，像沉重的铁锤一样砸在女孩的身上',
        ])
        await hide()
        await display(4500, [
            '警报声...枪声...',
            ':2000:「可恶！竟然被 10031 号实验体逃走了！」一声粗鲁的咆哮斩断了喧杂'
        ])
        await hide()
        await display(3500, [
            '雨声，更小的雨声，没有雷声'
        ])
        await hide()
        await display(2500, [
            '......'
        ])
        await hide()
        play_misc('final')
        await sleep(1500)
        await display(3000, [
            'To be continued...',
            `:2500:${flag}`
        ])
    }
    const continueEl = $('[data-continue]')
    let prevent = false
    append_music(FIANL_MUSIC_URI, 'final', ['loop'])
    async function click() {
        if (prevent) return
        prevent = true
        play_misc('bg')
        box.classList.remove('hide')
        await sleep(1500)
        prevent = false
        message()
    }
    continueEl.addEventListener('click', click)
})