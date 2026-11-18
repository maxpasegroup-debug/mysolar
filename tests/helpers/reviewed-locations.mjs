// Fictional review records only, inside the verified disposable schema.
export async function seedReviewedLocation(db,actor,{pin='682001',state='Kerala',district='Ernakulam',names=[]}={}){
 await db.query('INSERT INTO postal_locations(pin,state,district,state_key,district_key,source_reference,reviewed_by) VALUES($1,$2,$3,lower($2),lower($3),$4,$5) ON CONFLICT(pin) DO NOTHING',[pin,state,district,'[TEST] Explicit reviewed fixture, not production postal data',actor]);
 for(const name of names)await db.query('INSERT INTO postal_localities(id,pin,name,locality_key,source_reference,reviewed_by) VALUES(gen_random_uuid(),$1,$2,lower($2),$3,$4) ON CONFLICT(pin,locality_key) DO NOTHING',[pin,name,'[TEST] Explicit reviewed locality fixture',actor]);
}
