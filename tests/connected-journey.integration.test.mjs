import test from 'node:test';
import {connectedFixture} from './helpers/connected-fixture.mjs';
import {connectedJourney} from './helpers/connected-journey.mjs';
test('connected customer journey in isolated PostgreSQL',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{await connectedJourney(t,await connectedFixture(t));});
