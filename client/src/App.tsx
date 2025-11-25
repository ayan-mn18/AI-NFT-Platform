import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import LandingPage from "./pages/LandingPage"
import NFTGenPage from "./pages/NFTGenPage"
import CookNFTPage from "./pages/CookNFTPage"
import RegisterPage from "./pages/RegisterPage"
import LoginPage from "./pages/LoginPage"

import ProfilePage from "./pages/ProfilePage"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/nft-gen" element={<NFTGenPage />} />
            <Route path="/cook-nft" element={<CookNFTPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App