# 🌶️ Zestora — Full-Stack E-Commerce Platform

Zestora is a full-stack e-commerce platform designed for discovering and purchasing Indian spices, masalas, and related food products.

The platform provides a complete shopping experience with product browsing, category navigation, search, authentication, cart management, checkout, orders, reviews, returns, and an admin dashboard.

It also includes an **AI-powered chatbot** with a **RAG (Retrieval-Augmented Generation)** backend for answering questions using Zestora's product and website information.

---

## 🚀 Features

### 🛍️ Customer Features

* Browse products and categories
* Product details
* Related products
* Category-based product browsing
* Product search
* User registration and login
* Authentication and protected routes
* Shopping cart
* Checkout
* Order management
* Order history
* Order tracking
* Product reviews
* Return and refund management
* Responsive navigation
* Contact page
* About page
* Customer support

### 🤖 AI Chatbot

Zestora includes an AI-powered chatbot integrated into the website.

The chatbot supports:

* Natural-language conversations
* Product and website information
* Retrieval-Augmented Generation (RAG)
* Semantic search
* FAISS vector similarity search
* Gemini embeddings
* Gemini-powered response generation
* Website content retrieval
* Context-aware responses
* Separate FastAPI backend

### 👨‍💼 Admin Dashboard

The admin system provides functionality for managing:

* Products
* Categories
* Orders
* Return orders
* Users
* Payments
* Reviews
* Admin details
* Account activation

### 📱 Responsive Design

The frontend is designed for:

* Desktop
* Tablet
* Mobile

The UI uses React and Tailwind CSS.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │       Zestora       │
                         │    React Client     │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              Node.js API       AI Chatbot       Browser
              Express API           │
                    │               │
                    │               ▼
                    │          FastAPI API
                    │               │
                    │               ▼
                    │          FAISS Index
                    │               │
                    │               ▼
                    │       Gemini Embeddings
                    │               │
                    │               ▼
                    │        Gemini LLM
                    │
                    ▼
                MongoDB
```

---

# 🛠️ Technology Stack

## Frontend

* React.js
* React Router
* Tailwind CSS
* Axios
* React Icons
* React Toastify
* Context API

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Cloudinary
* Authentication Middleware
* Email Services
* SMS Services

## AI / RAG

* Python
* FastAPI
* Google Gemini API
* Gemini Embeddings
* FAISS
* NumPy
* BeautifulSoup
* Playwright
* Python dotenv

---

# 📁 Project Structure

```text
Zestora/
│
├── .gitignore
│
├── client/
│   ├── public/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │
│   │   ├── components/
│   │   │   ├── Order/
│   │   │   ├── Product/
│   │   │   ├── routes/
│   │   │   ├── Banner.jsx
│   │   │   ├── CategoryPanels.jsx
│   │   │   ├── CategoryStrip.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Product.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── ProductRow.jsx
│   │   │   └── ...
│   │   │
│   │   ├── context/
│   │   │   ├── CartContext.jsx
│   │   │   └── UserContext.jsx
│   │   │
│   │   ├── hooks/
│   │   │
│   │   ├── page/
│   │   │   ├── HomePage.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── CartPage.jsx
│   │   │   ├── CategoryDetails.jsx
│   │   │   ├── CheckOut.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   ├── OrderPage.jsx
│   │   │   ├── TrackOrder.jsx
│   │   │   ├── admin/
│   │   │   └── user/
│   │   │
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   │
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
└── chatbot/
    ├── data/
    │   ├── categories.json
    │   └── products.json
    │
    ├── rag/
    │   ├── __init__.py
    │   └── chat.py
    │
    ├── ingest.py
    ├── main.py
    └── requirements.txt
```

## The committed project contains the `client`, `server`, and `chatbot` applications, along with the frontend components/pages and backend controllers, models, routes, and utilities.

# 🔐 Authentication

Zestora provides authentication and protected application routes.

Authenticated functionality includes:

* User dashboard
* User details
* Cart
* Checkout
* Orders
* Order tracking
* Admin dashboard

---

# 🛒 E-Commerce Flow

```text
Home
  ↓
Browse Categories
  ↓
Browse Products
  ↓
Product Details
  ↓
Add to Cart
  ↓
Cart
  ↓
Checkout
  ↓
Payment
  ↓
Order
  ↓
Track Order
```

---

# 🤖 AI Chatbot Architecture

The chatbot runs as a separate Python FastAPI service.

```text
Zestora Data
     │
     ▼
Data Collection
     │
     ▼
Text Processing
     │
     ▼
Text Chunking
     │
     ▼
Gemini Embeddings
     │
     ▼
FAISS Vector Index
     │
     ▼
User Question
     │
     ▼
Query Embedding
     │
     ▼
FAISS Similarity Search
     │
     ▼
Relevant Context
     │
     ▼
Gemini Generation
     │
     ▼
AI Chatbot Response
```

The chatbot implementation is separated into ingestion, FastAPI API, and RAG modules.

---

# 📦 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/BIKRAM2725/Zestora.git
cd Zestora
```

---

# 💻 Frontend Setup

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file with the required frontend configuration.

Start the development server:

```bash
npm start
```

---

# ⚙️ Backend Setup

Open another terminal:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create the required `.env` file locally.

Start the backend:

```bash
npm start
```

---

# 🤖 AI Chatbot Setup

Open another terminal:

```bash
cd chatbot
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create:

```text
chatbot/.env
```

Add:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Never commit this file to GitHub.

---

# ▶️ Run the AI Chatbot API

From the `chatbot` directory:

```bash
uvicorn main:app --reload --port 8000
```

The API will run at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

# 🔑 Environment Variables

Environment files are intentionally excluded from the repository.

### Frontend

```env
REACT_APP_API_URL=YOUR_BACKEND_URL
REACT_APP_RAG_API_URL=YOUR_RAG_API_URL
REACT_APP_WHATSAPP_NUMBER=YOUR_WHATSAPP_NUMBER
```

### Backend

Configure the required environment variables for:

* MongoDB
* JWT
* Cloudinary
* Email
* SMS
* Payment services
* Other backend integrations

### Chatbot

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Never publish API keys, database credentials, JWT secrets, or other private credentials.**

---

# 📋 Requirements

### Node.js

A supported Node.js version is required for the frontend and backend.

### Python

Python is required for the AI chatbot.

### MongoDB

MongoDB is required for backend application data.

### Gemini API

The AI chatbot requires a Gemini API key.

---

# 🌐 Deployment

Zestora consists of three main services:

```text
┌────────────────────┐
│   React Frontend   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Node.js / Express  │
│      Backend       │
└─────────┬──────────┘
          │
          ▼
       MongoDB


┌────────────────────┐
│   React Chatbot    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Python / FastAPI   │
│      RAG API       │
└────────────────────┘
```

The services can be deployed independently.

Environment variables should be configured directly on the deployment platform.

---

# 🔒 Security

The repository excludes sensitive and unnecessary development files such as:

* `.env`
* API keys
* Database credentials
* Authentication secrets
* `node_modules`
* Python virtual environments
* Build output
* Local development files

Sensitive configuration should always be stored using environment variables.

---

# 📄 License

A license file is not currently included in the repository.

If Zestora is intended to be open source, add an appropriate license before allowing others to reuse or redistribute the project.

---

# 👨‍💻 Developer

## Bikram Ghosh

Computer Engineering Student
Full-Stack Developer | AI/ML Developer

GitHub:
https://github.com/BIKRAM2725

---

# ⭐ Zestora

**Authentic flavours, quality ingredients, and a modern shopping experience.**
