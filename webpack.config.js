import fs from 'node:fs'
import path from 'node:path'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import FontPlugin from './font-plugin.js'

export default function (env, argv) {
    const mode = argv.mode || 'production';
    return {
        mode: mode,
        devtool: (mode === "development") ? 'source-map' : false,
        ...env['WEBPACK_SERVE'] ? {} : { watch: (mode === "development") },
        watchOptions: {
            ignored: /node_modules|\.cache/,
        },
        devServer: {
            compress: true,
            port: 9000,
            proxy: [{
                context: (path) => {
                    return !path.startsWith('/dist/');
                },
                target: 'http://localhost:3000',
                changeOrigin: false,
                secure: false,
            }
            ],
        },
        entry: {
            index: './public-src/index.js',
            start: './public-src/start.js',
            'index.lv0': './public-src/index.lv0.js',
        },
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(import.meta.dirname, 'public/dist'),
            publicPath: '/dist/',
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                        },
                    },
                },
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
                {
                    test: /\.s[ac]ss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'sass-loader',
                    ],
                }
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    test: /\.js(\?.*)?$/i,
                }),
                new CssMinimizerPlugin({
                    test: /\.(c|sc|sa)ss(\?.*)?$/i,
                }),
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].bundle.css',
            }),
            new CleanWebpackPlugin({
                cleanOnceBeforeBuildPatterns: [
                    '**/*',
                    path.resolve(import.meta.dirname, 'public/fonts')
                    // path.resolve(import.meta.dirname, 'public/dist')
                ],
                cleanStaleWebpackAssets: false,
                protectWebpackAssets: false,
            }),
            new FontPlugin({
                copy: [
                    ['public-src/fonts', '.cache/fonts'],
                    ['public-src/font.html', '.cache/font.html'],
                ],
                clean: true,
                async beforeRun() {
                    const tmpl = fs.readFileSync('.cache/font.html', 'utf-8');
                    const content = (await import('./content.js')).default;
                    fs.writeFileSync(
                        '.cache/font.html',
                        tmpl.replace(/{{\s*content\s*}}/,
                            content
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                        )
                    );
                },
                html: ['.cache/font.html'],
            })
        ],
        resolve: {
            alias: {
                '@fonts': path.resolve(import.meta.dirname, '.cache/fonts'),
            }
        }
    }
}