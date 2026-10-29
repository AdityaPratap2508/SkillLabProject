# SmartCare Hospital Management System

A modern hospital management system built with Express.js, MySQL, and Bootstrap-based frontend. The application provides role-based dashboards for administrators, doctors, nurses, receptionists, pharmacists, laboratory technicians, and billing staff.

## Features

- Secure login and JWT-based authentication
- Role-based access control
- Dashboard with live hospital stats and charts
- Patient management and search
- Doctor directory
- Appointment booking and tracking
- Bed and ward management
- Admission and discharge workflow
- EMR, prescriptions, lab orders, billing, and reports
- Responsive UI

## Project Structure

```text
smartcare-hms/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── server.js
├── database/
│   ├── schema.sql
│   └── seed.sql
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
└── README.md
```

## Requirements

- Node.js 18+
- MySQL 8.0+
- VS Code

## Setup MySQL

1. Create a MySQL database named `smartcare_hms`.
2. Update `.env` with your database credentials.
3. Import the schema file:

```bash
mysql -u root -p smartcare_hms < database/schema.sql
mysql -u root -p smartcare_hms < database/seed.sql
```

## Install Dependencies

```bash
npm install
```

## Create Environment File

```bash
cp .env.example .env
```

Then update the values in `.env`.

## Start the Application

```bash
npm start
```

Open: http://localhost:3000

## Seed the Default Admin User

```bash
npm run seed
```

Default admin login:

- Email: admin@smartcare.local
- Password: Admin@123

## Patient and Doctor Access

- From the sign-in screen, choose **Create patient account** and enter your own details. Patient records are scoped to the signed-in account; optional health details are marked as patient-entered and are not clinician-verified.
- Doctor demo login: `doctor@smartcare.local` / `Admin@123`. The doctor workspace shows the clinician role, professional profile, and assigned schedule.
- With MySQL configured and the application tables available, patient accounts and profiles are saved in MySQL. If MySQL is unavailable, the app uses temporary in-memory demo storage; those accounts are lost when the server restarts.

## Notes

- This is a development-ready foundation using synthetic demo data.
- Replace placeholder values and demo records before production deployment.
- For production, enable HTTPS, stricter CORS rules, and secure secrets management.
