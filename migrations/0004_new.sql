-- Migration number: 0004 	 2025-10-09T12:36:25.658Z

CREATE TABLE "users"(
    id INTEGER PRIMARY KEY,
    email TEXT,
    password TEXT
    
);

CREATE TABLE customers(
    id INTEGER PRIMARY KEY,
    fullName TEXT,
    phoneNumber TEXT,
    profileImg TEXT,
    coverImg TEXT,
    socialMedia TEXT
);

INSERT INTO users (email,password) VALUES ('admin@gmail.com','admin');