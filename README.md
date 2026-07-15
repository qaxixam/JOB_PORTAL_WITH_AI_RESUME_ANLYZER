# Job Portal with AI Resume Analyzer

A full-stack MERN job portal that lets **students** browse and apply to jobs and lets **recruiters** post jobs, manage companies, and review applicants. Its standout feature is an **AI resume analyzer** (powered by Google Gemini) that scores a candidate's resume against a job description and returns a match percentage, strengths, missing skills, and improvement suggestions.

- **Live app:** https://job-portal-with-ai-resume-anlyzer-1.onrender.com/
- **Repository:** https://github.com/qaxixam/JOB_PORTAL_WITH_AI_RESUME_ANLYZER

> **Note on hosting:** the live URL above is a `.onrender.com` domain, which means the app (or at least this deployment) is hosted on **Render**, not Vercel. If you're also deploying a copy on Vercel, see the [Deployment](#deployment) section for what to change.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [How the AI Resume Analyzer Works](#how-the-ai-resume-analyzer-works)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Deployment](#deployment)
- [Known Issues / Notes for Contributors](#known-issues--notes-for-contributors)
- [License](#license)

---

## Features

**For job seekers (students)**
- Register/login with a profile photo (Cloudinary), bio, and skills
- Browse and search jobs by keyword
- Upload/replace a resume (PDF/DOCX, stored on the server's local disk)
- Apply to jobs and track application status
- Forgot/reset password via emailed reset link

**For recruiters**
- Register a company (with logo upload via Cloudinary)
- Post jobs with title, description, requirements, salary, experience level, location, job type, and number of openings
- View applicants per job
- Update an applicant's status (`pending` / `accepted` / `rejected`)
- Run an **AI-powered match analysis** on any applicant's resume against the job description

**AI Resume Analyzer**
- Extracts text from a candidate's uploaded resume (PDF or DOCX)
- Sends the resume text + job description to Google's Gemini API
- Returns a structured JSON result: match percentage, strengths, missing skills, feedback, and improvement suggestions
- Result is cached on the `Application` document so it doesn't need to be regenerated

---

## Tech Stack

**Backend**
- Node.js + Express 4
- MongoDB + Mongoose
- JWT-based authentication (stored in an HTTP-only cookie)
- Multer (in-memory) for file uploads
- Cloudinary for profile photos and company logos
- Google Generative AI SDK (`@google/generative-ai`, model `gemini-flash-latest`) for resume analysis
- `pdf-parse` and `mammoth` for extracting text from PDF/DOCX resumes
- Nodemailer (Gmail transport) for password-reset emails
- bcryptjs for password hashing

**Frontend**
- React 18 + Vite
- React Router v6
- Redux Toolkit + redux-persist for state management
- Tailwind CSS + shadcn/ui-style components (Radix UI primitives)
- Axios for API calls
- Framer Motion, Embla Carousel, Sonner (toasts)

---

## Project Structure

```
JOB_PORTAL_WITH_AI_RESUME_ANLYZER/
├── backend/
│   ├── config/
│   │   └── email.js              # Nodemailer (Gmail) transporter
│   ├── controllers/
│   │   ├── application.controller.js  # apply, list, status update, AI analysis
│   │   ├── company.controller.js      # company CRUD
│   │   ├── job.controller.js          # job CRUD
│   │   └── user.controller.js         # auth, profile, password reset
│   ├── middlewares/
│   │   ├── isAuthenticated.js    # JWT cookie auth guard
│   │   └── mutler.js             # Multer in-memory upload config
│   ├── models/
│   │   ├── application.model.js
│   │   ├── company.model.js
│   │   ├── job.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── application.route.js
│   │   ├── company.route.js
│   │   ├── job.route.js
│   │   └── user.route.js
│   ├── services/
│   │   ├── ai.service.js         # Gemini prompt + response parsing
│   │   ├── email.service.js      # reset-password email template
│   │   ├── file.service.js       # PDF/DOCX text extraction
│   │   └── token.service.js      # reset-token generation/verification
│   ├── uploads/resumes/          # locally stored resume files
│   ├── utils/
│   │   ├── cloudinary.js
│   │   ├── crypto.js
│   │   ├── datauri.js
│   │   ├── db.js                 # MongoDB connection
│   │   └── password.js
│   ├── index.js                  # Express app entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/           # pages & UI (Home, Jobs, Profile, admin/, auth/, shared/, ui/)
    │   ├── hooks/                 # data-fetching hooks (useGetAllJobs, useGetAllCompanies, ...)
    │   ├── redux/                 # authSlice, jobSlice, companySlice, applicationSlice, store
    │   ├── services/
    │   │   └── ai.services.js     # calls the AI analysis endpoint
    │   ├── utils/constant.js      # API base URL + endpoint constants
    │   ├── App.jsx                # route definitions
    │   └── main.jsx
    └── package.json
```

---

## Architecture Overview

```
React (Vite) SPA  ──HTTP/axios (withCredentials)──▶  Express API (/api/v1/*)
                                                          │
                                                          ├── MongoDB (Mongoose) — users, jobs, companies, applications
                                                          ├── Cloudinary — profile photos & company logos
                                                          ├── Local disk (backend/uploads/resumes) — resume files
                                                          ├── Gmail via Nodemailer — password reset emails
                                                          └── Google Gemini API — resume-vs-JD analysis
```

Authentication is a JWT signed with `SECRET_KEY`, stored in an `httpOnly` cookie named `token` and valid for 1 day. `isAuthenticated` middleware reads that cookie, verifies it, and attaches `req.id` (the user id) to the request.

---

## How the AI Resume Analyzer Works

1. A recruiter opens an applicant's application and triggers analysis, which calls:
   `GET /api/v1/application/:applicationId/analyze`
2. The backend (`application.controller.js`) loads the `Application`, populated with its `job` and `applicant`.
3. It validates that the applicant has an uploaded resume and the job has a description.
4. `file.service.js` extracts raw text from the resume:
   - `.pdf` → `pdf-parse`
   - `.docx` → `mammoth`
   - Works for both local files (`/uploads/resumes/...`) and remote URLs.
5. `ai.service.js` sends a prompt to Gemini (`gemini-flash-latest`) containing the resume text and job description, asking for **strict JSON** with:
   ```json
   {
     "matchPercentage": 0-100,
     "strengths": ["..."],
     "missingSkills": ["..."],
     "feedback": "...",
     "improvements": ["..."]
   }
   ```
6. The response is cleaned (Markdown code fences stripped) and parsed. If JSON parsing fails, a regex-based fallback parser extracts a best-effort result instead of failing outright.
7. The result is saved onto `application.aiAnalysis` and `application.analysisDate`, then returned to the frontend, where `AIAnalysis.jsx` renders it.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB connection string (local or Atlas)
- A Cloudinary account (for image uploads)
- A Google Gemini API key
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) (for password-reset emails)

### 1. Clone the repo
```bash
git clone https://github.com/qaxixam/JOB_PORTAL_WITH_AI_RESUME_ANLYZER.git
cd JOB_PORTAL_WITH_AI_RESUME_ANLYZER
```

### 2. Backend setup
```bash
cd backend
npm install
```
Create a `backend/.env` file (see [Environment Variables](#environment-variables) below), then run:
```bash
npm run dev     # nodemon, auto-restarts on changes
# or
npm start       # plain node
```
The server listens on `process.env.PORT` (defaults to `3000`).

### 3. Frontend setup
```bash
cd frontend
npm install
```
Create/update `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3000
```
Then run:
```bash
npm run dev
```
Vite will start the dev server (default `http://localhost:5173`).

> ⚠️ The backend currently hardcodes its CORS `origin` to the production frontend URL (`https://job-portal-with-ai-resume-anlyzer-1.onrender.com`) in `backend/index.js`. For local development, change this to `http://localhost:5173` (or your dev URL), or make it configurable via an environment variable.

---

## Environment Variables

### `backend/.env`
| Variable | Used in | Description |
|---|---|---|
| `PORT` | `index.js` | Port the Express server listens on (defaults to `3000`) |
| `MONGO_URI` | `utils/db.js` | MongoDB connection string |
| `SECRET_KEY` | `user.controller.js`, `isAuthenticated.js` | Secret used to sign/verify JWTs |
| `CLOUD_NAME` | `utils/cloudinary.js` | Cloudinary cloud name |
| `API_KEY` | `utils/cloudinary.js` | Cloudinary API key |
| `API_SECRET` | `utils/cloudinary.js` | Cloudinary API secret |
| `GEMINI_API_KEY` | `services/ai.service.js` | Google Generative AI (Gemini) API key |
| `EMAIL_USER` | `config/email.js`, `services/email.service.js` | Gmail address used to send reset emails |
| `EMAIL_PASS` | `config/email.js` | Gmail app password |
| `FRONTEND_URL` | `user.controller.js` (`forgotPassword`) | Base URL used to build the password-reset link |

### `frontend/.env`
| Variable | Used in | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `src/utils/constant.js` | Base URL of the backend API (e.g. `http://localhost:3000` locally, or the deployed backend URL in production). Falls back to a hardcoded Render URL if unset. |

---

## API Reference

Base path: `/api/v1`. All endpoints marked 🔒 require the `token` auth cookie (via `isAuthenticated`).

### User — `/api/v1/user`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | – | Register a new user (multipart form with `file` = profile photo) |
| POST | `/login` | – | Log in (`email`, `password`, `role`); sets `token` cookie |
| GET | `/logout` | – | Clears the auth cookie |
| POST | `/profile/update` | 🔒 | Update profile (`fullname`, `email`, `phoneNumber`, `bio`, `skills`, plus optional `file` = resume) |
| POST | `/forgot-password` | 🔒* | Request a password-reset email (`email`) |
| POST | `/reset-password/:token` | 🔒* | Reset password using the emailed token (`password`) |

\* `forgot-password` and `reset-password` are wired through `isAuthenticated` in the current routes, even though logically they're meant for logged-out users. See [Known Issues](#known-issues--notes-for-contributors).

### Job — `/api/v1/job`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/post` | 🔒 | Create a job (recruiter) |
| GET | `/get` | 🔒 | List all jobs, optional `?keyword=` search on title/description |
| GET | `/getadminjobs` | 🔒 | List jobs created by the logged-in recruiter |
| GET | `/get/:id` | 🔒 | Get a single job by id |

### Company — `/api/v1/company`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | 🔒 | Register a new company (`companyName`) |
| GET | `/get` | 🔒 | List companies owned by the logged-in user |
| GET | `/get/:id` | 🔒 | Get a company by id |
| PUT | `/update/:id` | 🔒 | Update company details + logo (multipart `file`) |

### Application — `/api/v1/application`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/apply/:id` | 🔒 | Apply to job `:id` as the logged-in user |
| GET | `/get` | 🔒 | Get all applications submitted by the logged-in user |
| GET | `/:id/applicants` | 🔒 | Get all applicants for job `:id` (recruiter view) |
| GET | `/:applicationId/analyze` | 🔒 | Run AI resume analysis for an application |
| POST | `/status/:id/update` | 🔒 | Update an application's status (`{ status: "accepted" \| "rejected" \| "pending" }`) |

All endpoints return JSON in the shape `{ success: boolean, message?: string, ...data }`.

---

## Data Models

**User**
`fullname`, `email` (unique), `phoneNumber`, `password` (hashed), `role` (`student` | `recruiter`), `resetPasswordToken`, `resetPasswordExpires`, `profile: { bio, skills[], resume, resumeOriginalName, company, profilePhoto }`

**Company**
`name` (unique), `description`, `website`, `location`, `logo`, `userId` (owner)

**Job**
`title`, `description`, `requirements[]`, `salary`, `experienceLevel`, `location`, `jobType`, `position`, `company` (ref), `created_by` (ref), `applications[]` (ref)

**Application**
`job` (ref), `applicant` (ref), `status` (`pending` | `accepted` | `rejected`), `aiAnalysis: { matchPercentage, strengths[], missingSkills[], feedback, improvements[], rawResponse }`, `analysisDate`

---

## Deployment

The live instance is hosted on **Render** (`onrender.com`), not Vercel — the URL you shared is a Render app URL. A typical split deployment looks like this:

- **Backend (Express + MongoDB):** deploy as a Render **Web Service**
  - Build command: `npm install` (in `backend/`)
  - Start command: `npm start`
  - Set all backend env vars listed above in Render's dashboard
  - Note: resumes are saved to local disk (`backend/uploads/resumes`). Render's free/standard disks are **ephemeral** — files can be wiped on redeploy/restart. For production, move resume storage to Cloudinary or S3 instead of local disk.

- **Frontend (Vite/React):**
  - If deploying on **Vercel**: set the framework preset to Vite, build command `npm run build`, output directory `dist`, and set `VITE_API_BASE_URL` to your backend's public URL in Vercel's environment variables.
  - If deploying on **Render** (as the current live URL suggests): use a Static Site with build command `npm run build` and publish directory `dist`.

- **CORS:** update the hardcoded `origin` in `backend/index.js` to match wherever the frontend actually ends up (Vercel URL, Render static site URL, or an array of both if you need to support multiple environments).

---

## Known Issues / Notes for Contributors

These were spotted while reading the code — useful context if you plan to extend this project:

- **`Application` schema declares `status` twice** in `application.model.js`; the second declaration overwrites the first, so `status` is currently limited to `pending` / `accepted` / `rejected` (the `analyzed`/`shortlisted` values in the first definition are unused).
- **`frontend/src/utils/constant.js`** has a double slash in `JOB_API_END_POINT` (`/api/v1//job`) — Express tolerates this, but it's worth cleaning up.
- **`aiService.batchAnalyze`** in `frontend/src/services/ai.services.js` references an undefined `API_URL` (should probably be `APPLICATION_API_END_POINT`), and there's no matching `batch-analyze` route on the backend yet — this function is currently non-functional.
- **`forgot-password` / `reset-password` routes** are gated behind `isAuthenticated`, which means a logged-out user (the typical case for "forgot password") can't actually reach them without a valid session cookie. Consider removing that middleware from those two routes.
- **CORS origin is hardcoded** to the production frontend URL — breaks local development unless you edit it manually (see [Getting Started](#getting-started)).
- **Resume storage is local disk**, not cloud storage — not durable across redeploys on most PaaS providers (see [Deployment](#deployment)).
- Several controllers only `console.log(error)` in their `catch` blocks without sending an error response — requests can hang without a response on unexpected errors.

---

## License

No license file is currently included in the repository. Add a `LICENSE` file (e.g. MIT) if you intend for others to reuse this code.
