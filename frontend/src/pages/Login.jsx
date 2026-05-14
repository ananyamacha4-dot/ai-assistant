import { useState }
from "react";

import {
  useNavigate,
  Link
} from "react-router-dom";

import {
  useAuth
} from "../components/AuthProvider";

export default function Login() {

  const navigate =
    useNavigate();

  const {
    login,
    loginWithGoogle
  } =
    useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleLogin() {

    try {

      await login({
        email,
        password,
      });

      navigate("/");

    } catch (err) {

      alert(err.message);
    }
  }

  async function handleGoogle() {

    try {

      await loginWithGoogle();

      navigate("/");

    } catch (err) {

      alert(err.message);
    }
  }

  return (

    <div className="auth-page">

      <div className="auth-box">

        <h1>Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          onClick={handleLogin}
        >
          Login
        </button>

        <button
          onClick={handleGoogle}
        >
          Continue with Google
        </button>

        <p>

          Don't have an account?

          <Link to="/signup">
            Signup
          </Link>

        </p>

      </div>

    </div>
  );
}
