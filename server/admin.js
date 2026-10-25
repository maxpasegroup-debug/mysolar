// Database-operator tool only. No HTTP route can issue platform grants.
import { randomUUID } from 'node:crypto';
import { pool, transaction, audit } from './db/pool.js';
import { body, email, text, choice } from './validation.js';
try {
  const action=choice(process.argv[2],['grant','revoke'],'action');
  console.log('Supply one JSON object on stdin containing email and reason. Finish input with EOF.');
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>2048)throw new Error('Input too large');}
  const data=body(JSON.parse(input),['email','reason']);const address=email(data.email),reason=text(data.reason,'operator reason',300,10);
  await transaction(async db=>{
    const user=await db.query("SELECT id FROM users WHERE email=$1 AND status='active' AND (account_type='business' OR account_type IS NULL) FOR UPDATE",[address]);
    if(user.rowCount!==1)throw new Error('Active registered account required');
    if(action==='grant')await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET reason=$2,granted_at=now()",[user.rows[0].id,reason]);
    else await db.query('DELETE FROM platform_admin_grants WHERE user_id=$1',[user.rows[0].id]);
    await db.query('DELETE FROM sessions WHERE user_id=$1',[user.rows[0].id]);
    await audit(db,{action:`platform.admin_${action}`,target:user.rows[0].id,metadata:{reason,operatorEvent:randomUUID()}});
  });console.log('Platform grant updated. Existing account sessions revoked.');
} catch {console.error('Operator action failed. Confirm stdin format, existing account and database configuration.');process.exitCode=1;}
finally {await pool.end();}
