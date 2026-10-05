import {afterAll,describe,it,expect,mock} from "bun:test";
import express from "express";
import cookieParser from "cookie-parser";
import {mkdtempSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {googleConfigErrors} from "../services/google.config";
mock.module("../models/index",()=>({User:{}}));
const {default:googleRouter}=await import("../controllers/google.routes");
const {default:lineRouter}=await import("../controllers/line.routes");
const saved={...process.env};
Object.assign(process.env,{NODE_ENV:"production",COOKIE_DOMAIN:".example.com",JWT_SECRET:"test-only-long-secret-for-regression",FRONTEND_ORIGIN:"https://www.example.com"});
const app=express();app.use(cookieParser());app.use("/google",googleRouter);app.use("/line",lineRouter);
const server=app.listen(0,"127.0.0.1");
await new Promise(resolve=>server.on("listening",resolve));
const base="http://127.0.0.1:"+server.address().port;
afterAll(()=>{server.close();for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);});
describe("OAuth regressions",()=>{
 it("clears the host-only Google transaction cookie on an invalid callback",async()=>{
  const res=await fetch(base+"/google/authorization?code=bad&state=bad",{redirect:"manual",headers:{Cookie:"googleOAuth=invalid"}});
  expect(res.status).toBe(302);expect(res.headers.get("location")).toContain("error=failed");
  expect(res.headers.get("set-cookie")).toContain("googleOAuth=");expect(res.headers.get("set-cookie")).not.toContain("Domain=");
 });
 it("rejects an unrelated cookie domain even when frontend/API share a host",()=>{
  const env={NODE_ENV:"production",GOOGLE_CLIENT_ID:"test",GOOGLE_CLIENT_SECRET:"test",GOOGLE_REDIRECT_URI:"https://www.example.com/google/authorization",FRONTEND_ORIGIN:"https://www.example.com",JWT_SECRET:"test-only-long-secret-for-regression",COOKIE_DOMAIN:".wrong.example"};
  expect(googleConfigErrors(env).length).toBeGreaterThan(0);
 });
 it("checks the explicit env file instead of inherited valid credentials",()=>{
  const dir=mkdtempSync(join(tmpdir(),"oauth-regression-"));const file=join(dir,"missing.env");
  writeFileSync(file,"NODE_ENV=dev\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n");
  const script=join(import.meta.dir,"../scripts/check-google-oauth.js");
  const result=spawnSync(process.execPath,[script,file],{encoding:"utf8",env:{...process.env,NODE_ENV:"dev",GOOGLE_CLIENT_ID:"test",GOOGLE_CLIENT_SECRET:"test",GOOGLE_REDIRECT_URI:"http://localhost:8000/google/authorization",FRONTEND_ORIGIN:"http://localhost:3000",COOKIE_DOMAIN:"",JWT_SECRET:"test"}});
  expect(result.status).toBe(1);expect(result.stderr).toContain("GOOGLE_CLIENT_ID is missing");
 });
 it("returns LINE cancellation to the login page and preserves the booking",async()=>{
  const res=await fetch(base+"/line/authorization?error=access_denied&state=state",{redirect:"manual",headers:{Cookie:"lineState=state; loginReturn=%2Fbooking%3FpackageId%3Dtest"}});
  expect(res.status).toBe(302);const target=new URL(res.headers.get("location"));expect(target.pathname).toBe("/login");expect(target.searchParams.get("next")).toBe("/booking?packageId=test");
 });
});
