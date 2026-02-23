import React, {useState} from "react";
import { account } from "../core/appwrite";
import { useAuth } from "../core/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await account.createEmailPasswordSession(email, password);
            await checkAuth();
            navigate("/");
        } catch (error: any) {
            setError(error.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

   return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] font-inter">
            <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md text-center">
                <h1 className="text-3xl font-inter-bold text-gray-900 mb-2">CivicSnap Admin</h1>
                <p className="text-gray-500 mb-8 font-inter-regular">Log in op je Super Admin account.</p>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-inter-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input 
                        type="email" 
                        placeholder="E-mailadres" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter-regular"
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Wachtwoord" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter-regular"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'LADEN...' : 'INLOGGEN'}
                    </button>
                </form>
            </div>
        </div>
    );

};