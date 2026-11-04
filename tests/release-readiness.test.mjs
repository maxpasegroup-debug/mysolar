import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesMigrationManifest} from '../server/db/readiness.js';

test('readiness requires exact migration history and rejects unsafe older/newer release combinations',()=>{
 const expected=[{name:'001',checksum:'one'},{name:'002',checksum:'two'}];
 assert.equal(matchesMigrationManifest(expected,[...expected].reverse()),true);
 assert.equal(matchesMigrationManifest(expected,expected.slice(0,1)),false);
 assert.equal(matchesMigrationManifest(expected,[...expected,{name:'003',checksum:'three'}]),false);
 assert.equal(matchesMigrationManifest(expected,[expected[0],{name:'002',checksum:'changed'}]),false);
 assert.equal(matchesMigrationManifest(expected,[expected[0],expected[0]]),false);
});
