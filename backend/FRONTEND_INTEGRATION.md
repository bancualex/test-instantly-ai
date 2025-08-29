# Frontend Integration Guide

This guide provides everything the frontend needs to implement the complete email application with AI-powered drafting functionality.

## 🎯 Required Features Overview

Based on the requirements, the frontend must implement:

1. **📧 Email Management**: Sidebar list, email display, CRUD operations
2. **✍️ Email Composition**: Form with To, CC, BCC, Subject, Body fields
3. **🤖 AI Integration**: "AI ✨" button with real-time content generation
4. **🎨 UI/UX**: Apple Mail style design using MUI

---

## 📡 Backend API Endpoints

### **Email CRUD Operations**

#### **Get All Emails**

```http
GET /emails
```

**Response:**

```json
{
  "emails": [
    {
      "id": 1,
      "to": "john@example.com",
      "cc": "",
      "bcc": "",
      "subject": "Meeting Request",
      "body": "Hi John, I'd like to schedule a meeting...",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

#### **Get Single Email**

```http
GET /emails/{id}
```

**Response:**

```json
{
  "email": {
    "id": 1,
    "to": "john@example.com",
    "subject": "Meeting Request"
    // ... other fields
  }
}
```

#### **Create New Email**

```http
POST /emails
Content-Type: application/json

{
  "to": "john@example.com",
  "cc": "jane@example.com", // optional
  "bcc": "", // optional
  "subject": "Meeting Request",
  "body": "Email content here"
}
```

#### **Update Email**

```http
PUT /emails/{id}
Content-Type: application/json

{
  "to": "john@example.com",
  "subject": "Updated Subject",
  "body": "Updated content"
}
```

#### **Delete Email**

```http
DELETE /emails/{id}
```

---

## 🤖 AI-Powered Email Drafting

### **AI Classification** (Optional - for testing)

```http
POST /ai/classify
Content-Type: application/json

{
  "prompt": "Meeting request for Tuesday"
}
```

**Response:**

```json
{
  "emailType": "follow-up" // or "sales"
}
```

### **AI Email Generation** (Non-streaming)

```http
POST /ai/generate-email
Content-Type: application/json

{
  "prompt": "Meeting request for Tuesday",
  "recipientInfo": "Tech startup CEO" // optional
}
```

**Response:**

```json
{
  "emailType": "follow-up",
  "subject": "Tuesday Meeting Request",
  "body": "Hi,\n\nI hope this email finds you well..."
}
```

### **AI Email Streaming** (Real-time generation)

```http
GET /ai/stream-email?prompt={encoded_prompt}&recipientInfo={encoded_info}
```

**Server-Sent Events Stream:**

```javascript
// Event types you'll receive:
data: {"type":"classification","status":"classifying"}
data: {"type":"classification","emailType":"follow-up"}
data: {"type":"generation","status":"generating"}
data: {"type":"subject","content":"Tuesday Meeting Request"}
data: {"type":"body","content":"Hi,","isComplete":false}
data: {"type":"body","content":"Hi, I hope","isComplete":false}
// ... progressive body updates
data: {"type":"body","content":"Complete email body","isComplete":true}
data: {"type":"complete","emailType":"follow-up"}
event: done
data: {}
```

## 🚀 **Recommended Streaming Solutions**

### **Option 1: Vercel AI SDK** (⭐ **EASIEST & RECOMMENDED**)

**Why Vercel AI SDK is the best choice:**

- ✅ **Built for streaming** - Designed specifically for this use case
- ✅ **Next.js integration** - Works seamlessly with your frontend
- ✅ **Simple setup** - Minimal code required
- ✅ **TypeScript support** - Excellent developer experience
- ✅ **Error handling** - Built-in retry and error management

**Installation:**

```bash
npm install ai
```

**Frontend Implementation:**

```javascript
import { useCompletion } from "ai/react";

function AIEmailGenerator() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/ai/generate-email", // Your API route
  });

  const handleGenerate = async () => {
    await complete(aiPrompt, {
      body: { recipientInfo },
    });
  };

  // completion updates in real-time as content streams in
  useEffect(() => {
    if (completion) {
      // Parse the streamed content and update form fields
      const lines = completion.split("\n");
      const subject = lines
        .find((l) => l.startsWith("Subject:"))
        ?.replace("Subject:", "")
        .trim();
      const body = lines.slice(1).join("\n");

      setFormData((prev) => ({
        ...prev,
        subject: subject || prev.subject,
        body: body || prev.body,
      }));
    }
  }, [completion]);

  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Email ✨"}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

**API Route (`pages/api/ai/generate-email.js`):**

