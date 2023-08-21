import { Database } from '@hocuspocus/extension-database';
import { Configuration } from '@hocuspocus/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger.js';

// Ripped from
// docs-plus :) https://github.com/docs-plus/
import { APP_NAME } from '../common/env.js';
import prisma from '../prisma/index.js';

export default (): Partial<Configuration> => {
  const Serverconfigure: Pick<Configuration, 'name' | 'extensions'> &
    Partial<Configuration> = {
    name: `${APP_NAME}_${uuidv4().slice(0, 4)}`,
    extensions: [],
  };

  const database = new Database({
    // Return a Promise to retrieve data …
    fetch: async (d) => {
      logger.info('fetch');
      const doc = await prisma.document.findFirst({
        where: {
          id: d.documentName,
        },
      });
      // Return the document
      if (doc != null) {
        return doc.data;
      }
      // Return
      return null;
    },
    // … and a Promise to store data:
    store: async ({ documentName, state }) => {
      logger.info('store');
      return prisma.document.upsert({
        create: {
          data: state,
          id: documentName,
          projectId: '1',
          transcriptionType: 'AUTOMATIC',
          title: 'Document 2',
        },
        update: {
          data: state,
        },
        where: {
          id: documentName,
        },
      });
    },
  });

  Serverconfigure.extensions.push(database);

  return Serverconfigure;
};
