import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import NFTGenPage from "./pages/NFTGenPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/nft-gen" element={<NFTGenPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App