```javascript
import { OpenAIStream, StreamingTextResponse } from "ai";

export default async function handler(req, res) {
  const { prompt, recipientInfo } = req.body;

  // Call your backend streaming endpoint
  const response = await fetch(
    `http://localhost:3001/ai/stream-email?prompt=${encodeURIComponent(
      prompt
    )}&recipientInfo=${encodeURIComponent(recipientInfo)}`
  );

  // Convert Server-Sent Events to Vercel AI SDK format
  const stream = new ReadableStream({
    start(controller) {
      const reader = response.body.getReader();

      function pump() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }

          // Parse SSE data and format for Vercel AI SDK
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.type === "subject") {
                controller.enqueue(`Subject: ${data.content}\n`);
              } else if (data.type === "body") {
                controller.enqueue(data.content);
              }
            }
          }

          return pump();
        });
      }

      return pump();
    },
  });

  return new StreamingTextResponse(stream);
}
```

### **Option 2: LangChain** (More Complex)

**When to use:** If you need complex AI workflows or multiple model orchestration

```javascript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

const model = new ChatOpenAI({
  streaming: true,
  callbackManager: CallbackManager.fromHandlers({
    handleLLMNewToken(token) {
      // Update UI with each token
      setCurrentContent((prev) => prev + token);
    },
  }),
});
```

### **Option 3: LangGraph** (Most Complex)

**When to use:** If you need complex multi-step AI workflows with state management

```javascript
import { StateGraph } from "@langchain/langgraph";

// Only use if you need complex multi-agent workflows
// Overkill for simple email generation
```

## 🎯 **Recommendation: Use Vercel AI SDK**

**For your email application, Vercel AI SDK is perfect because:**

1. **Simple Integration**: Works with your existing Server-Sent Events backend
2. **Real-time Updates**: Handles streaming automatically
3. **Error Handling**: Built-in retry and error management
4. **TypeScript**: Excellent developer experience
5. **Next.js Optimized**: Made for your frontend stack

**Implementation Steps:**

1. Install `ai` package
2. Create API route to proxy your backend streaming
3. Use `useCompletion` hook in your components
4. Handle real-time updates automatically

---

## 🎨 UI Implementation Requirements

### **1. Main Layout (Apple Mail Style)**

```
┌─────────────────────────────────────────────────────┐
│ [Email List Sidebar]    │ [Selected Email Display]  │
│                        │                           │
│ • Email 1              │ To: john@example.com      │
│ • Email 2 (selected)   │ Subject: Meeting Request  │
│ • Email 3              │ ─────────────────────────  │
│                        │ Email body content here... │
│                        │                           │
│ [🖊️ Compose Button]     │                           │
└─────────────────────────────────────────────────────┘
```

**Key Components:**

- **Left Sidebar**: Scrollable email list with selection state
- **Right Panel**: Display selected email details
- **Compose Button**: Floating button in bottom-right corner

### **2. Email Compose Modal/Form**

```
┌─────────────────────────────────────────┐
│ ✉️ Compose Email               [✕ Close] │
├─────────────────────────────────────────┤
│ To: [____________________] 📧           │
│ CC: [____________________]              │
│ BCC:[____________________]              │
│ Subject: [_________________] [AI ✨]     │
│ ┌─────────────────────────────────────┐ │
│ │ Email body...                      │ │
│ │                                    │ │
│ │                                    │ │
│ │                          [AI ✨]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [💾 Save] [📤 Send]        │
└─────────────────────────────────────────┘
```

**Required Fields:**

- **To**: Required email input
- **CC, BCC**: Optional email inputs
- **Subject**: Text input with AI button
- **Body**: Multiline textarea with AI button
- **AI Buttons**: Trigger AI generation modal

### **3. AI Prompt Modal**

```
┌─────────────────────────────────────────┐
│ 🤖 AI Email Assistant          [✕ Close] │
├─────────────────────────────────────────┤
│ What should this email be about?        │
│ ┌─────────────────────────────────────┐ │
│ │ Meeting request for Tuesday...      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Recipient Info (optional):              │
│ ┌─────────────────────────────────────┐ │
│ │ Tech startup CEO                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                    [✨ Generate]        │
└─────────────────────────────────────────┘
```

---

## 💻 Frontend Implementation Guide

### **1. Email List Component**

```javascript
// Fetch and display emails
const [emails, setEmails] = useState([]);
const [selectedEmail, setSelectedEmail] = useState(null);

useEffect(() => {
  fetch("/emails")
    .then((res) => res.json())
    .then((data) => setEmails(data.emails));
}, []);

// Email selection handler
const handleEmailSelect = (email) => {
  setSelectedEmail(email);
};
```

### **2. Email Compose Component**

```javascript
const [formData, setFormData] = useState({
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
});

// Save email to backend
const handleSave = async () => {
  const response = await fetch("/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  if (response.ok) {
    // Update email list, close modal
  }
};
```

### **3. AI Integration Component**

#### **Option A: Using Vercel AI SDK** (⭐ **Recommended**)

