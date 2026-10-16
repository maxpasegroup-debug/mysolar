import { badInput } from '../errors.js';
// Integer paise, thousandth quantities and hundredth percentage points. Round half up per line.
export function decimal(value,places,label,max=100000000000n){
 if(typeof value!=='string'||!new RegExp(`^\\d{1,10}(?:\\.\\d{1,${places}})?$`).test(value))throw badInput(`Enter a valid ${label}.`);
 const [whole,fraction='']=value.split('.');const result=BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0'));
 if(result>max)throw badInput(`${label} is too large.`);return result;
}
const round=(n,d)=>(n+d/2n)/d;
export function calculate(items,{taxMode,delivery,installation,chargesTaxRate}){
 let net=0n,tax=0n,total=0n;
 const priced=items.map(item=>{
  const qty=decimal(item.quantity,3,'quantity',999999999999n);if(qty===0n)throw badInput('Quantity must be above zero.');
  const unit=decimal(item.unitPrice,2,'unit price'),discount=decimal(item.discount,2,'line discount');
  const gross=round(qty*unit,1000n);if(discount>gross)throw badInput('A discount cannot exceed its line amount.');
  const amount=gross-discount;const result=taxed(amount,item.taxRate,taxMode);
  net+=result.net;tax+=result.tax;total+=result.total;
  return {...item,unitPricePaise:String(unit),discountPaise:String(discount),amounts:strings(result)};
 });
 const deliveryPaise=decimal(delivery,2,'delivery charge'),installationPaise=decimal(installation,2,'installation charge');
 const charges=taxed(deliveryPaise+installationPaise,chargesTaxRate,taxMode);net+=charges.net;tax+=charges.tax;total+=charges.total;
 if(total>100000000000n)throw badInput('Quotation total exceeds the supported amount.');
 return {items:priced,deliveryPaise:String(deliveryPaise),installationPaise:String(installationPaise),totalPaise:String(total),totals:{...strings({net,tax,total}),charges:strings(charges),taxConfirmed:taxMode!=='unknown',rounding:'Half up per line to INR paise'}};
}
function taxed(amount,rate,mode){
 if(['unknown','exempt'].includes(mode)){if(rate!=='')throw badInput('Do not enter a tax rate for unknown or exempt treatment.');return {net:amount,tax:0n,total:amount};}
 const bp=decimal(rate,2,'tax percentage',10000n);
 const tax=mode==='inclusive'?amount-round(amount*10000n,10000n+bp):round(amount*bp,10000n);
 return mode==='inclusive'?{net:amount-tax,tax,total:amount}:{net:amount,tax,total:amount+tax};
}
function strings(object){return Object.fromEntries(Object.entries(object).map(([key,value])=>[key,String(value)]));}
