import { useLocation }
from "react-router-dom";

import { useState }
from "react";

import "../index.css";

export default function Interpreter() {

  const location =
    useLocation();

  const [code, setCode] =
    useState(
      location.state?.code || ""
    );

  const [output, setOutput] =
  useState("");
  const [userInput, setUserInput] =
  useState("");

  const [loading, setLoading] =
    useState(false);

  const runCode = async () => {

    try {

      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8001/run-python",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
  code,
  user_input: userInput,
}),
          
        }
      );

      const data =
        await response.json();

      setOutput(
        data.output
      );

    } catch (error) {

      setOutput(
        "Execution failed"
      );
    }

    setLoading(false);
  };

  return (

  <div className="interpreter-container">

    {/* LEFT SIDE */}

    <div className="editor-panel">

      <div className="panel-header">
        Python Editor
      </div>

      <textarea

        value={code}

        onChange={(e) =>
          setCode(
            e.target.value
          )
        }
      />
      <div className="input-panel">

  <div className="panel-header">
    Program Input
  </div>

  <textarea
    className="stdin-box"
    placeholder="Enter input values here..."
    value={userInput}
    onChange={(e) =>
      setUserInput(
        e.target.value
      )
    }
  />

</div>

      <button
        className="run-code-btn"
        onClick={runCode}
      >

        {
          loading
            ? "Running..."
            : "Run Code"
        }

      </button>

    </div>

    {/* RIGHT SIDE */}

    <div className="terminal-panel">

      <div className="panel-header">
        Terminal Output
      </div>

      <div className="terminal-output">

        <pre>
          {
            output ||
            "Run code to see output..."
          }
        </pre>

      </div>

    </div>

  </div>
);}