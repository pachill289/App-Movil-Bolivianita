// Local visual QA; fictitious data, no connection to the production database.
import { createServer } from 'node:http';
import { certificateHtml } from '../src/certificateHtml';
const photo = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180"><rect width="200" height="180" fill="#efe6f3"/><path d="M100 25L155 75L100 150L45 75Z" fill="#864297"/><text x="100" y="172" text-anchor="middle" font-size="12">FOTOGRAFÍA DE PRUEBA</text></svg>').toString('base64');
createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(certificateHtml({ jewelry_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', description: 'Anillo de bolivianita', gemstone: 'Bolivianita', metal: 'Oro 18K', cut: 'Oval', barcode_value: '10000000000000', image_path: '', template: request.url === '/bolivianita' ? 'certificado-oficial-2' : 'certificado-oficial' }, photo, 'https://inventario.example/certificado/cccccccc-cccc-4ccc-8ccc-cccccccccccc'));
}).listen(4177, '127.0.0.1', () => console.log('Certificate preview: http://127.0.0.1:4177 (Amatista), /bolivianita'));
