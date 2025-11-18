# AuraMint - Project Plan

## 📋 Project Overview
Build a full-stack AI-powered NFT generation and marketplace platform where merchants can create, list, and sell AI-generated NFTs to customers.

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js (or similar)
- **Database**: PostgreSQL / MongoDB (TBD)
- **Authentication**: JWT + email/password (v1)
- **AI Integration**: DALL-E API, OpenAI API
- **Payment**: Stripe API
- **Blockchain**: Web3.js or Ethers.js (for NFT minting)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux / Zustand (TBD)
- **HTTP Client**: Axios / Fetch API

---

## 🎯 Core Features (MVP)

### 1. Authentication & User Management
- [x] Email & password registration
- [ ] Email verification (v1.1)
- [ ] Google OAuth integration (v2)
- [ ] JWT token management
- [ ] Role-based access (Merchant / Buyer)

### 2. NFT Generation
- [ ] AI-powered image generation via DALL-E
- [ ] Merchant dashboard for prompts & settings
- [ ] Batch NFT generation support
- [ ] Image preview before minting
- [ ] Metadata editor (name, description, traits)

### 3. NFT Marketplace
- [ ] List generated NFTs for sale
- [ ] Browse & filter NFT listings
- [ ] NFT detail page with metadata
- [ ] Shopping cart functionality
- [ ] Wishlist / Favorites

### 4. Payment & Checkout
- [ ] Stripe integration for payments
- [ ] Secure payment processing
- [ ] Order history & receipts
- [ ] Refund handling

### 5. Blockchain Integration (Future)
- [ ] NFT minting to blockchain
- [ ] Wallet connection (MetaMask, etc.)
- [ ] Smart contract interaction
- [ ] On-chain ownership verification

---

## 📅 Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Project setup (backend & frontend repos)
- Database schema design
- User authentication (email/password)
- Merchant & Buyer user types

### Phase 2: AI & NFT Generation (Weeks 3-4)
- DALL-E API integration
- NFT generation endpoint
- Image upload & storage
- Metadata management

### Phase 3: Marketplace (Weeks 5-6)
- NFT listing system
- Browse & search functionality
- Detail pages & rich media display
- Shopping cart

### Phase 4: Payment Integration (Weeks 7-8)
- Stripe API integration
- Checkout flow
- Order management
- Transaction history

### Phase 5: Polish & Deploy (Weeks 9+)
- Testing (unit, integration, e2e)
- Performance optimization
- UI/UX refinements
- Production deployment

---

## 🔌 API Endpoints (Preliminary)

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout
- `POST /auth/verify-email` - Email verification (v1.1)

### NFT Generation
- `POST /nft/generate` - Generate NFT from prompt (merchant only)
- `GET /nft/generations/:id` - Get generation status
- `GET /nft/:id` - Get NFT details

### Marketplace
- `GET /nft/listings` - Browse NFTs
- `POST /nft/:id/list` - List NFT for sale
- `DELETE /nft/:id/listing` - Remove listing

### Payment
- `POST /order/checkout` - Create checkout session
- `POST /order/confirm` - Confirm payment
- `GET /order/history` - User order history

### Users
- `GET /user/profile` - Get profile
- `PUT /user/profile` - Update profile
- `GET /user/inventory` - Merchant's NFT inventory

---

## 📦 Database Schema (TBD - Design Phase)

**Tables/Collections:**
- Users (id, email, password_hash, role, created_at)
- NFTs (id, owner_id, metadata, image_url, minted_at)
- Listings (id, nft_id, price, status, created_at)
- Orders (id, buyer_id, listing_id, amount, status, created_at)
- Generations (id, merchant_id, prompt, image_url, status)

---

## 🚀 Getting Started

```bash
# Backend setup
git clone <repo> && cd backend
npm install
npm run dev

# Frontend setup
git clone <repo> && cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

```env
# Backend
DATABASE_URL=
STRIPE_SECRET_KEY=
OPENAI_API_KEY=
JWT_SECRET=

# Frontend
VITE_API_BASE_URL=
VITE_STRIPE_PUBLIC_KEY=
```

---

## 📝 Notes & Future Enhancements

- Email verification & Google OAuth (Phase 2)
- Blockchain integration & wallet support (Phase 3+)
- Multi-image AI generation models
- Community features (comments, ratings)
- Admin dashboard for platform management
- Analytics & dashboards for merchants

---

## ✅ Checklist for Next Steps

- [ ] Set up Git repositories (backend & frontend)
- [ ] Configure development environments
- [ ] Design database schema
- [ ] Scaffold backend project
- [ ] Scaffold frontend project
- [ ] Begin Phase 1 implementation (Later )



