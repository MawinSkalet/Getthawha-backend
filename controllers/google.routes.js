import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import {randomBytes,createHash,createPublicKey} from "crypto";
import {User} from "../models/index";
import {safeReturnPath,frontendUrl,authCookieOptions,loginFailure} from "../services/oauth.helpers";
import {googleConfigErrors} from "../services/google.config";
const router=express.Router();
const configured=()=>googleConfigErrors().length === 0;
router.get("/authentication",(req,res)=>{
  const next=safeReturnPath(req.query.next);
  if(!configured()) return loginFailure(res,"not_configured",next);
  const state=randomBytes(32).toString("hex"),nonce=randomBytes(32).toString("hex"),verifier=randomBytes(32).toString("base64url");
  const session=jwt.sign({state,nonce,verifier,next},process.env.JWT_SECRET,{expiresIn:"10m",audience:"google-oauth",issuer:"getthawha"});
  const {domain: _domain, ...stateCookie} = authCookieOptions();
  res.cookie("googleOAuth",session,{...stateCookie,maxAge:600000});
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:process.env.GOOGLE_REDIRECT_URI,response_type:"code",scope:"openid profile email",state,nonce,code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256"}).toString();
  return res.redirect(url.toString());
});
router.get("/authorization",async(req,res)=>{
  let next="/booking";
  try {
    const session=jwt.verify(req.cookies.googleOAuth || "",process.env.JWT_SECRET,{algorithms:["HS256"],audience:"google-oauth",issuer:"getthawha"});
    next=safeReturnPath(session.next);
    res.clearCookie("googleOAuth",{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV === "production",path:"/"});
    if(req.query.state !== session.state || typeof req.query.code !== "string" || req.query.error) return loginFailure(res,"failed",next);
    const token=await axios.post("https://oauth2.googleapis.com/token",new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:process.env.GOOGLE_REDIRECT_URI,code:req.query.code,code_verifier:session.verifier,grant_type:"authorization_code"}).toString(),{headers:{"Content-Type":"application/x-www-form-urlencoded"},timeout:10000});
    const decoded=jwt.decode(token.data.id_token,{complete:true});
    if(!decoded || decoded.header.alg !== "RS256") throw new Error("Invalid token");
    const keys=await axios.get("https://www.googleapis.com/oauth2/v3/certs",{timeout:10000});
    const jwk=keys.data.keys.find(key=>key.kid===decoded.header.kid && key.kty==="RSA");
    if(!jwk) throw new Error("Unknown signing key");
    const claims=jwt.verify(token.data.id_token,createPublicKey({key:jwk,format:"jwk"}),{algorithms:["RS256"],audience:process.env.GOOGLE_CLIENT_ID,issuer:["https://accounts.google.com","accounts.google.com"]});
    if(claims.nonce!==session.nonce || typeof claims.exp!=="number" || (claims.azp && claims.azp!==process.env.GOOGLE_CLIENT_ID) || typeof claims.sub!=="string" || !claims.sub) throw new Error("Invalid identity");
    const id="google:"+claims.sub;
    let user=await User.findByPk(id);
    if(!user){
      let name=String(claims.name || "Google Guest").slice(0,180);
      if(await User.findOne({where:{displayName:name}})) name += " · " + claims.sub;
      user=await User.create({id,displayName:name,pictureUrl:claims.picture || null});
    }
    const info=jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:"1h"});
    return res.cookie("info",info,{...authCookieOptions(),maxAge:3600000}).redirect(frontendUrl(next));
  } catch {
    res.clearCookie("googleOAuth",authCookieOptions());
    return loginFailure(res,"failed",next);
  }
});
export default router;
