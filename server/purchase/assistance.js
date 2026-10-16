// Pure rules over authorized stored records. Future SIA can reuse this without an AI provider.
export function assistance(quote,items){
 const questions=[];
 for(const [key,question] of [['installation_scope','Does this price include installation? What work is included?'],['included','Which equipment and work are included?'],['excluded','Which work and charges are excluded?'],['warranty','What warranty terms are confirmed, and who provides service?'],['timeframe','What delivery or installation timeframe can you confirm?'],['payment_terms','What payment terms would apply in a later order?'],['assumptions','Which site conditions or assumptions could change this amount?']])if(!quote[key])questions.push(question);
 if(quote.tax_mode==='unknown')questions.push('Is tax included, excluded or exempt? What tax amount would apply?');
 if(items.some(item=>!item.brand||!item.model||!item.specifications))questions.push('Please confirm missing equipment brands, models, capacities and specifications where applicable.');
 return {questions,notices:['All quotation specifications and terms are supplied by the distributor and are not independently verified.',...(quote.estimated?['This quotation is an estimate. Ask which amounts may change.']:[]),...(quote.tax_mode==='unknown'?['The displayed total excludes any unconfirmed tax. It is not a confirmed final payable amount.']:[]),'A lower headline amount may exclude work or charges. Compare the supplied scope and exclusions.','Choosing a preferred quotation creates no order, payment authorization or distributor acceptance.']};
}
