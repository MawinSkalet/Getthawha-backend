import { sendEmailNotification } from "../utils/sendNotifications";

function formatBookingDate(date) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return String(date);

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(parsedDate);
}

function displaySource(source) {
  const labels = {
    website: "Website",
    facebook: "Facebook",
    line: "LINE",
    admin: "Staff",
  };
  return labels[source] || "Website";
}

function bookingLines({ booking, customerName, branchName, packageTitle }) {
  return [
    `Booking ID: ${booking.id}`,
    `Customer: ${customerName}`,
    `Persons: ${booking.numberOfGuests || 1}`,
    `Customer email: ${booking.customerEmail}`,
    `Date and time: ${formatBookingDate(booking.date)}`,
    `Service: ${packageTitle}`,
    `Branch: ${branchName}`,
    `Total price: ฿${Number(booking.totalPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    `Status: ${booking.status}`,
    `Source: ${displaySource(booking.source)}`,
  ];
}

async function sendBookingCreatedNotifications({
  booking,
  customerName,
  branchName,
  packageTitle,
  ownerEmails,
}) {
  const details = bookingLines({ booking, customerName, branchName, packageTitle });

  const ownerEmailBody = [
    "A new booking has been received.",
    "",
    ...details,
  ].join("\n");

  const customerEmailBody = [
    `Hello ${customerName},`,
    "",
    "We have received your booking request at Getthawha Thai Massage & Spa.",
    "Your booking is pending until our team confirms it.",
    "",
    `Booking ID: ${booking.id}`,
    `Persons: ${booking.numberOfGuests || 1}`,
    `Date and time: ${formatBookingDate(booking.date)}`,
    `Service: ${packageTitle}`,
    `Branch: ${branchName}`,
    `Total price: ฿${Number(booking.totalPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    "",
    "Thank you for booking with us.",
  ].join("\n");

  const [ownerEmail, customerEmail] = await Promise.all([
    sendEmailNotification("New booking received", ownerEmailBody, ownerEmails),
    sendEmailNotification(
      `We received your booking request #${booking.id}`,
      customerEmailBody,
      [booking.customerEmail]
    ),
  ]);

  return { ownerEmail, customerEmail };
}

export { sendBookingCreatedNotifications };
