import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {unitEnvironment} from '../tests/helpers/env.mjs';

// Deliberately fixed allowlist: no integration/database test glob and no .env
// loading. This runner never starts workers, provisions a database or migrates.
unitEnvironment();delete process.env.TEST_DATABASE_URL;delete process.env.RESTORE_DATABASE_URL;
const names=['security','config','money','errors','journey','provider','domain-foundation','mail-config','mail-failure-codes','monitor-probes','customer-dashboard','customer-locale','customer-record-export','finance-csv','pilot-snapshot','pwa','quotation-source-compatibility','solar-os-ui','workspace-ui','company-location','boss-dashboard','master-completion','sia-company-setup','business-subscription','commercial'];
const specs=names.map(name=>fileURLToPath(new URL('../tests/'+name+'.test.mjs',import.meta.url)));
console.log('Safe local check: '+specs.length+' unit/in-memory specifications. No database integration or external delivery.');
const result=spawnSync(process.execPath,['--test',...specs],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env},stdio:'inherit',windowsHide:true});
if(result.error)console.error('Unit process could not start.');process.exitCode=result.status??1;
