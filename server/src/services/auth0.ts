import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';

import {
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN,
} from '../common/env.js';
import { logger } from '../services/logger.js';
import { Auth0ManagementApiUser } from '../types/auth0';

const baseUrl = `https://${AUTH0_DOMAIN}`;

interface auth0TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Axios instance for making requests to Auth0 and managing the system token
 *
 * @static
 * @type {AxiosInstance}
 * @memberof Auth0Client
 */
export class Auth0Client {
  static auth0: AxiosInstance = axios.create({
    baseURL: `${baseUrl}/`,
    headers: { 'content-type': 'application/json' },
  });
  static systemToken = '';
  static systemTokenExpiration = 0;

  static isSystemTokenExpired(): boolean {
    return Auth0Client.systemTokenExpiration < Date.now();
  }

  static systemTokenExpiresAt(): string {
    return new Date(Auth0Client.systemTokenExpiration).toISOString();
  }

  static async getSystemToken(): Promise<string> {
    logger.info('Getting system token from Auth0');
    if (Auth0Client.isSystemTokenExpired()) {
      logger.info('System token expired, getting new one');
      try {
        const tokenResponse = await Auth0Client.auth0.post('oauth/token', {
          client_id: AUTH0_CLIENT_ID,
          client_secret: AUTH0_CLIENT_SECRET,
          audience: `${baseUrl}/api/v2/`,
          grant_type: 'client_credentials',
        });

        const tokenData = tokenResponse.data as auth0TokenResponse;
        Auth0Client.systemToken = tokenData.access_token;

        const decodedToken = jwt.decode(tokenData.access_token, { json: true });
        if (!decodedToken?.exp) {
          logger.error('Error decoding auth0 system token');
          throw new Error('Error decoding system token');
        }

        Auth0Client.systemTokenExpiration = decodedToken.exp * 1000;
      } catch (err: any) {
        console.log(err);
        logger.error(
          `Error getting system token from Auth0: ${err.response.status} ${err.response.statusText}`
        );
        throw err;
      }
    }
    return Promise.resolve(Auth0Client.systemToken);
  }

  /**
   * @throws {Error}
   */
  static async getUserById(userId: string): Promise<Auth0ManagementApiUser> {
    logger.info(`Getting user ${userId} from Auth0`);
    try {
      const systemToken = await Auth0Client.getSystemToken();
      const response = await Auth0Client.auth0.get(`/api/v2/users/${userId}`, {
        headers: { Authorization: `Bearer ${systemToken}` },
      });
      return response.data as Auth0ManagementApiUser;
    } catch (err: any) {
      logger.warn(
        `Error getting user ${userId} from Auth0: ${err.response.data} ${err.response.status} ${err.response.statusText}`
      );
      throw new Error('Error getting user from Auth0');
    }
  }
}

const isRunningDirectly = false;
if (isRunningDirectly) {
  // When running the file standalone, you can create an instance of Auth0Client and call its methods here.
  logger.info(Auth0Client.systemTokenExpiresAt());
  await Auth0Client.getUserById('auth0|64c035be0b7eb7c5797264ca');
  logger.info(Auth0Client.systemToken);
  logger.info(Auth0Client.systemTokenExpiresAt());
}
