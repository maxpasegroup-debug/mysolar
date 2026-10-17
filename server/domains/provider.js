import {HttpError} from '../errors.js';

/**
 * Future adapter contract: each method accepts {assignment, operationId, expectedRevision}.
 * assignment is server-loaded; it is not a browser-supplied origin, tenant or provider ID.
 * requestHostname/getStatus/reconcile return allowlisted provider evidence:
 * {providerId, hostnameId, hostname, hostnameStatus, certificateStatus, checkedAt}.
 * getOwnershipInstructions returns bounded DNS instructions from the provider, separately
 * from our local TXT proof. No request result alone implies activation or valid HTTPS.
 * activate/suspend/remove return observed evidence and are idempotent by operationId.
 * Implementations need finite timeouts, safe error codes, retries and output validation.
 * A worker must recheck assignment revision, company authority and entitlement before calls.
 * This module deliberately contains no live adapter, credentials, HTTP client or success mock.
 */
export const providerMethods=Object.freeze(['requestHostname','getOwnershipInstructions','getStatus','activate','suspend','remove','reconcile']);
export class UnconfiguredDomainProvider {
 constructor(){this.id='unconfigured';this.configured=false;}
 async requestHostname(){return this.unavailable();}
 async getOwnershipInstructions(){return this.unavailable();}
 async getStatus(){return this.unavailable();}
 async activate(){return this.unavailable();}
 async suspend(){return this.unavailable();}
 async remove(){return this.unavailable();}
 async reconcile(){return this.unavailable();}
 unavailable(){throw new HttpError(503,'DOMAIN_PROVIDER_UNAVAILABLE','Domain provider integration is not configured. No DNS, hostname or certificate operation was performed.');}
}
export const domainProvider=Object.freeze(new UnconfiguredDomainProvider());
