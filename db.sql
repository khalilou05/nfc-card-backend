
CREATE TABLE IF NOT EXISTS "users"(
  "id" INTEGER NOT NULL,
  "email" TEXT,
  "password" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS customers(
  "id" INTEGER NOT NULL,
  "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "email" TEXT,
  "coverImg" TEXT,
  "profileImg" TEXT,
  "socialMedia" TEXT,
  "createdAt" TEXT DEFAULT (DATETIME('now')),
  PRIMARY KEY ("id")
);
