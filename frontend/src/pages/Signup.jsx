import { useState }
from "react";

import {
  useNavigate,
  Link
} from "react-router-dom";

import {
  useAuth
} from "../components/AuthProvider";

export default function Signup() {

  const navigate =
    useNavigate();

  const { signup } =
    useAuth();

  const [email, setEmail] =
    useState("");

  const [name, setName] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleSignup() {

    try {

      await signup({
        email,
        name,
        password,
      });

      navigate("/");

    } catch (err) {

      alert(err.message);
    }
  }

  return (

    <div className="auth-page">

      <div className="auth-box">

        <h1>Signup</h1>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

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
          onClick={handleSignup}
        >
          Signup
        </button>

        <p>

          Already have account?

          <Link to="/login">
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}
