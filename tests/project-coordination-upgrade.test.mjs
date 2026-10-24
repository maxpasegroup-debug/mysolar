import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {migrationManifest} from '../server/db/migrations.js';
test('coordination upgrade preserves existing stages and enforces composite tenant constraints',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,applyMigrations}=await isolatedApp(t);await applyMigrations(db,{through:'023_people_sales_controls.sql'});
 const user=randomUUID(),company=randomUUID(),foreign=randomUUID(),contact=randomUUID(),project=randomUUID(),task=randomUUID();
 await db.query("INSERT INTO users(id,email,display_name,password_hash) VALUES($1,'coordination-upgrade@example.invalid','[TEST] Owner','NOT-A-LOGIN-HASH')",[user]);
 for(const id of [company,foreign]){await db.query("INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,'[TEST] Company','[TEST] City','test@example.invalid',$2)",[id,user]);await db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES($1,$2,$3,'owner')",[randomUUID(),id,user]);}
 await db.query("INSERT INTO company_contacts(id,company_id,name,kind) VALUES($1,$2,'[TEST] Customer','individual')",[contact,company]);
 await db.query("INSERT INTO installation_projects(id,company_id,contact_id,reference,name,location,scope,manager_id) VALUES($1,$2,$3,'TEST-UPGRADE','[TEST] Project','','[TEST] scope',$4)",[project,company,contact,user]);
 for(const code of ['survey','design','materials','schedule','installation','inspection','commissioning','handover'])await db.query("INSERT INTO project_milestones(project_id,company_id,code,status,notes,evidence_reference,updated_by,updated_at) VALUES($1,$2,$3,'done','[TEST] historical notes','[TEST] historical evidence',$4,'2026-01-01T00:00:00Z')",[project,company,code,user]);
 await db.query("INSERT INTO business_tasks(id,company_id,title,priority,assignee_id,project_id,status,completion_notes) VALUES($1,$2,'[TEST] historical task','normal',$3,$4,'completed','[TEST] preserved notes')",[task,company,user,project]);
 const applied=[];await applyMigrations(db,{onApplied:name=>applied.push(name)});assert.deepEqual(applied,(await migrationManifest()).filter(m=>m.name>'023_people_sales_controls.sql').map(m=>m.name));
 const stages=(await db.query('SELECT * FROM project_milestones WHERE project_id=$1 ORDER BY position',[project])).rows;assert.equal(stages.length,8);assert.deepEqual(stages.map(s=>s.position),[10,20,30,40,50,60,70,80]);for(const s of stages){assert.equal(s.notes,'[TEST] historical notes');assert.equal(s.evidence_reference,'[TEST] historical evidence');assert.equal(s.status,'done');assert.equal(s.completed_at.toISOString(),'2026-01-01T00:00:00.000Z');assert.equal(s.customer_visible,true);}
 assert.equal(stages.find(s=>s.code==='inspection').evidence_required,true);assert.equal(stages.find(s=>s.code==='inspection').field_editable,false);
 await assert.rejects(db.query("INSERT INTO project_milestones(project_id,company_id,code,title,position) VALUES($1,$2,'duplicate_order','[TEST]',10)",[project,company]),{code:'23505'});
 await assert.rejects(db.query("UPDATE project_milestones SET start_date='2026-01-02',due_date='2026-01-01' WHERE project_id=$1 AND code='survey'",[project]),{code:'23514'});
 await assert.rejects(db.query('INSERT INTO task_dependencies(company_id,task_id,depends_on_id,created_by) VALUES($1,$2,$2,$3)',[company,task,user]),{code:'23514'});
 await assert.rejects(db.query("INSERT INTO task_checklist(id,company_id,task_id,label) VALUES($1,$2,$3,'[TEST] foreign task')",[randomUUID(),foreign,task]),{code:'23503'});
 assert.equal((await db.query('SELECT completion_notes FROM business_tasks WHERE id=$1',[task])).rows[0].completion_notes,'[TEST] preserved notes');
 const manifest=await migrationManifest(),rows=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;assert.deepEqual(rows,manifest.map(m=>({name:m.name,checksum:m.checksum})));const again=[];await applyMigrations(db,{onApplied:name=>again.push(name)});assert.deepEqual(again,[]);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname=current_schema() AND indexname=ANY($1::text[])",[['task_dependency_reverse','task_checklist_record','project_open_tasks','stage_employee_work']])).rows[0].n,4);
});
