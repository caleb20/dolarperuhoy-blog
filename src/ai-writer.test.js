import test from 'node:test';
import assert from 'node:assert/strict';
import { generateArticle, shouldRetryOpenAIError } from './ai-writer.js';

function createOpenAIStub(sequence) {
  let callCount = 0;

  return {
    get callCount() {
      return callCount;
    },
    chat: {
      completions: {
        create: async () => {
          const step = sequence[callCount];
          callCount += 1;

          if (step instanceof Error) {
            throw step;
          }

          return {
            choices: [
              {
                message: {
                  content: JSON.stringify(step),
                },
              },
            ],
          };
        },
      },
    },
  };
}

test('shouldRetryOpenAIError detects transient fetch failures', () => {
  assert.equal(shouldRetryOpenAIError(new Error('Invalid response body while trying to fetch https://api.openai.com: Premature close')), true);
  assert.equal(shouldRetryOpenAIError(Object.assign(new Error('server error'), { status: 500 })), true);
  assert.equal(shouldRetryOpenAIError(Object.assign(new Error('bad request'), { status: 400 })), false);
});

test('generateArticle retries transient OpenAI failures and succeeds', async () => {
  const openai = createOpenAIStub([
    new Error('Invalid response body while trying to fetch https://api.openai.com: Premature close'),
    {
      title: 'Titulo valido',
      excerpt: 'Resumen suficiente para publicar.',
      body_html: '<p>Contenido del articulo.</p>',
    },
  ]);

  const article = await generateArticle(openai, 'guia', null, { maxAttempts: 2, retryDelayMs: 0 });

  assert.equal(openai.callCount, 2);
  assert.equal(article.title, 'Titulo valido');
});

test('generateArticle does not retry non-transient OpenAI failures', async () => {
  const error = Object.assign(new Error('Request invalid'), { status: 400 });
  const openai = createOpenAIStub([error]);

  await assert.rejects(
    generateArticle(openai, 'guia', null, { maxAttempts: 3, retryDelayMs: 0 }),
    error,
  );

  assert.equal(openai.callCount, 1);
});

test('generateArticle with news type requires newsContext', async () => {
  const articleData = {
    title: 'Noticia de prueba',
    excerpt: 'Resumen de prueba.',
    body_html: '<p>Contenido de prueba.</p>',
  };
  const openai = createOpenAIStub([articleData]);

  const article = await generateArticle(openai, 'news', null, {
    newsContext: 'Contexto de noticias de prueba',
    maxAttempts: 1,
  });

  assert.equal(article.title, 'Noticia de prueba');
  assert.equal(openai.callCount, 1);
});

test('generateArticle with news type throws without context', async () => {
  const openai = createOpenAIStub([]);

  await assert.rejects(
    generateArticle(openai, 'news', null, { maxAttempts: 1 }),
    /Se requiere contexto de noticias/,
  );
});
