import {HttpError} from '../errors.js';

// These are decisions over the existing lifecycle/review models, not new states.
export const reviewActions=Object.freeze({approve:'platform.onboarding.review',reject:'platform.onboarding.review',request_changes:'platform.onboarding.review',suspend:'platform.lifecycle.manage',reactivate:'platform.lifecycle.manage',approve_marketplace:'platform.marketplace.review',reject_marketplace:'platform.marketplace.review',return_marketplace:'platform.marketplace.review',publish:'platform.marketplace.review',unpublish:'platform.marketplace.review'});
export const reviewQueues=Object.freeze({
 onboarding:"c.lifecycle='pending_review'",
 approved:"c.lifecycle='active'",
 returned:"EXISTS(SELECT 1 FROM audit_events review WHERE review.company_id=c.id AND review.action='company.review_decision' AND review.metadata->>'decision' IN ('reject','request_changes','reject_marketplace','return_marketplace') AND review.metadata->>'revision'=c.revision::text) OR (c.lifecycle='onboarding' AND EXISTS(SELECT 1 FROM company_reviews review WHERE review.company_id=c.id AND review.kind='lifecycle' AND review.previous_state='pending_review' AND review.new_state='onboarding')) OR c.marketplace_status IN ('rejected','withdrawn')",
 marketplace:"c.marketplace_status='pending'",
 published:'c.storefront_published'
});
export const reasonRequired=action=>['reject','request_changes','suspend','reject_marketplace','return_marketplace','unpublish'].includes(action);
export const independentReview=action=>['approve','reactivate','approve_marketplace','publish'].includes(action);

export function reviewTransition(c,action){
 if(!Object.hasOwn(reviewActions,action))throw new HttpError(400,'BAD_INPUT','Choose a supported review decision.');
 let lifecycle=c.lifecycle,market=c.marketplace_status,published=c.storefront_published,suspendedFrom=c.suspended_from;
 let kind='lifecycle',previous=c.lifecycle,next;
 const invalid=()=>new HttpError(409,'INVALID_TRANSITION','This review action is not permitted from the current company state.');
 if(action==='approve'){if(lifecycle!=='pending_review')throw invalid();lifecycle='active';published=false;}
 else if(['reject','request_changes'].includes(action)){if(lifecycle!=='pending_review')throw invalid();lifecycle='onboarding';published=false;}
 else if(action==='suspend'){if(lifecycle==='suspended')throw invalid();suspendedFrom=lifecycle;lifecycle='suspended';published=false;}
 else if(action==='reactivate'){if(lifecycle!=='suspended'||!suspendedFrom)throw invalid();lifecycle=suspendedFrom;suspendedFrom=null;published=false;}
 else{
  kind='marketplace';previous=market;
  if(action==='approve_marketplace'){if(lifecycle!=='active'||market!=='pending')throw invalid();market='approved';published=false;}
  else if(['reject_marketplace','return_marketplace'].includes(action)){if(market!=='pending')throw invalid();market=action==='return_marketplace'?'withdrawn':'rejected';published=false;}
  else if(action==='publish'){if(lifecycle!=='active'||c.status!=='active'||market!=='approved'||published)throw invalid();published=true;previous='unpublished';next='published';}
  else if(action==='unpublish'){if(!published)throw invalid();published=false;previous='published';next='unpublished';}
 }
 next ||= kind==='lifecycle'?lifecycle:market;
 return {lifecycle,market,published,suspendedFrom,kind,previous,next};
}
