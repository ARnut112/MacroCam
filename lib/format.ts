import type { OrderStatus } from "./types";

export const money = (value: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
export const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "รอชำระเงิน",
  slip_submitted: "รอตรวจสอบสลิป",
  paid: "ชำระเงินแล้ว",
  shipped: "จัดส่งแล้ว",
  completed: "ได้รับสินค้าแล้ว",
  cancelled: "ยกเลิกแล้ว",
  expired: "หมดเวลาชำระเงิน",
};
