import { HttpError } from '../errors.js';
// Future provider adapter boundary only. No route accepts browser payment proof.
export function createPaymentSession(){throw new HttpError(503,'BILLING_DISABLED','Online billing is not enabled. No payment session was created.');}
export function applyVerifiedProviderEvent(){throw new HttpError(503,'BILLING_DISABLED','Payment-event processing is not implemented. No subscription was changed.');}
