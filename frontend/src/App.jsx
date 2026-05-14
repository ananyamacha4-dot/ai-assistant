import "./index.css";

import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatPage from "./pages/ChatPage";
import Interpreter from "./pages/Interpreter";

import ProtectedRoute from "./components/ProtectedRoute";

import {
  AuthProvider
} from "./components/AuthProvider";

export default function App() {

  return (

    <BrowserRouter>

      <AuthProvider>

        <Routes>

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Signup />}
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>

                <ChatPage />

              </ProtectedRoute>
            }
          />
            <Route
    path="/interpreter"
    element={
        <ProtectedRoute>

        <Interpreter />

        </ProtectedRoute>
    }
    />

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
}