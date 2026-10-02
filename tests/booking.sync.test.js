import {afterAll,beforeEach,describe,it,expect,mock} from "bun:test";
const originalOwnerEmails=process.env.OWNER_NOTIFICATION_EMAILS;
process.env.OWNER_NOTIFICATION_EMAILS="owner@example.com";
let record,notificationFails=false,emailNotifications=[];
const packages={p1:{id:"p1",title:"Thai",price:"300.00",isActive:true},p2:{id:"p2",title:"Aroma",price:"650.00",isActive:true}};
const branch={id:"b1",name:"Branch",isActive:true};
const voucher={id:"v1",discount:"100.00",isExpired:false};
mock.module("../models/index",()=>({
 User:{findByPk:async()=>({id:"u1",displayName:"Guest"})},
 Package:{findByPk:async id=>packages[id] || null}, Branch:{findByPk:async id=>id==="b1"?branch:null}, Voucher:{findByPk:async id=>id==="v1"?voucher:null},
 UserStaff:{findAll:async()=>[{email:"owner@example.com"}]},
 Booking:{create:async data=>{record={id:"booking1",status:"pending",...data,update:async function(values){Object.assign(this,values)},save:async()=>{}};return record},findByPk:async()=>record,findAll:async()=>record?[record]:[]}
}));
mock.module("../utils/sendNotifications",()=>({sendUserNotification:async()=>{if(notificationFails)throw Error("Notification unavailable")},sendEmailNotification:async(...args)=>{emailNotifications.push(args)}}));
const customer=await import("../services/userbooking.services");const admin=await import("../services/booking.services");
afterAll(()=>{if(originalOwnerEmails===undefined)delete process.env.OWNER_NOTIFICATION_EMAILS;else process.env.OWNER_NOTIFICATION_EMAILS=originalOwnerEmails;});
const tomorrow=()=>new Date(Date.now()+86400000).toISOString();
function response(){return {code:200,body:null,status(code){this.code=code;return this},json(body){this.body=body;return this},send(){return this}};}
async function call(fn,body={},params={}){const res=response();const requestBody=fn===customer.createBooking?{customerEmail:"guest@example.com",...body}:body;await fn({body:requestBody,params,query:{},user:{id:"u1",displayName:"Guest"}},res);return res;}
beforeEach(()=>{record=null;notificationFails=false;emailNotifications=[];packages.p1.isActive=true;branch.isActive=true;voucher.isExpired=false;voucher.discount="100.00";});
describe("customer/admin booking synchronization",()=>{
 it("requires a valid customer email and stores notification details",async()=>{
  for(const customerEmail of ["", "not-an-email"]){const invalid=await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow(),customerEmail});expect(invalid.code).toBe(400);expect(record).toBeNull();}
  const created=await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow(),customerEmail:"  Guest@Example.com ",customerName:" Guest Name ",numberOfGuests:2});
  expect(created.code).toBe(201);expect(record).toMatchObject({customerEmail:"guest@example.com",customerName:"Guest Name",numberOfGuests:2,source:"website"});
  expect(emailNotifications).toHaveLength(2);expect(emailNotifications[0][2]).toEqual(["owner@example.com"]);expect(emailNotifications[1][2]).toEqual(["guest@example.com"]);
  expect(emailNotifications[0][1]).toContain("Persons: 2");expect(emailNotifications[1][1]).toContain("Thai");
 });
 it("uses the same persisted price and status across customer/admin updates",async()=>{
  const created=await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()});expect(created.code).toBe(201);
  const changed=await call(admin.updateBooking,{userId:"u1",branchId:"b1",packageId:"p2",date:record.date,status:"confirmed"},{id:record.id});expect(changed.code).toBe(200);expect(record.totalPrice).toBe(650);
  const customerList=await call(customer.getAllBooking);expect(customerList.body[0].totalPrice).toBe(changed.body.totalPrice);expect(customerList.body[0].status).toBe("confirmed");
  const cancelled=await call(customer.updateBooking,{branchId:"b1",packageId:"p2",date:record.date,status:"cancelled"},{id:record.id});expect(cancelled.code).toBe(200);expect(record.status).toBe("cancelled");
  const adminList=await call(admin.getAllBooking);expect(adminList.body[0].status).toBe("cancelled");
 });
 it("does not report a saved booking as failed when notifications fail",async()=>{notificationFails=true;const res=await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()});expect(res.code).toBe(201);expect(res.body.booking.id).toBe(record.id);});
 it("keeps admin cancellations successful if notifications fail",async()=>{await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()});notificationFails=true;const res=await call(admin.deleteBooking,{}, {id:record.id});expect(res.code).toBe(204);expect(record.status).toBe("cancelled");});
 it("rejects expired vouchers for both customer and admin",async()=>{voucher.isExpired=true;for(const fn of [customer.createBooking,admin.createBooking]){const res=await call(fn,{userId:"u1",branchId:"b1",packageId:"p1",voucherId:"v1",date:tomorrow()});expect(res.code).toBe(400);}expect(record).toBeNull();});
 it("clamps voucher discounts to zero instead of a negative bill",async()=>{voucher.discount="999";const res=await call(customer.createBooking,{branchId:"b1",packageId:"p1",voucherId:"v1",date:tomorrow()});expect(res.code).toBe(201);expect(record.totalPrice).toBe(0);});
 it("rejects inactive inventory and invalid or past dates",async()=>{packages.p1.isActive=false;expect((await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()})).code).toBe(400);packages.p1.isActive=true;branch.isActive=false;expect((await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()})).code).toBe(400);branch.isActive=true;for(const date of ["invalid","2000-01-01"])expect((await call(customer.createBooking,{branchId:"b1",packageId:"p1",date})).code).toBe(400);expect(record).toBeNull();});
 it("cannot cancel or reopen completed bookings",async()=>{await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()});record.status="completed";expect((await call(customer.deleteBooking,{}, {id:record.id})).code).toBe(400);expect((await call(customer.updateBooking,{branchId:"b1",packageId:"p1",date:record.date,status:"pending"},{id:record.id})).code).toBe(400);expect(record.status).toBe("completed");});
 it("preserves historical price for status-only updates after catalog price changes",async()=>{await call(customer.createBooking,{branchId:"b1",packageId:"p1",date:tomorrow()});packages.p1.price="999.00";const res=await call(admin.updateBooking,{userId:"u1",branchId:"b1",packageId:"p1",date:record.date,status:"completed"},{id:record.id});expect(res.code).toBe(200);expect(record.totalPrice).toBe(300);packages.p1.price="300.00";});
});
