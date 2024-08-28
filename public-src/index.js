import './styles/index.scss'

/**
 * @param {string} content
 */
function copy(content) {
    /**
     * @param {ClipboardEvent} e
     */
    const copyReact = (e) => {
        e.clipboardData.setData("text/plain", content);
        e.preventDefault();
    };
    document.addEventListener("copy", copyReact);
    if (document.execCommand("copy")) {
        document.removeEventListener("copy", copyReact);
    } else {
        document.removeEventListener("copy", copyReact);
        navigator.clipboard.writeText(content);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const codeEl = document.querySelector('.block-body code')
    const copyBtn = document.querySelector('[data-click="copy"]')
    let timeout = null
    copyBtn.addEventListener('click', () => {
        copy(codeEl.textContent || codeEl.innerText || '')
        copyBtn.setAttribute('data-tooltip', 'Copied!')
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            copyBtn.setAttribute('data-tooltip', 'Copy')
        }, 650)
    })
})