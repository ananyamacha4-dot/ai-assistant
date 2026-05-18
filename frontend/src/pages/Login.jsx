import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">
          {isSignup ? "Create account" : "Sign in"}
        </h1>

        <form onSubmit={handleSubmit} className="login-form">
          {isSignup && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="login-input"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Sign up"
              : "Sign in"}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-google"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continue with Google
        </button>

        <p className="login-toggle">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
