import {Package,Branch,Voucher} from "../models/index";
export class BookingValidationError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export async function resolveBookingData({branchId,packageId,voucherId,date},existing=null) {
  const parsed=new Date(date);
  if(!date || !Number.isFinite(parsed.getTime())) throw new BookingValidationError("Invalid booking date");
  const unchangedDate=existing && parsed.getTime()===new Date(existing.date).getTime();
  if(!unchangedDate && parsed.getTime()<=Date.now()) throw new BookingValidationError("Booking date must be in the future");
  const [packageInfo,branchInfo]=await Promise.all([Package.findByPk(packageId),Branch.findByPk(branchId)]);
  if(!packageInfo) throw new BookingValidationError("Package not found",404);
  if(!branchInfo) throw new BookingValidationError("Branch not found",404);
  if((packageInfo.isActive===false || packageInfo.deletedAt) && existing?.packageId!==packageId) throw new BookingValidationError("Package is no longer available");
  if((branchInfo.isActive===false || branchInfo.deletedAt) && existing?.branchId!==branchId) throw new BookingValidationError("Branch is no longer available");
  const samePrice=existing && existing.packageId===packageId && (existing.voucherId || null)===(voucherId || null);
  const voucher=voucherId ? await Voucher.findByPk(voucherId) : null;
  if(voucherId && !samePrice && (!voucher || voucher.isExpired)) throw new BookingValidationError("Voucher is invalid or expired");
  const price=Number(packageInfo.price),discount=Number(voucher?.discount || 0);
  if(!Number.isFinite(price)||price<0||!Number.isFinite(discount)||discount<0) throw new BookingValidationError("Invalid package price or voucher discount");
  const totalPrice=samePrice ? Number(existing.totalPrice) : Math.max(0,Math.round(price*100)-Math.round(discount*100))/100;
  return {packageInfo,branchInfo,voucher,totalPrice,discount,date:parsed.toISOString()};
}
