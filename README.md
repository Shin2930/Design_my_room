# Room Studio

Room Studio คือเว็บแอปสำหรับวางแผนและตกแต่งห้องแบบ 2D และ 3D ผู้ใช้สามารถเลือกเฟอร์นิเจอร์และของตกแต่งจากแค็ตตาล็อก จัดวางในห้อง ปรับขนาดและตำแหน่ง แล้วดูผลในมุมมองสามมิติได้

## ความสามารถ

- แสดงแปลนห้องแบบ 2D และฉากจำลองแบบ 3D
- เลือกสินค้าและค้นหาสินค้าทั้งแค็ตตาล็อก
- ปรับขนาดห้อง สีพื้น สีผนัง และรูปแบบห้อง
- เพิ่ม ย้าย หมุน และลบวัตถุ รวมถึงวางของบนพื้นผิวที่รองรับ
- ย้อนกลับและทำซ้ำการแก้ไข
- ส่งออกภาพห้องเป็น PNG
- แสดงภาพตัวอย่างสินค้าและสถานะการโหลดโมเดล 3D

## เทคโนโลยี

- HTML, CSS และ JavaScript แบบ ES modules
- [Three.js](https://threejs.org/) สำหรับแสดงผล 3D
- `GLTFLoader` และ `MeshoptDecoder` สำหรับโหลดโมเดล GLB
- Git LFS สำหรับจัดเก็บไฟล์โมเดล GLB
- GitHub Actions และ GitHub Pages สำหรับ deploy เว็บไซต์

โปรเจกต์ไม่มีขั้นตอน build หรือ dependencies ที่ต้องติดตั้งผ่าน npm โดย Three.js และโมดูลที่เกี่ยวข้องโหลดจาก jsDelivr จึงต้องเชื่อมต่ออินเทอร์เน็ตขณะใช้งาน

## วิธีรันในเครื่อง

ไม่ควรเปิด `index.html` ด้วย `file://` เนื่องจากแอปใช้ ES modules และโหลดไฟล์โมเดลแยกต่างหาก ให้เปิดผ่าน local web server แทน

### Windows

เปิด PowerShell ที่โฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
py -m http.server 8000
```

จากนั้นเปิด <http://localhost:8000> ในเบราว์เซอร์

### macOS หรือ Linux

```bash
python3 -m http.server 8000
```

จากนั้นเปิด <http://localhost:8000> ในเบราว์เซอร์

กด `Ctrl+C` ในหน้าต่างเทอร์มินัลเพื่อหยุด local server

## โครงสร้างโปรเจกต์

```text
.
├── index.html                 # โครงหน้าเว็บและองค์ประกอบ UI
├── style.css                  # รูปแบบและ responsive layout
├── app.js                     # การทำงานหลักของแอปและฉาก 2D/3D
├── .gitattributes             # กำหนดให้ไฟล์ .glb ใช้ Git LFS
├── .github/
│   └── workflows/
│       └── deploy-pages.yml   # Workflow deploy ไป GitHub Pages
├── assets/
│   ├── models/
│   │   ├── catalog.js         # รายการสินค้าและการตั้งค่าโมเดล
│   │   ├── previews/          # ภาพตัวอย่างสินค้า
│   │   └── <ประเภทสินค้า>/    # โมเดล GLB แยกตามประเภท
│   ├── models_backup/         # ไฟล์โมเดลสำรอง
│   └── picture/               # ภาพประกอบที่ใช้ในหน้าเว็บ
├── import_model/              # ไฟล์โมเดลที่นำเข้าหรือเตรียมไว้
└── plugins/                   # ปลั๊กอินและทรัพยากรประกอบ
```

โฟลเดอร์ย่อยใน `assets/models/` ได้แก่ `beds`, `chairs`, `characters`, `decor`, `dining_tables`, `doors`, `electronics`, `lamps`, `plants`, `rugs`, `sofas`, `tables`, `tvs`, `wardrobes`, `windows` และ `work_desks`

## การจัดการโมเดลสินค้า

รายการสินค้าและพาธโมเดลกำหนดไว้ใน `assets/models/catalog.js` แต่ละรายการมี ID ชื่อ ประเภท ขนาด สี และพาธไฟล์ GLB รวมถึงค่าปรับแต่งเฉพาะโมเดล เช่น มุมหมุนหรือสเกล

ไฟล์ `.glb` ใช้ Git LFS ตาม `.gitattributes` เมื่อ clone repository ใหม่ ให้ติดตั้ง Git LFS และดึงไฟล์โมเดลจริงก่อนทดสอบ:

```bash
git lfs install
git lfs pull
```

ตรวจสอบว่าไฟล์ GLB ถูกดึงมาครบและไม่ใช่ไฟล์ pointer ของ Git LFS หากโมเดลไม่โหลด ให้ตรวจพาธในแค็ตตาล็อก, ไฟล์ใน repository และ Network/Console ใน Developer Tools ของเบราว์เซอร์

## Deploy ไป GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` จะทำงานเมื่อ push ไปยัง branch `main` หรือเมื่อสั่งรันด้วยตนเองจากแท็บ **Actions** โดยจะ:

1. Checkout repository พร้อมดาวน์โหลด Git LFS
2. ตรวจว่าโมเดล `assets/models/beds/bed.glb` เป็นไฟล์ GLB จริง
3. เตรียมไฟล์เว็บไซต์และ deploy ไป GitHub Pages

ตั้งค่า GitHub Pages ให้ใช้ **GitHub Actions** เป็น deployment source แล้ว push การเปลี่ยนแปลงไปยัง `main` เมื่อ workflow ทำงานเสร็จ ให้ตรวจผลใน **Actions → Deploy GitHub Pages**

> **ข้อจำกัดขนาด:** โมเดล GLB ในโปรเจกต์มีขนาดรวมมาก และ Pages artifact มีขีดจำกัดขนาด หาก workflow build ผ่านแต่ deploy timeout หรือแจ้งว่า artifact ใหญ่เกิน ให้ตรวจขนาด artifact ใน Actions logs การเพิ่มเวลา timeout อย่างเดียวไม่ลดขนาดไฟล์ที่ต้อง deploy