```javascript
import { useCompletion } from "ai/react";

function EmailComposeForm() {
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [recipientInfo, setRecipientInfo] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);

  // Vercel AI SDK hook for streaming
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/ai/generate-email",
    onFinish: () => {
      setShowAIModal(false); // Close modal when done
    },
  });

  // Handle AI generation
  const handleAIGenerate = async () => {
    await complete(aiPrompt, {
      body: { recipientInfo },
    });
  };

  // Update form fields as content streams in
  useEffect(() => {
    if (completion) {
      // Parse streamed content (format: "Subject: ...\nBody content...")
      const lines = completion.split("\n");
      const subjectLine = lines.find((l) => l.startsWith("Subject:"));
      const subject = subjectLine?.replace("Subject:", "").trim() || "";
      const body = lines.slice(1).join("\n").trim();

      setFormData((prev) => ({
        ...prev,
        subject: subject || prev.subject,
        body: body || prev.body,
      }));
    }
  }, [completion]);

  return (
    <div>
      {/* Email Form */}
      <input
        value={formData.subject}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, subject: e.target.value }))
        }
        placeholder="Subject"
      />
      <button onClick={() => setShowAIModal(true)}>AI ✨</button>

      <textarea
        value={formData.body}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, body: e.target.value }))
        }
        placeholder="Email body..."
      />

      {/* AI Modal */}
      {showAIModal && (
        <div className="modal">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="What should this email be about?"
          />
          <input
            value={recipientInfo}
            onChange={(e) => setRecipientInfo(e.target.value)}
            placeholder="Recipient info (optional)"
          />
          <button onClick={handleAIGenerate} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate ✨"}
          </button>
          {error && <p>Error: {error.message}</p>}
        </div>
      )}
    </div>
  );
}
```

#### **Option B: Direct Server-Sent Events** (Manual approach)

```javascript
// AI Prompt Modal
const [aiPrompt, setAiPrompt] = useState("");
const [recipientInfo, setRecipientInfo] = useState("");
const [isGenerating, setIsGenerating] = useState(false);

// Manual streaming AI generation
const handleAIGenerate = () => {
  setIsGenerating(true);

  const eventSource = new EventSource(
    `http://localhost:3001/ai/stream-email?prompt=${encodeURIComponent(
      aiPrompt
    )}&recipientInfo=${encodeURIComponent(recipientInfo)}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "classification":
        if (data.emailType) {
          // Show user which assistant is being used
          setAssistantType(data.emailType);
        }
        break;

      case "subject":
        // Update subject field in real-time
        setFormData((prev) => ({
          ...prev,
          subject: data.content,
        }));
        break;

      case "body":
        // Update body field progressively
        setFormData((prev) => ({
          ...prev,
          body: data.content,
        }));
        break;

      case "complete":
        setIsGenerating(false);
        eventSource.close();
        // Close AI modal, allow user editing
        break;
    }
  };

  eventSource.onerror = () => {
    setIsGenerating(false);
    eventSource.close();
    // Handle error
  };
};
```

### **4. Error Handling**

```javascript
// Handle API errors gracefully
const handleError = (error) => {
  if (error.message.includes("OpenAI API key")) {
    // Show user-friendly message about AI setup
    setError("AI features unavailable. Please check configuration.");
  } else {
    setError("Something went wrong. Please try again.");
  }
};
```

---

## 🎭 User Experience Flow

### **Complete AI Email Generation Flow:**

1. **User clicks "AI ✨" button** → Opens AI prompt modal
2. **User enters prompt** (e.g., "Meeting request for Tuesday")
3. **User clicks "Generate"** → Shows loading state
4. **Real-time updates:**
   - Classification appears (Sales/Follow-up)
   - Subject field fills in real-time
   - Body field types out word-by-word
5. **Generation completes** → User can edit both fields
6. **User saves email** → Stored in database & appears in sidebar

### **Assistant Behavior:**

**Sales Assistant:**

- Triggers on: "pitch", "sell", "product", "offer", etc.
- Output: Concise emails (under 40 words, 7-10 words/sentence)
- Style: Direct, action-oriented with clear CTAs

**Follow-up Assistant:**

- Triggers on: "follow up", "check in", "meeting request", etc.
- Output: Professional, detailed emails
- Style: Polite, comprehensive, relationship-focused

---

## 🚀 Quick Start Integration

```javascript
// Essential API calls for a working frontend:

// 1. Load emails on app start
const emails = await fetch("/emails").then((r) => r.json());

// 2. Save new email
await fetch("/emails", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ to, subject, body }),
});

// 3. Generate AI content with streaming
const eventSource = new EventSource(`/ai/stream-email?prompt=${prompt}`);
eventSource.onmessage = handleAIStream;
```

---

## ⚡ Performance Notes

- **Email loading**: Fast (<50ms typical)
- **AI Classification**: ~0.5-2 seconds
- **AI Generation**: ~1.5-5 seconds
- **Streaming**: Real-time updates every ~50ms

---

## 🔧 Required Environment

The backend expects:

- **OpenAI API Key** in `.env` file
- **Database migrations** run (`yarn migrate`)
- **Server running** on port 3001

**Frontend should handle:**

- Missing AI functionality gracefully
- Network errors and timeouts
- Real-time streaming interruptions
- User editing after AI generation

---

This guide provides everything needed to build the complete email application with AI-powered features! 🎉
