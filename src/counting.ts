export type CountSummary = { id:string; status:'open'|'finished'; started_at:string; finished_at:string|null; counted_units:number; counted_products:number; expected_units:number; missing_products:number; missing_units:number; extra_units:number; changed_products:number };
export type CountItem = { jewelry_id:string;description:string;barcode:string|null;image_path:string|null;counted:number;initial_stock:number|null;price?:number|null;stock?:number;missing?:number };
export type CountOperation = { id:string;request:string;barcode:string;delta:1|-1 };
export function countBarcode(raw:string):string { const value=raw.trim();if(!/^\d{14}$/.test(value))throw new Error('Escanea el código de barras de 14 dígitos del certificado.');return value; }
export function definitiveCountError(code?:string){return ['42501','22023','P0001'].includes(code||'');}
