ALTER TABLE business_orders ADD COLUMN fulfilment_tracking_required boolean NOT NULL DEFAULT true;
-- Preserve historical closed-order statements; never invent delivery quantities.
UPDATE business_orders SET fulfilment_tracking_required=false WHERE status IN ('fulfilled','cancelled');
CREATE TABLE order_fulfilment_entries (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,order_id uuid NOT NULL,order_item_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('delivered','returned')),quantity_milli bigint NOT NULL CHECK(quantity_milli>0),
 movement_id uuid,delivery_id uuid,reference text NOT NULL,notes text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(order_item_id,order_id,company_id) REFERENCES business_order_items(id,order_id,company_id),
 FOREIGN KEY(movement_id,company_id) REFERENCES inventory_movements(id,company_id),
 UNIQUE(id,company_id),FOREIGN KEY(delivery_id,company_id) REFERENCES order_fulfilment_entries(id,company_id),
 CHECK((kind='delivered' AND delivery_id IS NULL) OR (kind='returned' AND delivery_id IS NOT NULL))
);
CREATE INDEX fulfilment_order ON order_fulfilment_entries(company_id,order_id,order_item_id);
ALTER TABLE inventory_movements DROP CONSTRAINT inventory_movements_kind_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_kind_check CHECK(kind IN ('opening','adjustment','receipt','reserve','release','consume','transfer_in','transfer_out','project_return','supplier_return','customer_return'));
