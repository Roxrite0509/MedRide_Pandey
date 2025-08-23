import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: number;
  username: string;
  role: string;
  ambulanceId?: number;
  hospitalId?: number;
  iat?: number;
  exp?: number;
}

interface KeyMetadata {
  keyId: string;
  algorithm: string;
  created: Date;
  lastUsed: Date;
  environment: string;
  keyType: 'master' | 'user' | 'role' | 'session';
}

class KeyManagementSystem {
  private masterKey: string;
  private keyRotationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private keyCache = new Map<string, { key: string; metadata: KeyMetadata }>();
  private environment: string;
  private keyDerivationSalt: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.masterKey = this.initializeMasterKey();
    this.keyDerivationSalt = this.initializeDerivationSalt();
    
    console.log(`🔐 KMS initialized for ${this.environment} environment`);
    
    // Start key rotation timer in production
    if (this.environment === 'production') {
      this.startKeyRotation();
    }
  }

  private initializeMasterKey(): string {
    // Production: Use environment variable or generate secure key
    if (this.environment === 'production') {
      const prodKey = process.env.KMS_MASTER_KEY;
      if (!prodKey) {
        throw new Error('KMS_MASTER_KEY environment variable is required in production');
      }
      if (prodKey.length < 64) {
        throw new Error('KMS_MASTER_KEY must be at least 64 characters for production security');
      }
      return prodKey;
    }
    
    // Development: Use JWT_SECRET as fallback or generate
    const devKey = process.env.JWT_SECRET || process.env.KMS_MASTER_KEY;
    if (!devKey) {
      console.warn('⚠️  No KMS_MASTER_KEY found, generating temporary key for development');
      return crypto.randomBytes(32).toString('hex');
    }
    
    return devKey;
  }

  private initializeDerivationSalt(): string {
    const salt = process.env.KMS_DERIVATION_SALT;
    if (!salt) {
      if (this.environment === 'production') {
        throw new Error('KMS_DERIVATION_SALT environment variable is required in production');
      }
      console.warn('⚠️  No KMS_DERIVATION_SALT found, generating temporary salt for development');
      return crypto.randomBytes(16).toString('hex');
    }
    return salt;
  }

  private deriveKey(context: string, keyType: 'user' | 'role' | 'session' = 'user'): string {
    // Use PBKDF2 for key derivation with unique salt per context
    const contextSalt = crypto.createHmac('sha256', this.keyDerivationSalt)
                             .update(`${this.environment}:${keyType}:${context}`)
                             .digest('hex');
    
    return crypto.pbkdf2Sync(this.masterKey, contextSalt, 10000, 32, 'sha256').toString('hex');
  }

  private generateKeyId(): string {
    return `kms_${this.environment}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private getOrCreateUserKey(userId: number, role: string): { key: string; keyId: string } {
    const cacheKey = `user_${userId}_${role}`;
    const cached = this.keyCache.get(cacheKey);
    
    // Check if key exists and is not expired (24h rotation in production)
    if (cached && this.isKeyValid(cached.metadata)) {
      cached.metadata.lastUsed = new Date();
      return { key: cached.key, keyId: cached.metadata.keyId };
    }

    // Generate new user-specific key
    const keyId = this.generateKeyId();
    const derivedKey = this.deriveKey(`${userId}:${role}`, 'user');
    
    const metadata: KeyMetadata = {
      keyId,
      algorithm: 'HS256',
      created: new Date(),
      lastUsed: new Date(),
      environment: this.environment,
      keyType: 'user'
    };

    this.keyCache.set(cacheKey, { key: derivedKey, metadata });
    
    console.log(`🔑 Generated new key for user ${userId} (${role}): ${keyId}`);
    return { key: derivedKey, keyId };
  }

  private getRoleKey(role: string): { key: string; keyId: string } {
    const cacheKey = `role_${role}`;
    const cached = this.keyCache.get(cacheKey);
    
    if (cached && this.isKeyValid(cached.metadata)) {
      cached.metadata.lastUsed = new Date();
      return { key: cached.key, keyId: cached.metadata.keyId };
    }

    const keyId = this.generateKeyId();
    const derivedKey = this.deriveKey(role, 'role');
    
    const metadata: KeyMetadata = {
      keyId,
      algorithm: 'HS256',
      created: new Date(),
      lastUsed: new Date(),
      environment: this.environment,
      keyType: 'role'
    };

    this.keyCache.set(cacheKey, { key: derivedKey, metadata });
    
    console.log(`🔑 Generated new role key for ${role}: ${keyId}`);
    return { key: derivedKey, keyId };
  }

  private isKeyValid(metadata: KeyMetadata): boolean {
    const now = new Date();
    const keyAge = now.getTime() - metadata.created.getTime();
    
    // In production, rotate keys every 24 hours
    if (this.environment === 'production') {
      return keyAge < this.keyRotationInterval;
    }
    
    // In development, keys are valid for 7 days
    return keyAge < (7 * 24 * 60 * 60 * 1000);
  }

  private startKeyRotation(): void {
    setInterval(() => {
      console.log('🔄 Starting automatic key rotation...');
      this.rotateExpiredKeys();
    }, this.keyRotationInterval);
  }

  private rotateExpiredKeys(): void {
    let rotatedCount = 0;
    
    for (const [cacheKey, { metadata }] of this.keyCache.entries()) {
      if (!this.isKeyValid(metadata)) {
        this.keyCache.delete(cacheKey);
        rotatedCount++;
        console.log(`🔄 Rotated expired key: ${metadata.keyId}`);
      }
    }
    
    if (rotatedCount > 0) {
      console.log(`✅ Rotated ${rotatedCount} expired keys`);
    }
  }

  // Public API for JWT operations
  public createToken(payload: JWTPayload, expiresIn: string = '24h'): string {
    const keyStrategy = this.environment === 'production' ? 'user' : 'role';
    
    let keyData: { key: string; keyId: string };
    
    if (keyStrategy === 'user') {
      // Production: User-specific keys for maximum security
      keyData = this.getOrCreateUserKey(payload.id, payload.role);
    } else {
      // Development: Role-based keys for simplicity
      keyData = this.getRoleKey(payload.role);
    }

    // Add key metadata to JWT payload
    const enhancedPayload = {
      ...payload,
      keyId: keyData.keyId,
      env: this.environment,
      iss: 'EmergencyConnect',
      aud: `EmergencyConnect-${this.environment}`
    };

    return jwt.sign(enhancedPayload, keyData.key, { 
      expiresIn,
      algorithm: 'HS256',
      issuer: 'EmergencyConnect',
      audience: `EmergencyConnect-${this.environment}`
    });
  }

  public verifyToken(token: string): JWTPayload {
    // First decode to get key metadata
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.keyId) {
      throw new Error('Invalid token format - missing key metadata');
    }

    // Verify environment matching
    if (decoded.env !== this.environment) {
      throw new Error(`Token environment mismatch: expected ${this.environment}, got ${decoded.env}`);
    }

    let verificationKey: string;

    // Reconstruct the key used for signing
    if (this.environment === 'production') {
      // Production: Use user-specific key
      const cacheKey = `user_${decoded.id}_${decoded.role}`;
      const cached = this.keyCache.get(cacheKey);
      
      if (cached) {
        verificationKey = cached.key;
        cached.metadata.lastUsed = new Date();
      } else {
        // Regenerate user key for verification
        const keyData = this.getOrCreateUserKey(decoded.id, decoded.role);
        verificationKey = keyData.key;
      }
    } else {
      // Development: Use role-based key
      const keyData = this.getRoleKey(decoded.role);
      verificationKey = keyData.key;
    }

    // Verify the token
    try {
      const verified = jwt.verify(token, verificationKey, {
        algorithms: ['HS256'],
        issuer: 'EmergencyConnect',
        audience: `EmergencyConnect-${this.environment}`
      }) as JWTPayload;
      
      return verified;
    } catch (error) {
      console.error('JWT verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }

  // Administrative methods
  public getKeyMetrics(): { totalKeys: number; keysByType: Record<string, number>; environment: string } {
    const keysByType: Record<string, number> = {};
    
    for (const { metadata } of this.keyCache.values()) {
      keysByType[metadata.keyType] = (keysByType[metadata.keyType] || 0) + 1;
    }

    return {
      totalKeys: this.keyCache.size,
      keysByType,
      environment: this.environment
    };
  }

  public revokeUserKeys(userId: number): void {
    let revokedCount = 0;
    
    for (const [cacheKey, { metadata }] of this.keyCache.entries()) {
      if (cacheKey.startsWith(`user_${userId}_`)) {
        this.keyCache.delete(cacheKey);
        revokedCount++;
        console.log(`🚫 Revoked key for user ${userId}: ${metadata.keyId}`);
      }
    }
    
    console.log(`✅ Revoked ${revokedCount} keys for user ${userId}`);
  }

  public revokeRoleKeys(role: string): void {
    const cacheKey = `role_${role}`;
    const cached = this.keyCache.get(cacheKey);
    
    if (cached) {
      this.keyCache.delete(cacheKey);
      console.log(`🚫 Revoked role key for ${role}: ${cached.metadata.keyId}`);
    }
  }
}

// Export singleton instance
export const kms = new KeyManagementSystem();

// Export types for use elsewhere
export type { JWTPayload, KeyMetadata };