import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
     
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl font-extrabold text-black-500 leading-tight">
          Welcome to <span className="text-black-900">Notion</span>
        </h1>
        <p className="mt-6 text-2xl text-gray-600">
          Collaborate with your team in real-time. Edit, comment, and create documents like Never Before.
        </p>
      </div>

       
      <div className="flex items-center gap-4 border border-gray-300 rounded-xl px-6 py-3 mt-10 shadow-md">
        <img src="/notion icon.png" alt="Notion Logo" className="h-16 w-24" />
        <div className="text-2xl font-semibold text-gray-800">Akash Notion</div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-lg text-gray-700 mb-4">
          Already have an account? <span className="font-semibold text-blue-600">Login</span> or{' '}
          <span className="font-semibold text-blue-600">Sign up</span> if you're new.
        </p>
        <div className="flex gap-6 justify-center">
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
