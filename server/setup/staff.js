import * as v from '../validation.js';
import {PART_TIME_ROLE} from '../commercial/growth.js';
import {badInput} from '../errors.js';
export function staffDetails(value,role) {
 if(value===undefined)return {};
 v.body(value,['name','phone','state','city','territory'],[]);
 if(role!==PART_TIME_ROLE&&Object.values(value).some(Boolean))throw badInput('Staff details are only supported for part-time sales invitations.');
 return {name:v.text(value.name??'','name',100,0),phone:v.phone(value.phone??''),state:v.text(value.state??'','state',100,0),city:v.text(value.city??'','city',100,0),territory:v.text(value.territory??'','territory',200,0),employmentType:role===PART_TIME_ROLE?'part_time':'standard'};
}
