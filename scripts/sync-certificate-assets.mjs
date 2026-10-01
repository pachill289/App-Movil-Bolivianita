// Refresh the mobile snapshot from the sibling web project. The resulting JSON
// is committed, so mobile builds do not need the web repository or a CDN.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const web = resolve(process.argv[2] || '../sistema_inventario_bolivianita_vercel');
const requireWeb = createRequire(resolve(web, 'package.json'));
const { build } = createRequire(requireWeb.resolve('vite'))('esbuild');
const read64 = async path => (await readFile(path)).toString('base64');
const templates = {};
for (const id of ['certificado-oficial', 'certificado-oficial-2']) {
    templates[id] = `data:image/jpeg;base64,${await read64(resolve(web, 'public', `${id}.jpeg`))}`;
}
const styles = (await readFile(resolve(web, 'src/styles/app.css'), 'utf8')).split(/\r?\n/)
    .filter(line => /^\.(certificate\{|overlay-field|photo-overlay|qr-overlay|barcode-overlay)/.test(line)).join('\n');
const fonts = {};
for (const [weight, folder] of [['400', '400Regular'], ['700', '700Bold']]) {
    fonts[weight] = `data:font/ttf;base64,${await read64(resolve(`node_modules/@expo-google-fonts/roboto-mono/${folder}/RobotoMono_${folder}.ttf`))}`;
}
const bundle = await build({ stdin: { contents: `
    import QRCode from ${JSON.stringify(requireWeb.resolve('qrcode/lib/browser.js'))};
    import JsBarcode from ${JSON.stringify(requireWeb.resolve('jsbarcode'))};
    window.certificateCodes = { QRCode, JsBarcode };
`, resolveDir: web }, bundle: true, write: false, minify: true, platform: 'browser', format: 'iife', legalComments: 'inline' });
await writeFile('src/certificate-assets.json', JSON.stringify({ templates, styles, fonts, script: bundle.outputFiles[0].text }));
console.log('Certificate templates, CSS, fonts and code encoders synchronized.');
