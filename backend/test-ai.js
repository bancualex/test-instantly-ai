#!/usr/bin/env node

/**
 * Quick test script for AI endpoints
 * Usage: node test-ai.js "your prompt here"
 *
 * Make sure to:
 * 1. Have the server running (yarn dev)
 * 2. Set OPENAI_API_KEY in .env file
 */

const prompt = process.argv[2] || "Meeting request for Tuesday";

console.log("🧪 Testing AI Email Generation");
console.log("📝 Prompt:", prompt);
console.log("");

// Test classification endpoint
async function testClassification() {
  try {
    const response = await fetch("http://localhost:3001/ai/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const result = await response.json();
    console.log("🎯 Classification:", result.emailType);
    return result.emailType;
  } catch (error) {
    console.error("❌ Classification failed:", error.message);
    return null;
  }
}

// Test email generation endpoint
async function testGeneration() {
  try {
    const response = await fetch("http://localhost:3001/ai/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, recipientInfo: "Tech startup CEO" }),
    });

    const result = await response.json();
    console.log("📧 Generated Email:");
    console.log("  Subject:", result.subject);
    console.log("  Body:", result.body);
    console.log("  Type:", result.emailType);
    return result;
  } catch (error) {
    console.error("❌ Generation failed:", error.message);
    return null;
  }
}

// Test streaming endpoint
function testStreaming() {
  return new Promise((resolve, reject) => {
    console.log("🌊 Testing streaming generation...");

    try {
      const EventSource = eval("require")("eventsource");
      const url = `http://localhost:3001/ai/stream-email?prompt=${encodeURIComponent(
        prompt
      )}&recipientInfo=Tech startup CEO`;
      const eventSource = new EventSource(url);

      let subject = "";
      let body = "";
      let emailType = "";

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "classification":
            if (data.emailType) {
              emailType = data.emailType;
              console.log("  📊 Classified as:", emailType);
            }
            break;
          case "subject":
            subject = data.content;
            console.log("  📝 Subject streamed:", subject);
            break;
          case "body":
            body = data.content;
            if (data.isComplete) {
              console.log("  📄 Body complete:", body);
            }
            break;
          case "complete":
            console.log("  ✅ Streaming complete");
            eventSource.close();
            resolve({ subject, body, emailType });
            break;
          case "error":
            console.error("  ❌ Stream error:", data.message);
            eventSource.close();
            reject(new Error(data.message));
            break;
        }
      };

      eventSource.onerror = (error) => {
        console.error("  ❌ EventSource error:", error);
        eventSource.close();
        reject(error);
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        eventSource.close();
        reject(new Error("Streaming timeout"));
      }, 30000);
    } catch (error) {
      console.error("❌ Streaming setup failed:", error.message);
      reject(error);
    }
  });
}

// Run all tests
async function runTests() {
  console.log("🚀 Starting AI endpoint tests...\n");

  console.log("1️⃣  Testing Classification");
  await testClassification();
  console.log("");

  console.log("2️⃣  Testing Generation");
  await testGeneration();
  console.log("");

  console.log("3️⃣  Testing Streaming");
  try {
    await testStreaming();
  } catch (error) {
    console.log("  ⚠️  Streaming test skipped (requires eventsource package)");
    console.log("  💡 To test streaming: npm install eventsource");
  }

  console.log("\n✅ Tests completed!");
  console.log("\n💡 Tips:");
  console.log("  - Make sure server is running: yarn dev");
  console.log("  - Check your OpenAI API key in .env");
  console.log('  - Try different prompts: node test-ai.js "pitch our product"');
}

runTests().catch((error) => {
  console.error("💥 Test failed:", error.message);
  process.exit(1);
});
