import test from 'node:test';
import assert from 'node:assert/strict';
import {errorHandler} from '../server/errors.js';

test('missing schema returns a safe setup error and fixed diagnostic category',()=>{
 const logs=[],original=console.error;let status,body;
 console.error=value=>logs.push(JSON.parse(value));
 try{
  const res={headersSent:false,status(value){status=value;return this;},json(value){body=value;}};
  errorHandler(Object.assign(new Error('private SQL and password must not escape'),{code:'42P01'}),{requestId:'review-request'},res,()=>{});
  assert.equal(status,503);assert.equal(body.error.code,'SERVICE_NOT_READY');
  assert.equal(logs[0].cause,'DATABASE_SCHEMA_MISSING');assert.equal(body.error.requestId,'review-request');
  assert.doesNotMatch(JSON.stringify({logs,body}),/private SQL|password|SELECT/);
 }finally{console.error=original;}
});
