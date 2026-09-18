const fs = require('node:fs');
const ts = require('typescript');
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
for (const path of ['App.tsx', 'src/api.ts', 'src/ui.tsx', 'src/qr.ts', 'src/secureStorage.ts', 'tests/qr.test.ts', 'tests/sales.test.ts']) {
 const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
 if (source.parseDiagnostics.length) throw new Error(`Invalid syntax: ${path}`);
 fs.writeFileSync(path, printer.printFile(source));
}
console.log('Source formatted; TypeScript syntax valid.');