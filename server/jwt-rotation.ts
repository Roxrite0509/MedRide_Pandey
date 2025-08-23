import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface RotatedSecrets {
  current: string;
  previous: string | null;
  rotationTime: number;
}

class JWTRotationManager {
  private baseSecret: string;
  private rotationInterval: number = 30 * 60 * 1000; // 30 minutes
  private secrets: RotatedSecrets;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(baseSecret: string) {
    this.baseSecret = baseSecret;
    this.secrets = this.generateInitialSecrets();
    this.startRotationTimer();
    
    console.log('🔄 JWT rotation manager initialized - secrets will rotate every 30 minutes');
  }

  private generateInitialSecrets(): RotatedSecrets {
    const currentTime = Date.now();
    const rotationEpoch = Math.floor(currentTime / this.rotationInterval);
    
    return {
      current: this.deriveSecret(rotationEpoch),
      previous: rotationEpoch > 0 ? this.deriveSecret(rotationEpoch - 1) : null,
      rotationTime: currentTime
    };
  }

  private deriveSecret(epoch: number): string {
    // Use HMAC to derive a deterministic secret based on epoch
    return crypto
      .createHmac('sha256', this.baseSecret)
      .update(`rotation_epoch_${epoch}`)
      .digest('hex');
  }

  private rotateSecrets(): void {
    const currentTime = Date.now();
    const currentEpoch = Math.floor(currentTime / this.rotationInterval);
    
    const newSecrets: RotatedSecrets = {
      current: this.deriveSecret(currentEpoch),
      previous: this.secrets.current, // Current becomes previous
      rotationTime: currentTime
    };

    this.secrets = newSecrets;
    console.log(`🔄 JWT secrets rotated at ${new Date(currentTime).toISOString()}`);
  }

  private startRotationTimer(): void {
    // Calculate time until next rotation
    const currentTime = Date.now();
    const nextRotationTime = Math.ceil(currentTime / this.rotationInterval) * this.rotationInterval;
    const timeUntilRotation = nextRotationTime - currentTime;

    // Set timer for next rotation
    this.rotationTimer = setTimeout(() => {
      this.rotateSecrets();
      
      // Set up recurring rotation every 30 minutes
      this.rotationTimer = setInterval(() => {
        this.rotateSecrets();
      }, this.rotationInterval);
      
    }, timeUntilRotation);

    console.log(`⏰ Next JWT rotation scheduled in ${Math.round(timeUntilRotation / 1000 / 60)} minutes`);
  }

  public getCurrentSecret(): string {
    return this.secrets.current;
  }

  public createToken(payload: object | Buffer, expiresIn: string = '24h'): string {
    return jwt.sign(payload, this.secrets.current, { 
      expiresIn,
      algorithm: 'HS256'
    } as jwt.SignOptions);
  }

  public verifyToken(token: string): jwt.JwtPayload | string {
    // Try current secret first
    try {
      return jwt.verify(token, this.secrets.current, { algorithms: ['HS256'] });
    } catch (currentError) {
      // If current fails and we have a previous secret, try that
      if (this.secrets.previous) {
        try {
          const decoded = jwt.verify(token, this.secrets.previous, { algorithms: ['HS256'] });
          console.log('⚠️ Token verified with previous secret - consider refresh');
          return decoded;
        } catch (previousError) {
          // Both failed
          console.warn('Token verification failed with both current and previous secrets');
          throw currentError; // Throw the original error
        }
      } else {
        // No previous secret available
        throw currentError;
      }
    }
  }

  public getRotationStatus(): { 
    currentRotation: number; 
    nextRotation: number; 
    timeUntilNext: number;
    rotationsCount: number;
  } {
    const currentTime = Date.now();
    const currentEpoch = Math.floor(currentTime / this.rotationInterval);
    const nextRotationTime = (currentEpoch + 1) * this.rotationInterval;
    
    return {
      currentRotation: currentEpoch,
      nextRotation: nextRotationTime,
      timeUntilNext: nextRotationTime - currentTime,
      rotationsCount: currentEpoch
    };
  }

  public destroy(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

// Initialize rotation manager
const baseSecret = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for rotation');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }
  return secret;
})();

export const jwtRotationManager = new JWTRotationManager(baseSecret);

// Export helper functions for backward compatibility
export const getCurrentJWTSecret = () => jwtRotationManager.getCurrentSecret();
export const createRotatedToken = (payload: any, expiresIn?: string) => jwtRotationManager.createToken(payload, expiresIn);
export const verifyRotatedToken = (token: string) => jwtRotationManager.verifyToken(token);