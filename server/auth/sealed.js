import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {config} from '../config.js';
const key=()=>{if(!config.dataEncryptionKey)throw Error('DATA_ENCRYPTION_KEY is not configured');return Buffer.from(config.dataEncryptionKey,'hex');};
export function seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
export function unseal(value){const raw=Buffer.from(value,'base64url');if(raw.length<29)throw Error('Invalid sealed payload');const decipher=createDecipheriv('aes-256-gcm',key(),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'));}
