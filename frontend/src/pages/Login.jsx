import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      switch (err.code) {
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        case "auth/user-not-found":
          setError("No user found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        case "auth/missing-password":
          setError("Password is required.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
        <img src="../../notion icon.png" className="h-16 w-24 mb-4" alt="Notion Logo" />
        <h2 className="text-3xl font-bold mb-2 text-gray-900 tracking-tight">Sign in to Notion</h2>
        <p className="text-gray-500 mb-6 text-sm">Welcome back! Please enter your credentials.</p>
        <div className="w-full flex flex-col gap-3">
          <input
            type="email"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-3 mb-1 w-full text-center">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full mt-4 bg-black text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition"
        >
          Log In
        </button>
        <div className="mt-6 text-sm text-gray-600">
          Don't have an account?{' '}
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => navigate('/signup')}
          >
            Register
          </span>
        </div>
      </div>
    </div>
  );
}
