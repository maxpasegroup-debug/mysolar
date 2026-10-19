import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes){let bits=0,value=0,text='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){text+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)text+=alphabet[(value<<(5-bits))&31];return text;}
export function decode32(text){let bits=0,value=0,bytes=[];for(const char of text){const n=alphabet.indexOf(char);if(n<0)throw Error('Invalid secret');value=(value<<5)|n;bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(bytes);}
export const newSecret=()=>base32(randomBytes(20));
export function otp(secret,counter,digits=6){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=createHmac('sha1',decode32(secret)).update(b).digest(),o=h[19]&15;return ((h.readUInt32BE(o)&0x7fffffff)%10**digits).toString().padStart(digits,'0');}
export function checkOtp(secret,code,last=-1,now=Date.now()){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const counter=Math.floor(now/30000);for(let d=-1;d<=1;d++){const n=counter+d;if(n>Number(last)&&n>=0&&timingSafeEqual(Buffer.from(otp(secret,n)),Buffer.from(code)))return n;}return null;}
