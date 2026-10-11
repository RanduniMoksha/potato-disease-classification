import React from "react";
import { useState, useRef, useEffect } from "react";
import "./index.css";

const API_URL = "http://localhost:8000/predict";

// What each prediction means and what to do about it
const DISEASE_INFO = {
  healthy: {
    key: "healthy",
    title: "Healthy",
    summary: "No signs of disease were found on this leaf.",
    advice: [
      "Keep your regular watering and feeding routine.",
      "Check plants weekly, especially after rain.",
      "Rotate crops each season to keep soil healthy.",
    ],
  },
  early: {
    key: "early",
    title: "Early Blight",
    summary:
      "Caused by the fungus Alternaria solani. It shows as dark spots with ring patterns, usually on older leaves first.",
    advice: [
      "Remove and destroy the affected leaves.",
      "Water at the base of the plant, not over the leaves.",
      "Apply a fungicide labelled for early blight.",
    ],
  },
  late: {
    key: "late",
    title: "Late Blight",
    summary:
      "Caused by Phytophthora infestans. It spreads fast in cool, wet weather and can destroy a crop within days.",
    advice: [
      "Act quickly: remove infected plants and do not compost them.",
      "Apply a fungicide labelled for late blight.",
      "Check nearby plants and tubers for spread.",
    ],
  },
};

function getInfo(label = "") {
  const text = String(label).toLowerCase();
  if (text.includes("early")) return DISEASE_INFO.early;
  if (text.includes("late")) return DISEASE_INFO.late;
  if (text.includes("health")) return DISEASE_INFO.healthy;
  return {
    key: "unknown",
    title: String(label),
    summary: "This result is not one of the known categories.",
    advice: ["Try a clearer photo of a single leaf."],
  };
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  const percent = number <= 1 ? number * 100 : number;
  return Math.min(100, Math.max(0, percent));
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  // Free the preview URL when it changes or the page closes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const loadFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Choose a JPG or PNG photo.");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };

  const handleFileChange = (event) => {
    loadFile(event.target.files[0]);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    loadFile(event.dataTransfer.files[0]);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  // Send image to FastAPI
  const handlePredict = async () => {
    if (!selectedFile) {
      setError("Choose a leaf image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("The server could not analyse this image. Try another one.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Can't reach the prediction API. Start the FastAPI server on port 8000 and try again."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const info = result ? getInfo(result.class) : null;
  const confidence = result ? normalizeConfidence(result.confidence) : 0;

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <svg viewBox="0 0 32 32" className="brand-mark" aria-hidden="true">
            <path
              d="M16 3C9 8 6 14 6 19c0 5 4 9 10 10 6-1 10-5 10-10 0-5-3-11-10-16Z"
              fill="currentColor"
            />
            <path
              d="M16 9v18M16 15l-5-3M16 20l6-4"
              stroke="#f1f5ec"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span>Potato Leaf Check</span>
        </div>
      </header>

      <main className="main">
        <section className="intro">
          <h1>Is your potato plant healthy?</h1>
          <p>
            Upload a clear photo of one leaf. The model tells you whether it is
            healthy or shows early blight or late blight.
          </p>
        </section>

        <div className="workspace">
          {/* Left: upload */}
          <section className="panel upload-panel" aria-label="Upload leaf image">
            {!preview ? (
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
              >
                <svg viewBox="0 0 48 48" className="drop-icon" aria-hidden="true">
                  <path
                    d="M24 33V15m0 0-7 7m7-7 7 7M10 36h28"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <p className="drop-title">Drop a leaf photo here</p>
                <p className="drop-hint">or click to browse. JPG or PNG.</p>
              </div>
            ) : (
              <div className="preview">
                <div className="preview-frame">
                  <img src={preview} alt="Selected potato leaf" />
                  {loading && <div className="scan" aria-hidden="true" />}
                </div>
                <p className="file-name">{selectedFile?.name}</p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />

            <div className="actions">
              <button
                className="btn primary"
                onClick={handlePredict}
                disabled={loading || !selectedFile}
              >
                {loading ? "Analysing leaf…" : "Check leaf"}
              </button>

              {preview && (
                <button
                  className="btn ghost"
                  onClick={() => inputRef.current?.click()}
                  disabled={loading}
                >
                  Change image
                </button>
              )}

              {preview && (
                <button className="btn ghost" onClick={handleReset} disabled={loading}>
                  Clear
                </button>
              )}
            </div>

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
          </section>

          {/* Right: result */}
          <section className="panel result-panel" aria-live="polite" aria-label="Result">
            {!result && !loading && (
              <div className="empty">
                <h2>Your result will appear here</h2>
                <p>Add a leaf photo and choose Check leaf.</p>
                <ul className="legend">
                  <li>
                    <span className="dot healthy" /> Healthy
                  </li>
                  <li>
                    <span className="dot early" /> Early blight
                  </li>
                  <li>
                    <span className="dot late" /> Late blight
                  </li>
                </ul>
              </div>
            )}

            {loading && (
              <div className="empty">
                <h2>Analysing your leaf…</h2>
                <p>This usually takes a few seconds.</p>
              </div>
            )}

            {result && info && (
              <div className={`result ${info.key}`}>
                <p className="result-label">Result</p>
                <h2 className="result-title">{info.title}</h2>

                <div className="meter">
                  <div className="meter-head">
                    <span>Confidence</span>
                    <strong>{confidence.toFixed(1)}%</strong>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${confidence}%` }} />
                  </div>
                </div>

                <p className="summary">{info.summary}</p>

                <h3>What to do</h3>
                <ul className="advice">
                  {info.advice.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        Results come from a trained model and are a guide, not a diagnosis. For
        serious outbreaks, ask a local agricultural advisor.
      </footer>
    </div>
  );
}

export default App;