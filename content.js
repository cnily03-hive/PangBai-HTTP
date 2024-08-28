import fs from 'node:fs';

export default `

点击屏幕任意位置开始游戏
${fs.readFileSync('./public-src/start.js')}
${fs.readFileSync('./public-src/index.lv0.js')}

`