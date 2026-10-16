# ภาพและการออกแบบ MacroCam

หน้าร้านใช้พื้นสีครีม ตัวอักษรสีเข้ม และสีแดงอิฐเป็นสีหลักชั่วคราว ยังไม่มีโลโก้หรือสีแบรนด์ที่เจ้าของร้านยืนยัน โลโก้เป็นตัวอักษร MacroCam กับไอคอน aperture จาก Lucide

ภาพแบนเนอร์อยู่ที่ `public/images/hero-camera.webp` สร้างด้วยเครื่องมือ ImageGen ในตัว และบีบอัดเป็น WebP เพื่อใช้ในเว็บไซต์ เป็นภาพประกอบบรรยากาศ ไม่ใช่ภาพสินค้าจริง ไม่ได้ติดตั้งระบบ AI หรือบริการเสียเงินในร้าน

Prompt ที่ใช้:

> Use case: product-mockup. Asset type: photography store website hero background. Create a premium editorial product photograph of a beautiful black professional mirrorless camera with a large black lens, three-quarter front view facing slightly left, on a sculptural low warm light gray stone plinth. Camera occupies the RIGHT 55 percent of a very wide 3:2 composition, leave the LEFT 40 percent completely empty ivory plaster background. Warm gray and cream studio background, dramatic soft sunlight from upper right and a realistic long soft shadow, high detail on the textured camera grip, subtle red reflection on lens glass, luxe analog magazine product photography with tasteful fine film grain. A second smaller detached black lens sits on the table behind and right. No brand logos, no text, no letters, no watermarks, no people. Elegant photographic realism, not illustration. Landscape wide 1536x1024.

เครดิตภาพสินค้าตัวอย่างและข้อจำกัดการใช้ภาพอยู่ใน `public/images/SOURCES.md` ซึ่งมีลิงก์จากท้ายเว็บไซต์ รูปตัวอย่างของผู้ผลิตและ Wikimedia ต้องเปลี่ยนเป็นภาพสินค้าชิ้นจริงก่อนเปิดขาย โดยเฉพาะมือสอง ตำหนิ และอุปกรณ์ในชุด

ฟอนต์ Noto Sans Thai อยู่ใน `public/fonts/` พร้อมใบอนุญาต OFL ไม่เรียกบริการฟอนต์ภายนอกขณะโหลดหน้า
