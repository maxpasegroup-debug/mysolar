import {HttpError} from '../errors.js';
import * as v from '../validation.js';
export const accountType=value=>v.choice(value,['customer','business'],'customer or business account');
export const effectiveTypeSQL=alias=>`coalesce(${alias}.account_type,CASE WHEN EXISTS(SELECT 1 FROM company_memberships m WHERE m.user_id=${alias}.id) OR EXISTS(SELECT 1 FROM companies c WHERE c.created_by=${alias}.id) OR EXISTS(SELECT 1 FROM platform_admin_grants g WHERE g.user_id=${alias}.id) THEN 'business' ELSE 'customer' END)`;
export function requireBusiness(user){if(user.account_type!=='business')throw new HttpError(403,'BUSINESS_ACCOUNT_REQUIRED','Use a separate business account. Your customer account cannot create or join a company. Use a different email address for your business account.');}
export function requireCustomer(user){if(user.account_type==='business')throw new HttpError(404,'NOT_FOUND','Use your separate customer account to open customer records.');}
