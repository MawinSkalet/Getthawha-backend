import {describe,it,expect} from "bun:test";
import {safeReturnPath,frontendUrl} from "../services/oauth.helpers";
describe("booking login return URLs",()=>{
 it("preserves a selected package and branch",()=>expect(safeReturnPath("/booking?packageId=a&branchId=b")).toBe("/booking?packageId=a&branchId=b"));
 it("allows the protected profile page",()=>expect(safeReturnPath("/profile")).toBe("/profile"));
 it("rejects external, malformed and unrelated destinations",()=>{
  for(const value of ["https://evil.example", "//evil.example", "/booking/../../evil", "/booking\\evil", "/profile-other", "\r\nhttps://evil.example", ["/booking"], null]) expect(safeReturnPath(value)).toBe("/booking");
 });
 it("always redirects to the configured client origin",()=>{
  expect(new URL(frontendUrl(safeReturnPath("//evil.example"))).origin).toBe(new URL(process.env.REDIRECT_URI_AFTER_LOGIN || "http://localhost:3000").origin);
 });
});
