import { Branch, Package } from "../models/index";
import { connect, sync } from "../config/database";

const branch = {
  id: "4e66d78c-4809-4af4-8532-43b2bda50d86",
  name: "Chareonmuang (Test Branch)",
  address: "9/3 Charoenmuang soi 3, Chiang Mai 50000",
  googleMapUrl: "https://maps.google.com",
  googleMapEmbedUrl: "https://maps.google.com",
  phone: "087-657-9546",
  description: "Local development booking-test branch",
  isActive: true,
};

const bookingPackage = {
  id: "598c8bae-42af-4ee4-81d1-decb50778e17",
  title: "Thai Massage (60 minutes) - Test",
  description: "Local development booking-test service",
  price: 300,
  duration: 60,
  type: "service",
  isActive: true,
};

await connect();
await sync();
await Branch.upsert(branch);
await Package.upsert(bookingPackage);

console.log("Local booking test data is ready.");
process.exit(0);
