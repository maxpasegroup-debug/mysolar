import { HttpError } from '../errors.js';
// The existing boundary is now used by the guarded Razorpay routes. A bare call
// remains disabled. Provider credentials/owner consent and raw webhook validation
// belong to those authenticated routes, never a browser success callback.
export function createPaymentSession(context){
 if(!context?.provider||!context?.contract||!context?.mapping)throw new HttpError(503,'BILLING_DISABLED','Online billing is not enabled. No payment session was created.');
 return import('./os-billing.js').then(m=>m.createProviderContract(context.provider,context.contract,context.mapping));
}
export function applyVerifiedProviderEvent(context){
 if(!context?.db||!context?.contract||!context?.event||!context?.providerSubscription||!context?.eventId||!context?.hash)throw new HttpError(503,'BILLING_DISABLED','No validated provider event was supplied. No subscription was changed.');
 return import('./os-billing.js').then(m=>m.processBillingEvent(context));
}
