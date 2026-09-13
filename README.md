# AiFlix - AI-Powered Entertainment Discovery Platform

An intelligent media discovery web application that leverages external movie databases and Large Language Model (LLM) APIs to provide context-aware film recommendations and multi-language support.

## Key Features
- **Dynamic Content Discovery:** Consumes TMDB RESTful API endpoints to fetch trending films, top-rated series, and media metadata.
- **AI Recommendation Engine:** Generates personalized film suggestions based on natural language user queries and genre preferences using LLM integration.
- **Authentication & Identity:** User sign-up, sign-in, and session persistence powered by Firebase Authentication.
- **Multi-Language Flow:** Automated UI and content translation using Google Translate API integration.

## Tech Stack
- **Frontend:** React.js, Tailwind CSS
- **APIs & Services:** TMDB API, OpenAI/LLM API, Google Translate API
- **Auth & Database:** Firebase Authentication / Firestore

## Getting Started
```bash
git clone [https://github.com/emrhnccn/aiflix.git](https://github.com/emrhnccn/aiflix.git)
cd aiflix
npm install
npm start
