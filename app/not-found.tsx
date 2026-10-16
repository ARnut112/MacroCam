import { EmptyState } from "@/components/shell";
export default function NotFound() {
  return (
    <div className="container standard-page">
      <EmptyState
        title="มุมนี้ยังไม่มีภาพค่ะ"
        detail="อาจไม่มีสินค้าหรือหน้าที่คุณต้องการ ลองกลับไปเลือกชมอุปกรณ์อีกครั้ง"
      />
    </div>
  );
}
