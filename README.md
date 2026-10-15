# HR Manager & Salary Analytics

React Native / Expo frontend และ Express / MySQL backend สำหรับล็อกอิน จัดการพนักงาน และวิเคราะห์เงินเดือนด้วย K-Means 3 กลุ่ม

## โครงสร้าง

```text
backend/
  server.js
  src/                 # API, auth, MySQL และ K-Means
  .env                 # การเชื่อมต่อจริง เก็บในเครื่อง/เซิร์ฟเวอร์เท่านั้น
  package.json
  package-lock.json
frontend/
  src/                 # หน้าล็อกอิน Dashboard และ session
  assets/              # ไอคอนและ splash ที่ app.json ใช้งาน
  .env
  .env.example
  app.json
  babel.config.js
  tsconfig.json
  expo-env.d.ts
  eas.json             # การตั้งค่าสำหรับคำสั่งสร้าง APK/AAB
  package.json
  package-lock.json
```

## Backend

ใช้ Node.js 20.19 ขึ้นไปและ MySQL ที่มีตาราง `user` และ `employees` แล้ว รันจากโฟลเดอร์ backend:

```powershell
npm ci
npm start
```

ถ้ามี node_modules ที่ติดตั้งพร้อมแล้ว ข้าม npm ci ได้ บนเซิร์ฟเวอร์อาจารย์ใช้ `node server.js` จากโฟลเดอร์แอป แล้วเปิด terminal ค้างไว้

ใช้ `.env` เดิม: DB_HOST, DB_PORT (ค่าเริ่มต้น 3306), DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET และ PORT (ค่าเริ่มต้น 3012) อย่าอัปโหลด `.env` ของเครื่องทับของเซิร์ฟเวอร์

คอลัมน์ฐานข้อมูลทุกตัวใช้ prefix `ChaKon_`:

- `user`: ChaKon_user_id, ChaKon_username, ChaKon_password, ChaKon_email, ChaKon_role, ChaKon_created_at
- `employees`: ChaKon_id, ChaKon_employee_code, ChaKon_first_name, ChaKon_last_name, ChaKon_position, ChaKon_status, ChaKon_salary

ตาราง user เก็บ password เป็น bcrypt hash และ role เป็น user/admin ตาราง employees ใช้ id แบบ AUTO_INCREMENT, employee_code แบบ UNIQUE, status เป็น Active/On Leave และ salary เป็น DECIMAL(12,2) พร้อม CHECK >= 0

โค้ดสร้างเฉพาะตาราง user หากยังไม่มี ไม่เปลี่ยนชื่อคอลัมน์ของตารางเดิมอัตโนมัติ ต้องใช้ฐานข้อมูลที่เปลี่ยนเป็น ChaKon_ แล้ว API ใช้ aliases ส่ง JSON ชื่อเดิม เช่น username, first_name, salary เพื่อให้ Frontend ทำงานต่อได้

อัปโหลด server.js, package.json, package-lock.json และโฟลเดอร์ src ทั้งชุด หากอัปเดตเฉพาะการเปลี่ยนชื่อคอลัมน์ ให้อัปโหลด src/auth.js และ src/employees.js แล้ว restart Backend

## Frontend

รันจากโฟลเดอร์ frontend:

```powershell
npm ci
npm run web
```

หากติดตั้ง dependencies แล้ว ข้าม npm ci ได้ ตั้งค่า `.env` โดยใช้ URL ที่อุปกรณ์เข้าถึงได้และลงท้าย `/api`:

```env
EXPO_PUBLIC_API_BASE_URL=http://119.59.102.161:3012/api
```

หลังเปลี่ยน environment ให้หยุด Expo แล้วเริ่มใหม่ด้วย `npm run web -- --clear` หากไม่ตั้ง URL เว็บจะเรียก localhost:3012 และ Android emulator เรียก 10.0.2.2:3012

คำสั่งเพิ่มเติม: `npm start` เปิด Expo, `npm run typecheck` ตรวจ TypeScript, `npm run build` สร้างเว็บ, `npm run android` สร้าง/รัน Android เมื่อมี Java และ Android SDK, `npm run android:apk` / `npm run android:aab` ใช้ EAS โฟลเดอร์ native Android สร้างใหม่ได้ด้วย `npm run android:prebuild`

## API และการใช้งาน

- POST /api/auth/register และ POST /api/auth/login: ใช้บัญชี MySQL จริง
- GET /api/auth/me: คืนผู้ใช้ปัจจุบัน; POST /api/auth/logout: ออกจากระบบ
- GET /api/employees: รายการพนักงาน
- POST /api/employees: รับ first_name, last_name ภาษาอังกฤษ, position และ salary สร้างรหัสอัตโนมัติ เช่น NinSom_001
- PUT /api/employees/:id/status: สลับ Active ↔ On Leave
- DELETE /api/employees/:id: ลบหลังยืนยันบนหน้าจอ
- GET /api/employees/salary-clusters: คืน Tier 1–3 เรียงค่าเฉลี่ยเงินเดือนจากต่ำไปสูง พร้อมจำนวนสมาชิก

API พนักงานและ /auth/me ต้องส่ง Authorization: Bearer token ชื่อและนามสกุลไม่เกิน 100 ตัว ตำแหน่งไม่เกิน 150 ตัว เงินเดือน 0–9,999,999,999.99 ทศนิยมไม่เกิน 2 หลัก

K-Means ใช้เงินเดือนพนักงานปัจจุบันทุกคน กลุ่มว่างมี count=0 และ centroid=null หน้าจอมี loading/error และโหลดรายการใหม่หลังเปลี่ยนข้อมูล ผู้ใช้จัดการทดสอบ Backend บนเซิร์ฟเวอร์เอง

เก็บ .env, node_modules และไฟล์ build ไว้นอก Git เมื่อนำไปส่งใน Repository ใหม่ ให้คัดลอก source โดยไม่คัดลอก .git เดิม เพราะประวัติเดิมเคยมี .env

