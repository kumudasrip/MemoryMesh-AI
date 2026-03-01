# 🧠MemoryMesh – Adaptive Cognitive Intelligence

MemoryMesh is an AI-powered cognitive analytics dashboard developed for the AMD Slingshot Hackathon.

It transforms static PDFs into structured knowledge networks by extracting core concepts, mapping relationships, and computing concept strength scores for deeper understanding.

---

## 🚀 Overview

MemoryMesh processes academic PDFs on the client side, extracts structured text, leverages Gemini AI for concept identification, and visualizes relationships as an interactive knowledge graph.

The goal is to convert dense learning material into measurable, navigable cognitive structures.

---

## 🧠 Core Features

- 📄 Client-side PDF parsing using pdf.js  
- 🤖 AI-driven concept extraction via Google Gemini API  
- 🕸 Interactive knowledge graph visualization  
- 📊 Similarity-based concept strength scoring  
- ⚡ Responsive React dashboard  

---

## 🏗 System Architecture

PDF → pdf.js → Text Extraction  
Text → Gemini API → Concept Identification  
Concepts → Similarity Scoring → Knowledge Graph Rendering  

---

## 🛠 Tech Stack

### Frontend
- React  
- TypeScript  
- Vite  

### Document Processing
- pdf.js (Client-side PDF Parsing)

### AI Integration
- Google Gemini API  

### Intelligence Layer
- Concept relationship mapping  
- Similarity-based scoring algorithm  

---

## 📂 Project Structure
```
├── src
│   ├── components   
|   │   ├── KnowledgeGraph.tsx     
│   ├── utils
|   │   ├── nlp.ts     
│   ├── App.tsx
|   ├── index.css     
│   └── main.tsx     
├── vite.config.ts   
└── tsconfig.json
```
---

## ⚙️ Setup & Installation

### 1. Clone the repository

git clone https://github.com/kumudasrip/MemoryMesh-AI.git 

cd MemoryMesh-AI 

### 2. Install dependencies

npm install  

### 3. Configure environment variables

Create a `.env` file in the root directory:

GEMINI_API_KEY=your_gemini_api_key_here  

### 4. Run the development server

npm run dev  

The app runs at:  
http://localhost:5173  

---

## 🔐 Environment Variables

| Variable | Description |
|----------|------------|
| GEMINI_API_KEY | Required for Gemini AI API requests |

---

## 🎯 Developed For

AMD Slingshot Hackathon

---

## 📌 Future Enhancements

- Persistent storage of generated knowledge graphs  
- Multi-document merging  
- Adaptive learning feedback system  
- Export graph as image or PDF  

---

## 📄 License

This project is developed for educational and hackathon purposes.
