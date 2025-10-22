-- Migration number: 0003 	 2025-10-09T12:28:43.727Z
CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    email TEXT,
    password TEXT
)
CREATE TABLE customers(
    id INTEGER PRIMARY KEY,
    fullName TEXT,
    phoneNumber TEXT,
    profileImg TEXT,
    coverImg TEXT,
    socialMedia TEXT
)