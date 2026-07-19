import { extractAnnotationsMetadata, extractLinks } from './utils.js';

const MAX_SNIPPET_LENGTH = 180;

export function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getMessageAnchorId(message, conversationId, index) {
  const sourceId = message?.message_id || `${conversationId || 'conversation'}-${index}`;
  const safeId = String(sourceId)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return `message-${safeId || index}`;
}

export function getPageFileName(page) {
  return page === 1 ? 'index.html' : `page${page}.html`;
}

export function buildConversationSearchIndex(conversation, pageSize) {
  const messages = conversation?.messages || [];
  const effectivePageSize = pageSize > 0 ? pageSize : messages.length || 1;

  return messages.map((message, index) => {
    const page = Math.floor(index / effectivePageSize) + 1;
    const attachments = (message.attached_files || [])
      .flatMap(file => [file.original_name, file.export_name])
      .filter(Boolean);
    const annotations = extractAnnotationsMetadata(message.annotations || []);
    const annotationText = annotations.flatMap(annotation => [
      annotation.title,
      annotation.snippet,
      annotation.url
    ]).filter(Boolean);
    const links = extractLinks(message.text || '');

    const searchableParts = [
      message.text,
      message.creator?.name,
      message.creator?.email,
      message.created_date,
      ...attachments,
      ...annotationText,
      ...links
    ].filter(Boolean);

    const snippetSource = message.text || attachments[0] || annotationText[0] || '';
    const snippet = snippetSource.length > MAX_SNIPPET_LENGTH
      ? `${snippetSource.slice(0, MAX_SNIPPET_LENGTH)}...`
      : snippetSource;

    return {
      id: getMessageAnchorId(message, conversation.id, index),
      page,
      file: getPageFileName(page),
      sender: message.creator?.name || '',
      time: message.created_date || message.updated_date || '',
      snippet,
      text: normalizeSearchText(searchableParts.join(' '))
    };
  });
}