import './styles/black.scss'

const $ = document.querySelector.bind(document)

document.addEventListener('DOMContentLoaded', () => {
    const box = $('[data-black-box]')
    const ctl = $('[data-control]')
    const contentEl = box.querySelector('[data-content]')
    const delay = 1000
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
        await display(1500, 'PangBai 过家家（1）')
        await hide()
        await display(2500, '今天，我去孤儿院接走了 PangBai')
        await hide()
        await display(3000, '奇怪的是，孤儿院的老板连手续都没让我办')
        await hide()
        await display(3000, [
            '并且我一抱起 PangBai，她就嚎啕大哭起来',
            ':2500:——我陷入了信任危机'
        ])
        await hide()
        await display(3000, '回到家后，我打开了婴幼儿护理专业必读书目')
        await hide()
        await display(5000, '《图解 HTTP》')
        await hide()
        await sleep(1000)
        window.location.replace('/start')
    }
    async function click() {
        box.removeEventListener('click', click)
        await hide()
        ctl.classList.remove('blink')
        message()
    }
    box.addEventListener('click', click)
})