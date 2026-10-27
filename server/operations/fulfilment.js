import * as c from './core.js';
export const fulfilment=c.router();
export async function fulfilmentSummary(db,company,order){
 return (await db.query(`SELECT i.id,i.description,i.unit,i.quantity_milli,
 coalesce(sum(CASE WHEN e.kind='delivered' THEN e.quantity_milli ELSE -e.quantity_milli END),0)::text AS delivered_milli
 FROM business_order_items i LEFT JOIN order_fulfilment_entries e ON e.order_item_id=i.id AND e.company_id=i.company_id
 WHERE i.company_id=$1 AND i.order_id=$2 GROUP BY i.id ORDER BY i.position`,[company,order])).rows;
}
fulfilment.post('/orders/:id/fulfilment',async(req,res)=>{
 c.v.body(req.body,['operationKey','itemId','kind','quantity','movementId','deliveryId','reference','notes']);
 res.json(await c.context(req,async(db,ctx)=>{c.permit(ctx,'orders.manage');const d=req.body,order=await c.record(db,ctx,'orders',req.params.id,{lock:true});
 return c.once(db,ctx,d.operationKey,'order.fulfilment/'+order.id,d,async()=>{
  const kind=c.v.choice(d.kind,['delivered','returned'],'fulfilment entry'),q=c.quantity(d.quantity),reference=c.plain(d.reference,'delivery or return reference',200,10),notes=c.plain(d.notes,'delivery explanation',500,10);
  if(!['confirmed','processing','partially_fulfilled','fulfilled'].includes(order.status)||order.status==='fulfilled'&&kind==='delivered'&&order.fulfilment_tracking_required)throw c.fail('Record delivery only against a confirmed open order, or document actual delivery evidence for a historical untracked order before its return.');
  const line=(await fulfilmentSummary(db,ctx.companyId,order.id)).find(x=>x.id===c.v.uuid(d.itemId));if(!line)throw c.missing();
  let movement=c.optionalId(d.movementId),delivery=c.optionalId(d.deliveryId);
  if(kind==='delivered'){
   if(q+BigInt(line.delivered_milli)>BigInt(line.quantity_milli))throw c.fail('Delivery exceeds the ordered quantity remaining.');
   if(movement){c.permit(ctx,'inventory.read');const source=(await db.query("SELECT m.* FROM inventory_movements m JOIN inventory_reservations r ON r.id=m.reservation_id AND r.company_id=m.company_id WHERE m.id=$1 AND m.company_id=$2 AND r.order_item_id=$3 AND r.order_id=$4 AND m.kind='consume'",[movement,ctx.companyId,line.id,order.id])).rows[0];if(!source)throw c.fail('Choose an actual stock consumption for this order line.');const used=(await db.query("SELECT coalesce(sum(quantity_milli),0)::text AS q FROM order_fulfilment_entries WHERE company_id=$1 AND movement_id=$2 AND kind='delivered'",[ctx.companyId,movement])).rows[0].q;if(q+BigInt(used)>-BigInt(source.on_hand_delta))throw c.fail('Delivery exceeds its recorded stock consumption.');
   }else if((await db.query('SELECT 1 FROM inventory_reservations WHERE company_id=$1 AND order_item_id=$2 LIMIT 1',[ctx.companyId,line.id])).rowCount)throw c.fail('This line uses reserved stock. Link its actual consumption instead of bypassing stock control.');
  }else{
   const original=(await db.query("SELECT * FROM order_fulfilment_entries WHERE id=$1 AND company_id=$2 AND order_id=$3 AND order_item_id=$4 AND kind='delivered'",[delivery,ctx.companyId,order.id,line.id])).rows[0];if(!original)throw c.missing();
   const returned=(await db.query("SELECT coalesce(sum(quantity_milli),0)::text AS q FROM order_fulfilment_entries WHERE company_id=$1 AND delivery_id=$2 AND kind='returned'",[ctx.companyId,delivery])).rows[0].q;if(q+BigInt(returned)>BigInt(original.quantity_milli))throw c.fail('Return exceeds the original delivery quantity remaining.');
   movement=null;if(original.movement_id){c.permit(ctx,'inventory.manage');const source=(await db.query('SELECT * FROM project_stock_movements WHERE id=$1 AND company_id=$2',[original.movement_id,ctx.companyId])).rows[0];movement=(await c.movement(db,ctx,{itemId:source.item_id,key:d.operationKey,onHand:q,kind:'customer_return',reason:reference+' '+notes,sourceMovementId:source.id,projectId:source.resolved_project_id})).id;}
   if(order.status==='fulfilled')await db.query("UPDATE business_orders SET status='partially_fulfilled',fulfilment_tracking_required=true,revision=revision+1 WHERE id=$1 AND company_id=$2",[order.id,ctx.companyId]);
  }
  const id=c.randomUUID();await db.query('INSERT INTO order_fulfilment_entries(id,company_id,order_id,order_item_id,kind,quantity_milli,movement_id,delivery_id,reference,notes,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,ctx.companyId,order.id,line.id,kind,String(q),movement,delivery,reference,notes,ctx.userId]);
  await c.event(db,ctx,'orders',order.id,'quantity_'+kind,reference,false,{entryId:id,quantityMilli:String(q),movementId:movement});return {id,message:'Actual quantity recorded. Stock, commercial credit and refund records remain separately controlled; no payment or tax adjustment was made.'};
 });}));
});
