import { useState } from "react";

export default function App() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");

  const generateContent = async () => {
    const res = await fetch("http://localhost:3000/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: topic }),
    });

    const data = await res.json();
    setResult(data.output);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>LocalHarvest AI 🌱</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic (e.g. Fresh tomatoes)"
        style={{ width: "100%", padding: 10 }}
      />

      <button onClick={generateContent} style={{ marginTop: 10 }}>
        Generate Content
      </button>

      <p style={{ marginTop: 20 }}>{result}</p>
    </div>
  );
}