import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'auth-config.json');

export interface AuthConfig {
  authenticationEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Read the authentication configuration
 */
export function getAuthConfig(): AuthConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // Create default config if it doesn't exist
      const defaultConfig: AuthConfig = {
        authenticationEnabled: true,
        updatedAt: null,
        updatedBy: null
      };
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }

    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading auth config:', error);
    // Return safe default (auth enabled)
    return {
      authenticationEnabled: true,
      updatedAt: null,
      updatedBy: null
    };
  }
}

/**
 * Update the authentication configuration
 */
export function setAuthConfig(enabled: boolean, updatedBy: string = 'admin'): boolean {
  try {
    const config: AuthConfig = {
      authenticationEnabled: enabled,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`Authentication ${enabled ? 'ENABLED' : 'DISABLED'} by ${updatedBy} at ${config.updatedAt}`);
    return true;
  } catch (error) {
    console.error('Error writing auth config:', error);
    return false;
  }
}

/**
 * Check if authentication is currently enabled
 */
export function isAuthEnabled(): boolean {
  const config = getAuthConfig();
  return config.authenticationEnabled;
}
