import runner from 'font-spider'
import fs from 'node:fs';
import path from 'node:path';

export default class FontPlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.beforeCompile.tapAsync('FontPlugin', async (stats, callback) => {
            let { copy, clean, html, beforeRun } = this.options;

            copy = copy || []
            html = html || []
            beforeRun = beforeRun || (() => Promise.resolve())
            if (!Array.isArray(copy[0])) copy = [copy];
            if (!Array.isArray(html)) html = [html];

            let pool = []
            for (let i = 0; i < copy.length; i++) {
                pool.push(
                    new Promise((resolve, reject) => {
                        if (clean) try { fs.rmSync(path.resolve(copy[i][1]), { recursive: true }) } catch (e) { };
                        fs.cp(path.resolve(copy[i][0]), path.resolve(copy[i][1]), { recursive: true }, e => {
                            if (e) {
                                console.error(e);
                                callback(e)
                                reject(e)
                            } else {
                                resolve()
                            }
                        })
                    })
                )
            }
            await Promise.all(pool)
            await beforeRun();
            runner(html, {
                backup: false
            }, callback);
        });
    }
}