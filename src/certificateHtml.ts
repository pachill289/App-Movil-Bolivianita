import assets from './certificate-assets.json';
import { parseCertificateQR } from './qr';

export type CertificateRecord = {
    jewelry_id: string; description: string; gemstone: string; metal: string; cut: string;
    barcode_value: string; image_path: string; template?: string;
};
// Escape script-closing tags and Unicode separators in data, never interpolate HTML fields.
const scriptJSON = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function certificateHtml(record: CertificateRecord, photo: string, qrValue?: string): string {
    if (qrValue && parseCertificateQR(qrValue) !== record.jewelry_id.toLowerCase()) throw new Error('El QR no corresponde al certificado.');
    const template = record.template === 'certificado-oficial-2' ? 'certificado-oficial-2' : 'certificado-oficial';
    const payload = { record: { ...record, template }, photo, qrValue: qrValue || record.jewelry_id, background: assets.templates[template] };
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=1050, maximum-scale=4, user-scalable=yes">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'">
<style>
@font-face{font-family:'Roboto Mono';font-weight:400;src:url('${assets.fonts['400']}')}
@font-face{font-family:'Roboto Mono';font-weight:700;src:url('${assets.fonts['700']}')}
*{box-sizing:border-box}body{margin:0;background:#fbf8fa}
${assets.styles}
.certificate{box-shadow:none}
</style></head><body>
<div class="certificate" role="img" aria-label="Certificado de autenticidad">
<img class="certificate-bg" alt="Plantilla del certificado"><div class="photo-overlay"><img id="photo" alt="Joya certificada"></div>
<div class="overlay-field description"><strong>Descripción / Item:&nbsp;</strong><span></span></div>
<div class="overlay-field gemstone"><strong>Gema / Gemstone:&nbsp;</strong><span></span></div>
<div class="overlay-field metal"><strong>Metal / Metal:&nbsp;</strong><span></span></div>
<div class="overlay-field cut"><strong>Corte / Cut:&nbsp;</strong><span></span></div>
<div class="qr-overlay"><img id="qr" alt="QR de verificación"></div><img class="barcode-overlay" alt="Código de barras del certificado">
</div><script>${assets.script.replace(/<\/script/gi, '<\\/script')}</script><script>
const payload=${scriptJSON(payload)};
const notify=(type)=>window.ReactNativeWebView?.postMessage(type);
async function load(selector,src){const img=document.querySelector(selector);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src;});}
(async()=>{try{
 for(const field of ['description','gemstone','metal','cut'])document.querySelector('.'+field+' span').textContent=payload.record[field];
 const canvas=document.createElement('canvas');
 window.certificateCodes.JsBarcode(canvas,payload.record.barcode_value,{format:'CODE128C',width:2,height:36,displayValue:true,fontSize:14,textMargin:4,margin:8,marginLeft:20,marginRight:20,background:'#ffffff',lineColor:'#000000'});
 const qr=await window.certificateCodes.QRCode.toDataURL(payload.qrValue,{width:512,margin:4,errorCorrectionLevel:'M'});
 await Promise.all([document.fonts.ready,load('.certificate-bg',payload.background),load('#photo',payload.photo),load('#qr',qr),load('.barcode-overlay',canvas.toDataURL('image/png'))]);
 notify('ready');
}catch{notify('error');}})();
</script></body></html>`;
}
