import {it,expect,mock} from "bun:test";
const review={id:"r1",branchId:"b1",userId:"u1",rating:5,isApproved:false,update:async function(value){Object.assign(this,value)}};
mock.module("../models/index",()=>({User:{},Branch:{findByPk:async()=>({id:"b1"})},Booking:{},Review:{findByPk:async()=>review,findAll:async({where})=>Object.entries(where).every(([key,value])=>review[key]===value)?[review]:[]}}));
const {updateReviewApproval,getTestimonials,getBranchReviews}=await import("../services/review.services");
const res=()=>({code:200,body:null,status(code){this.code=code;return this},json(body){this.body=body;return this}});
it("publishes and hides the same review in both public review feeds",async()=>{
 for(const approved of [true,false]){
  const changed=res();await updateReviewApproval({params:{id:"r1"},body:{isApproved:approved}},changed);expect(changed.code).toBe(200);
  const home=res();await getTestimonials({},home);expect(home.body.length).toBe(approved?1:0);
  const branch=res();await getBranchReviews({params:{branchId:"b1"}},branch);expect(branch.body.length).toBe(approved?1:0);
 }
});
