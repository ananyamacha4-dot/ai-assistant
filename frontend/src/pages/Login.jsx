import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import AnimatedLoginPage from "../components/ui/animated-characters-login-page";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();

  const handleLogin = async ({ email, password }) => {
    await login({ email, password });
    navigate("/");
  };

  const handleSignup = async ({ name, email, password }) => {
    await signup({ name, email, password });
    navigate("/");
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    navigate("/");
  };

  return (
    <AnimatedLoginPage
      onLogin={handleLogin}
      onSignup={handleSignup}
      onGoogleLogin={handleGoogle}
    />
  );
}
