-- Discovery metadata only. Existing product/category/offer IDs and approvals remain intact.
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS discovery_key text UNIQUE;
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS discovery_category_id uuid REFERENCES catalogue_categories(id);
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS localized_names jsonb NOT NULL DEFAULT '{}';
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS localized_descriptions jsonb NOT NULL DEFAULT '{}';
ALTER TABLE catalogue_categories ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100;
CREATE INDEX IF NOT EXISTS categories_discovery_idx ON catalogue_categories(discovery_category_id);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='catalogue_categories'::regclass AND conname='category_discovery_metadata_valid') THEN
  ALTER TABLE catalogue_categories ADD CONSTRAINT category_discovery_metadata_valid CHECK(
   jsonb_typeof(localized_names)='object' AND jsonb_typeof(localized_descriptions)='object'
   AND display_order BETWEEN 0 AND 10000 AND length(description)<=300
   AND (discovery_category_id IS NULL OR discovery_category_id<>id));
 END IF;
END $$;

-- Reuse original slugs/IDs. New taxonomy is not a set of purchasable products.
DO $$
DECLARE item record; category uuid;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('panels','solar-panels','Solar Panels','Panels that turn sunlight into electricity',1),
 ('inverters','inverters','Solar Inverters','Equipment that converts solar power',2),
 ('storage','batteries','Solar Batteries & Storage','Store power for later use',3),
 ('systems','complete-solar-systems','Complete Solar Systems','Explore complete solar solutions',4),
 ('heating','solar-water-heating','Solar Water Heating','Use sunlight to heat water',5),
 ('mounting','mounting','Mounting Structures & Accessories','Parts used to install solar equipment',6),
 ('electrical','cables-protection','Solar Electrical Components','Controls and electrical safety equipment',7),
 ('lighting-pumps','solar-pumps','Solar Lighting & Pumps','Solar lights, water pumps and more',8)
 ) AS seed(key,slug,name,description,position)
 LOOP
  SELECT id INTO category FROM catalogue_categories WHERE slug=item.slug AND parent_id IS NULL AND kind='product';
  IF category IS NULL THEN
   IF EXISTS(SELECT 1 FROM catalogue_categories WHERE slug=item.slug) THEN
    RAISE EXCEPTION 'Existing category slug requires operator reconciliation';
   END IF;
   category:=gen_random_uuid();
   INSERT INTO catalogue_categories(id,slug,name,kind,attribute_schema) VALUES(category,item.slug,item.name,'product',
    CASE item.key WHEN 'systems' THEN '{"capacity_kw":{"type":"number","label":"System capacity","unit":"kW","min":0.01,"max":1000000},"configuration":{"type":"enum","label":"Configuration","options":["On-grid","Off-grid","Hybrid"]},"included_equipment":{"type":"text","label":"Included equipment"},"installation_scope":{"type":"text","label":"Installation scope"}}'::jsonb
    WHEN 'heating' THEN '{"capacity_litres":{"type":"number","label":"Water capacity","unit":"L","min":0.01,"max":1000000},"collector_type":{"type":"text","label":"Collector type"},"application":{"type":"text","label":"Intended use"}}'::jsonb ELSE '{}'::jsonb END);
  END IF;
  -- Cosmetic metadata does not revise the technical schema or invalidate approved offers.
  UPDATE catalogue_categories SET name=item.name,discovery_key=item.key,description=item.description,display_order=item.position WHERE id=category;
 END LOOP;
 -- Group legacy solar lighting in discovery without reparenting its products or changing IDs.
 UPDATE catalogue_categories SET discovery_category_id=(SELECT id FROM catalogue_categories WHERE discovery_key='lighting-pumps')
 WHERE slug='solar-lighting' AND discovery_key IS NULL;
END;
$$;
