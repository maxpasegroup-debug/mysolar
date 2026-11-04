import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('reusable SIA orb has bounded accessible states, safe labels and no external execution',()=>{
 const context={window:{},document:{addEventListener(){}}};vm.runInNewContext(readFileSync('src/sia-orb.js','utf8'),context);const orb=context.window.SiaOrb;
 for(const state of ['idle','guiding','working','success','error'])assert.match(orb.markup({state}),new RegExp('data-state="'+state+'"'));assert.match(orb.markup({state:'unsafe',label:'<script>'}),/data-state="idle"/);assert.match(orb.markup({label:'<script>'}),/&lt;script&gt;/);assert.match(orb.control(),/aria-pressed="false"/);
 const css=readFileSync('sia-orb.css','utf8');assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation:none!important/);assert.doesNotMatch(readFileSync('src/sia-orb.js','utf8'),/getUserMedia|speechSynthesis|fetch\(/);
});
test('motion interaction updates only buttons and never rewrites the document root',()=>{
 let click;const button={textContent:'',setAttribute(key,value){this[key]=value;}};const root={dataset:{}};
 const context={window:{},document:{documentElement:root,addEventListener(type,handler){if(type==='click')click=handler;},querySelectorAll(selector){assert.equal(selector,'button[data-sia-motion]');return [button];}}};vm.runInNewContext(readFileSync('src/sia-orb.js','utf8'),context);
 const event={target:{closest(selector){assert.equal(selector,'button[data-sia-motion]');return button;}}};click(event);assert.equal(root.dataset.siaMotion,'paused');assert.equal(button['aria-pressed'],'true');assert.equal(root.textContent,undefined);click(event);assert.equal(root.dataset.siaMotion,'on');assert.equal(button['aria-pressed'],'false');
});
