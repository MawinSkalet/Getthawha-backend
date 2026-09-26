import {describe,it,expect} from "bun:test";
import {googleConfigErrors,devLoginAllowed} from "../services/google.config";
const local={NODE_ENV:"dev",GOOGLE_CLIENT_ID:"test.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"test-only",GOOGLE_REDIRECT_URI:"http://localhost:8000/google/authorization",FRONTEND_ORIGIN:"http://localhost:3000",JWT_SECRET:"test"};
const production={...local,NODE_ENV:"production",GOOGLE_REDIRECT_URI:"https://api.example.com/google/authorization",FRONTEND_ORIGIN:"https://www.example.com",COOKIE_DOMAIN:".example.com",JWT_SECRET:"test-only-long-secret-not-for-deployment"};
describe("Google OAuth environment configuration",()=>{
 it("accepts localhost without cookie domain",()=>expect(googleConfigErrors(local)).toEqual([]));
 it("reports missing credentials without exposing values",()=>expect(googleConfigErrors({...local,GOOGLE_CLIENT_SECRET:""})).toContain("GOOGLE_CLIENT_SECRET is missing"));
 it("accepts HTTPS production frontend/API sharing a cookie domain",()=>expect(googleConfigErrors(production)).toEqual([]));
 it("rejects localhost in production",()=>expect(googleConfigErrors({...local,NODE_ENV:"production"}).length).toBeGreaterThan(0));
 it("rejects short production session secrets",()=>expect(googleConfigErrors({...production,JWT_SECRET:"short"}).length).toBeGreaterThan(0));
 it("rejects HTTP production redirects",()=>expect(googleConfigErrors({...production,GOOGLE_REDIRECT_URI:"http://api.example.com/google/authorization"}).length).toBeGreaterThan(0));
 it("requires matching frontend and API cookie scope",()=>{for(const domain of ["", ".other.example", "com"]) expect(googleConfigErrors({...production,COOKIE_DOMAIN:domain}).length).toBeGreaterThan(0);});
 it("rejects wrong callback paths and extra query strings",()=>{for(const uri of ["http://localhost:8000/booking","http://localhost:8000/google/authorization?x=1"]) expect(googleConfigErrors({...local,GOOGLE_REDIRECT_URI:uri}).length).toBeGreaterThan(0);});
 it("does not allow development sign-in outside explicit development environments",()=>{for(const NODE_ENV of ["production","staging","",undefined])expect(devLoginAllowed({NODE_ENV})).toBe(false);expect(devLoginAllowed({NODE_ENV:"dev"})).toBe(true);});
});
