import {HttpError} from './errors.js';
// Future adapters must validate approved templates/recipient consent, provide
// idempotency keys and verify signed delivery events. No credentials or provider
// are configured here, and browser callbacks cannot establish delivery.
export class UnconfiguredMessageChannel{constructor(channel){this.channel=channel;this.configured=false;}async send(){throw new HttpError(503,'CHANNEL_UNAVAILABLE',this.channel+' delivery is not configured. No message was sent.');}async verifyDeliveryEvent(){throw new HttpError(503,'CHANNEL_UNAVAILABLE','No delivery event was accepted.');}}
export const whatsappChannel=Object.freeze(new UnconfiguredMessageChannel('WhatsApp'));
export const smsChannel=Object.freeze(new UnconfiguredMessageChannel('SMS'));
