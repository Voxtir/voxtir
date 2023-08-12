import { auth } from 'express-oauth2-jwt-bearer';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction, Handler } from 'express';
import prisma from './prisma/index.js';
import { Auth0Client } from './services/auth0.js';
import { Prisma } from '@prisma/client';
import { logger } from './services/logger.js';
import { NODE_ENV, DEVELOPMENT_USER, AUTH0_DOMAIN } from './common/env.js';

const VOXTIR_SEEN_USER_COOKIE = 'voxtir_seen_user';

/**
 * Standard auth0 logic except for in development where the user can be defined as an environment variable
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const accessControl: Handler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (NODE_ENV === 'development' && DEVELOPMENT_USER) {
    // In development we allow for setting a user header to bypass auth0
    req.auth = {
      payload: {
        iss: `https://${AUTH0_DOMAIN}/`,
        sub: DEVELOPMENT_USER,
        aud: [
          `https://${AUTH0_DOMAIN}/api/v2/`,
          `https://${AUTH0_DOMAIN}/userinfo`,
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        azp: 'DEVELOPMENT',
        scope: 'openid profile email read:current_user',
      },
      header: { alg: 'RS256', typ: 'JWT', kid: 'DEVELOPMENT' },
      token: `DEVELOPMENT`,
    };
    logger.info(`development user set to: ${DEVELOPMENT_USER}`);
    return next();
  }
  auth({
    audience: [
      `https://${AUTH0_DOMAIN}/api/v2/`,
      `https://${AUTH0_DOMAIN}/userinfo`,
    ],
    issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256',
  })(req, res, next);
};

/**
 * This is a middleware that will check if the user has an active session. 
The purpose is to determine if we should fetch user data from auth0 and update it in the database or not. If the user has a 
session we will not update the user data in the database. If the user does not have we will. Additionally it will serve as a way of 
determining if the user has been seen before. We don't get webhooks etc. on signup
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export const userInfoSync = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(req.cookies[VOXTIR_SEEN_USER_COOKIE] === 'seen')) {
    if (!req.auth?.payload?.sub) {
      logger.error('Sub not found on request that passed auth0 middleware');
      return res.status(500).send('Internal server error');
    }
    logger.info(
      `User not seen before or cookie expired, setting cookie and updating user data`
    );
    res.cookie(VOXTIR_SEEN_USER_COOKIE, 'seen', {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      secure: true,
      sameSite: 'none',
    });
    try {
      let auth0UserData = await Auth0Client.getUserById(req.auth.payload.sub);
      await prisma.user.upsert({
        create: {
          id: req.auth.payload.sub,
          auth0ManagementApiUserDetails:
            auth0UserData as unknown as Prisma.JsonObject,
        },
        update: {
          auth0ManagementApiUserDetails:
            auth0UserData as unknown as Prisma.JsonObject,
        },
        where: {
          id: req.auth.payload.sub,
        },
      });
    } catch (err) {
      return res.status(401).send('Unauthorized');
    }
  }
  next();
};

/**
 * A simple middleware that will add a unique id to the request object
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  return next();
};
