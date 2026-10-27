import {badInput} from '../errors.js';

// Presentation/setup profiles only. Never use a preset to authorize an action.
export const businessPresets=Object.freeze({
 distributor:'distributor', dealer:'distributor', installer:'installer', both:'both'
});
export function resolveBusinessPreset(type='distributor',preset){
 if(!['distributor','installer','both'].includes(type))throw badInput('Choose a supported business type.');
 if(preset===undefined)return {businessType:type,businessPreset:type};
 if(!Object.hasOwn(businessPresets,preset)||businessPresets[preset]!==type)throw badInput('Choose a preset matching your business type.');
 return {businessType:type,businessPreset:preset};
}
