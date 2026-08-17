-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "displayUsername" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'SAVINGS',
    "providerType" TEXT NOT NULL DEFAULT 'BANK',
    "providerName" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "color" TEXT DEFAULT '#3B82F6',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other_expense',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "icon" TEXT NOT NULL DEFAULT 'Tag',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'general',
    "icon" TEXT DEFAULT '🎯',
    "deadline" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_members" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "totalContributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requesterRelType" TEXT NOT NULL DEFAULT 'friend',
    "requesterNickname" TEXT,
    "recipientRelType" TEXT NOT NULL DEFAULT 'friend',
    "recipientNickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_idx" ON "bank_accounts"("userId");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_name_idx" ON "bank_accounts"("userId", "name");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_accountId_idx" ON "transactions"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_slug_key" ON "categories"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "labels_userId_name_key" ON "labels"("userId", "name");

-- CreateIndex
CREATE INDEX "goals_creatorId_idx" ON "goals"("creatorId");

-- CreateIndex
CREATE INDEX "goals_status_idx" ON "goals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "goal_members_goalId_userId_key" ON "goal_members"("goalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_requesterId_recipientId_key" ON "friendships"("requesterId", "recipientId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_members" ADD CONSTRAINT "goal_members_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_members" ADD CONSTRAINT "goal_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
