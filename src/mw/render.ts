import fs from 'node:fs';
import path from 'node:path';

interface ViewOptions {
    rootDir: string;
    suffix: string;
    defaultData: Record<string, any>;
}

const defaultOptions: ViewOptions = {
    rootDir: 'views',
    suffix: 'html',
    defaultData: {}
};

export class Viewer {

    protected opts: ViewOptions;

    constructor(options: Partial<ViewOptions> = {}) {
        this.opts = Object.assign({}, defaultOptions, options);
    }

    render(fn: string, data: Record<string, any>) {
        const _data = Object.assign({}, this.opts.defaultData, data);
        let content = fs.readFileSync(path.join(this.opts.rootDir, fn + '.' + this.opts.suffix), 'utf8');
        return content.replace(/{{ *([a-zA-Z$][a-zA-Z0-9_$]*) *}}/g, (_, key) => {
            if (Object.prototype.hasOwnProperty.call(_data, key)) {
                if (typeof _data[key] === 'undefined') return 'undefined';
                if (_data[key] === null) return 'null';
                return _data[key].toString();
            } else {
                return '';
            }
        });
    }

}