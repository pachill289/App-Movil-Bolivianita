import { saleAmounts } from './saleAmounts';
export function guidePercent(raw:string):number|null {
 const text=raw.trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(text))return null;
 const value=Number(text);return value>=0&&value<=100?value:null;
}
export function guideAmounts(amount:number,method:string|null,role:string,percent:number) {
 const sale=saleAmounts(amount,method,role);
 if(!sale||!Number.isFinite(percent)||percent<0||percent>100||Math.abs(percent*100-Math.round(percent*100))>0.00001)return null;
 if(percent>0&&!['admin','seller'].includes(role))return null;
 const cents=BigInt(Math.round(sale.net*100)), rate=BigInt(Math.round(percent*100));
 const commission=Number((cents*rate+5000n)/10000n)/100;
 return {...sale,commission,net:Math.round((sale.net-commission)*100)/100};
}
