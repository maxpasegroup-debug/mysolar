import { badInput } from './errors.js';
export function body(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) throw badInput();
  return value;
}
export function text(value, name, max = 100, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw badInput(`Enter a valid ${name}.`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'email address', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw badInput('Enter a valid email address.');
  return result;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || Buffer.byteLength(value) > 512) throw badInput('Use a password between 12 and 128 characters.');
  return value;
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw badInput('Invalid record reference.');
  return value;
}
export function choice(value, choices, label) {
  if (!choices.includes(value)) throw badInput(`Choose a valid ${label}.`);
  return value;
}
export function phone(value) {
  if (value === '') return '';
  const result = text(value, 'phone number', 24);
  const digits=result.replace(/\D/g,'');
  if (!/^\+?[\d ()-]{7,24}$/.test(result)||digits.length<7||digits.length>15) throw badInput('Enter a valid phone number.');
  return result;
}
export function description(value) {
  if (typeof value !== 'string' || value.trim().length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw badInput('Enter a valid description of up to 500 characters.');
  return value.trim();
}
