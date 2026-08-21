// bypass-memstorage.ts
// Bu dosya MemStorage'ı atlayıp doğrudan veritabanını kullanıyor
// Özellikle kullanıcı kimlik doğrulaması için

import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Bu fonksiyonlar doğrudan veritabanını kullanır, MemStorage'ı atlar
// Define cache constants and TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (300,000 ms)

// In-memory caches
const userByUsernameCache = new Map();
const userByIdCache = new Map();

/**
 * Get user by username directly from database, with caching
 */
export async function getUserByUsername(username: string) {
  try {
    // Check cache first
    const cacheKey = `username_${username}`;
    const cachedUser = userByUsernameCache.get(cacheKey);
    
    if (cachedUser && Date.now() - cachedUser.timestamp < CACHE_TTL) {
      return cachedUser.data;
    }
    
    // Explicitly select only the columns we need to avoid missing column errors
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      isActive: users.isActive,
      phoneNumber: users.phoneNumber,
      lastLoginAt: users.lastLoginAt,
      profileImage: users.profileImage,
      preferences: users.preferences,
      parentAgencyId: users.parentAgencyId
      // membershipTierId removed to match the database schema
    }).from(users).where(eq(users.username, username));
    
    if (user) {
      // Only log occasionally to reduce noise
      if (Math.random() < 0.1) {
        console.log(`DB: Kullanıcı bulundu: ${user.username}, ID: ${user.id}, Rol: ${user.role}`);
      }
      
      // Add to cache
      userByUsernameCache.set(cacheKey, {
        data: user,
        timestamp: Date.now()
      });
    } else {
      console.log(`DB: Kullanıcı bulunamadı: ${username}`);
    }
    return user;
  } catch (error) {
    console.error('Veritabanından kullanıcı arama hatası:', error);
    return undefined;
  }
}

/**
 * Get user by ID directly from database, with caching
 */
export async function getUser(id: number) {
  try {
    // Check cache first
    const cacheKey = `user_${id}`;
    const cachedUser = userByIdCache.get(cacheKey);
    
    if (cachedUser && Date.now() - cachedUser.timestamp < CACHE_TTL) {
      return cachedUser.data;
    }
    
    // If not in cache or expired, fetch from DB
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      isActive: users.isActive,
      phoneNumber: users.phoneNumber,
      lastLoginAt: users.lastLoginAt,
      profileImage: users.profileImage,
      preferences: users.preferences,
      parentAgencyId: users.parentAgencyId
      // membershipTierId removed to match the database schema
    }).from(users).where(eq(users.id, id));
    
    if (user) {
      // Only log occasionally to reduce noise
      if (Math.random() < 0.1) {
        console.log(`DB: Kullanıcı ID ile bulundu: ${user.username}, ID: ${user.id}, Rol: ${user.role}`);
      }
      
      // Add to cache
      userByIdCache.set(cacheKey, {
        data: user,
        timestamp: Date.now()
      });
    } else {
      console.log(`DB: Kullanıcı ID ile bulunamadı: ${id}`);
    }
    return user;
  } catch (error) {
    console.error('Veritabanından ID ile kullanıcı arama hatası:', error);
    return undefined;
  }
}

/**
 * Clear all user caches - useful when a user is updated
 */
export function clearUserCaches() {
  userByUsernameCache.clear();
  userByIdCache.clear();
  console.log('Kullanıcı önbellekleri temizlendi');
}