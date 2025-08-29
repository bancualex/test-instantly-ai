# AI Email Generation Setup

## Environment Configuration

1. **Create a `.env` file** in the backend root directory:

   ```bash
   touch .env
   ```

2. **Add your OpenAI API Key** to the `.env` file:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Get an OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in
   - Go to API Keys section
   - Create a new secret key
   - Copy the key to your `.env` file

## AI Endpoints

### 1. **Generate Email (Non-streaming)**

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

### 2. **Stream Email Generation (Server-Sent Events)**

```http
GET /ai/stream-email?prompt=Meeting request for Tuesday&recipientInfo=Tech startup CEO
```

**Response Stream:**

```
data: {"type":"classification","status":"classifying"}

data: {"type":"classification","emailType":"follow-up"}

data: {"type":"generation","status":"generating"}

data: {"type":"subject","content":"Tuesday Meeting Request"}

data: {"type":"body","content":"Hi,","isComplete":false}

data: {"type":"body","content":"Hi, I","isComplete":false}

event: done
data: {}
```

### 3. **Classify Prompt (Utility)**

```http
POST /ai/classify
Content-Type: application/json

{
  "prompt": "Pitch our new product to potential clients"
}
```

**Response:**

```json
{
  "emailType": "sales"
}
```

## AI Assistant Types

### **Sales Assistant**

- **Triggers**: Sales, pitching, business development, lead generation, product promotion
- **Characteristics**:
  - Under 40 words total
  - 7-10 words per sentence maximum
  - Direct and action-oriented
  - Includes clear call-to-action

### **Follow-up Assistant**

- **Triggers**: Check-ins, follow-ups, reminders, status updates, relationship maintenance
- **Characteristics**:
  - Polite and respectful tone
  - Clear purpose and context
  - Professional but friendly
  - Appropriate persistence level

## Integration Example

```javascript
// Frontend integration example
const generateEmail = async (prompt) => {
  const response = await fetch("/ai/generate-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return response.json();
};

// Streaming example
const streamEmail = (prompt) => {
  const eventSource = new EventSource(
    `/ai/stream-email?prompt=${encodeURIComponent(prompt)}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "subject":
        setSubject(data.content);
        break;
      case "body":
        setBody(data.content);
        break;
      case "complete":
        eventSource.close();
        break;
    }
  };
};
```

## Error Handling

If the OpenAI API key is missing or invalid, the endpoints will return appropriate error messages:

```json
{
  "error": "Failed to generate email. Please check your OpenAI API key configuration."
}
```

Make sure to handle these errors gracefully in your frontend application.
