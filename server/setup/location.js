import '../../src/india-geography.js';
import {badInput} from '../errors.js';
import {text} from '../validation.js';

// Country is explicit in new forms. Legacy clients retain their existing path.
// India is the only supported onboarding country, so no new tenant/schema field
// or guessed country backfill is needed. Districts may be newly formed/renamed.
export function companyLocation(input){
 if(input.countryCode===undefined)return null;
 if(input.countryCode!=='IN')throw badInput('Company onboarding currently supports India.');
 const state=text(input.state,'state',100),district=text(input.district,'district',100);
 if(!Object.hasOwn(globalThis.IndiaGeography,state))throw badInput('Choose a valid Indian state or Union territory.');
 if(/[<>]/.test(district))throw badInput('Use plain text for district.');
 return {state,district};
}
