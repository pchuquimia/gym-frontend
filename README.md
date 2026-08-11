Apex Performance - Frontend

Apex Performance is a responsive workout tracking and coaching platform built for athletes, coaches, and administrators. It combines workout planning, live session logging, exercise analytics, progress tracking, and role-based coaching workflows in a single web application.

The project was designed and developed independently as a full-stack portfolio product and has been tested by more than 10 beta users in a real gym environment.

Live demo

Application: gym-frontend-t65c.onrender.com

API: gym-backend-1fod.onrender.com

Demo account: available for product evaluation.

Product highlights

Athlete experience

Create routines and organize exercises, sets, repetitions, rest periods, and training days.

Log active workouts with session recovery and mobile-friendly set controls.

Review workout history, session summaries, exercise volume, intensity, and estimated one-repetition maximum trends.

Track body weight, progress photos, goals, and recent achievements.

Browse and filter a bilingual exercise catalog containing approximately 1,300 exercises.

Coach experience

Link athletes to a coach account through controlled assignment flows.

Review athlete summaries, training history, and progress indicators.

Create and assign routines, reusable plan templates, and scheduled training plans.

Manage plan status, training cycles, rest days, and recovery days.

Administration

Manage users and role-based permissions for administrators, coaches, and clients.

Curate system and custom exercises with structured classification data.

Manage exercise media, catalog migrations, duplicate records, and AI-assisted exercise image generation.

Exercise catalog

The catalog supports structured exercise metadata, including:

Spanish and English names, aliases, categories, and body regions.

Primary, secondary, and stabilizer muscles.

Movement patterns, equipment, laterality, kinetic chain, mechanics, and force type.

Difficulty, goals, instructions, common mistakes, and precautions.

Images, thumbnails, animations, videos, attribution, and taxonomy versioning.

Large datasets are handled through server-side pagination, incremental loading, indexed MongoDB queries, and cached client requests.

Frontend engineering

Responsive layouts for desktop, Android, and iPhone browsers.

Role-based navigation and protected application areas.

Server-state caching, request invalidation, and infinite queries with TanStack React Query.

Centralized API communication and error normalization with Axios.

Reusable interface components and shared application contexts.

Interactive charts for training volume, intensity, estimated 1RM, and muscle-group progress.

Optimized Cloudinary images, thumbnails, and lazy-loaded media.

Drag-and-drop exercise ordering and animated interface transitions.

Light and dark themes with mobile-specific interaction patterns.

Technology stack

Area

Technologies

UI

React, JavaScript, HTML5, CSS3, Tailwind CSS

Build tooling

Vite, ESLint, Prettier

Server state and API

TanStack React Query, Axios

Data visualization

Nivo

Interaction and motion

dnd-kit, Framer Motion, Radix UI

Media delivery

Cloudinary

Backend

Node.js, Express, MongoDB, Mongoose

Deployment

Render

Screenshots

Exercise details

Mobile routine workflow

Architecture

React application
-> Axios API client
-> Node.js and Express REST API
-> MongoDB Atlas
-> Cloudinary media storage
-> OpenAI Images API for administrative image workflows

The frontend uses TanStack React Query for server state and React Context for authentication, current-user data, routines, and active training state.

Local development

Requirements

Node.js 22 recommended.

npm 10 or later.

A running instance of the related backend.

Installation

git clone https://github.com/pchuquimia/gym-frontend.git
cd gym-frontend
npm install

Create a local .env file when you need to override the default API configuration:

VITE_API_URL=http://localhost:4000
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_AUTH_TOKEN_STORAGE=localStorage

Start the development server:

npm run dev

Additional commands:

Command

Purpose

npm run build

Create a production build.

npm run lint

Run the ESLint checks.

npm run preview

Preview the production build locally.

Validation

The current version has been manually validated on:

Chrome on desktop.

Chrome on Android.

Safari on iPhone.

Real gym workflows with more than 10 beta users.

Feedback from beta testing has been used to improve mobile navigation, set logging, routine creation, loading behavior, button clarity, and error handling.

AI features in development

An advanced local development version extends the product with:

A contextual workout assistant using authenticated user data.

OpenAI and Anthropic model integrations.

Function calling and structured outputs for validated routine generation.

Retrieval-augmented generation and embeddings for semantic exercise retrieval.

Automated progress summaries and personalized recommendations.

These features are under active development and are not yet included in the public demo or the current main branch.

Roadmap

Publish and deploy the advanced AI assistant.

Add automated end-to-end coverage with Playwright.

Complete the email verification flow.

Establish Lighthouse and Core Web Vitals performance baselines.

Expand accessibility validation and automated quality checks.

Related repository

Backend API: pchuquimia/gym-backend

Author

Pablo Iván Chuquimia Huanca

GitHub: @pchuquimia

LinkedIn: linkedin.com/in/pchuquimia
