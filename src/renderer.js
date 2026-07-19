// Renderer module - generates Material Design 3 HTML
import fs from 'fs';
import path from 'path';
import { formatDate, formatTime, parseGoogleChatDate } from './dateFormatter.js';
import { sanitizeHtml, extractAnnotationsMetadata, isImageUrl, extractDomain, isImageFile, isVideoFile, isAudioFile, getFileExtension } from './utils.js';
import { getAvatar } from './avatarManager.js';
import { getTranslator } from './i18n.js';
import { getMessageAnchorId } from './searchIndex.js';

const MATERIAL_DESIGN_CDN = 'https://unpkg.com/@material/web@latest';

function serializeJsonForScript(value) {
  return JSON.stringify(value || [])
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function sanitizeJsString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\//g, '<\\/');
}

export async function renderConversationPage(conversation, timezone, locale, enableSearch = true) {
  if (!conversation) return '';

  const t = getTranslator(locale);
  const receiver = conversation.receiver || { name: t('unknown'), email: 'unknown@example.com' };
  const owner = conversation.owner || { name: t('owner'), email: 'owner@example.com' };

  // Get avatars
  const receiverAvatar = await getAvatar(receiver);
  const ownerAvatar = await getAvatar(owner);

  // Render appropriate header based on conversation type
  let headerHtml;
  let pageTitle;
  if (conversation.isGroup) {
    headerHtml = renderGroupHeader(conversation.groupName, conversation.members, t, enableSearch);
    pageTitle = conversation.groupName || t('groupChat');
  } else {
    headerHtml = renderHeader(receiver, receiverAvatar, t, enableSearch);
    pageTitle = receiver.name;
  }

  const messagesHtml = conversation.messages.length > 0
    ? renderMessagesWithDateSeparators(conversation.messages, owner.email, timezone, locale, ownerAvatar, conversation.isGroup, conversation.members, conversation.id, conversation.pageInfo?.startIndex || 0)
    : `<div class="empty-conversation"><p>${sanitizeHtml(t('noMessagesInConversation'))}</p></div>`;

  // Render pagination navigation if applicable
  const paginationHtml = conversation.pageInfo
    ? renderPaginationNav(conversation.id, conversation.pageInfo, locale)
    : '';

  return `<!DOCTYPE html>
<html lang="${sanitizeHtml(locale || 'en')}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHtml(pageTitle)}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
    <link rel="stylesheet" href="${MATERIAL_DESIGN_CDN}/all.css">
    <script>
        // Get theme from URL parameter or default to light
        const initialThemeParams = new URLSearchParams(window.location.search);
        const initialTheme = initialThemeParams.get('theme') || 'light';
        document.documentElement.setAttribute('data-theme', initialTheme);
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #f5f5f5;
            --bg-secondary: white;
            --bg-tertiary: #f9f9f9;
            --text-primary: #000;
            --text-secondary: #666;
            --text-tertiary: #999;
            --border-color: #e0e0e0;
            --message-receiver-bg: #f2f2f2;
            --message-owner-bg: #d3e3fd;
            --accent-color: #1976d2;
            --shadow: rgba(0,0,0,0.1);
        }

        :root[data-theme="dark"] {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2a2a2a;
            --bg-tertiary: #333;
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --text-tertiary: #808080;
            --border-color: #444;
            --message-receiver-bg: #3a3a3a;
            --message-owner-bg: #1e3a5f;
            --accent-color: #64b5f6;
            --shadow: rgba(0,0,0,0.3);
        }

        body {
            font-family: 'Roboto', sans-serif;
            background-color: var(--bg-primary);
            display: flex;
            flex-direction: column;
            height: 100vh;
            transition: background-color 0.3s ease;
        }

        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-width: 900px;
            margin: 0 auto;
            background-color: var(--bg-secondary);
            box-shadow: 0 -2px 4px var(--shadow);
            transition: background-color 0.3s ease;
        }

        .chat-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
            display: flex;
            align-items: center;
            gap: 16px;
            transition: border-color 0.3s ease, background-color 0.3s ease;
        }

        .theme-toggle {
            margin-left: 0;
            padding: 8px 12px;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.3s ease;
            color: var(--text-primary);
        }

        .theme-toggle:hover {
            background-color: var(--accent-color);
            color: white;
        }

        .conversation-search {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
            min-width: 240px;
            max-width: 360px;
            flex: 1;
        }

        .conversation-search-input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .conversation-search-input:focus {
            outline: 2px solid var(--accent-color);
            outline-offset: 1px;
        }

        .search-clear {
            width: 34px;
            height: 34px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--bg-tertiary);
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }

        .search-clear:hover {
            background-color: var(--accent-color);
            color: white;
        }

        .search-status {
            min-width: 84px;
            font-size: 12px;
            color: var(--text-secondary);
            text-align: right;
        }

        .avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: white;
            font-size: 16px;
            flex-shrink: 0;
        }

        .avatar-image {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }

        .group-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            flex-shrink: 0;
        }

        .group-members {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
        }

        .member-item {
            font-size: 11px;
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        .member-name {
            font-weight: 600;
            color: var(--text-primary);
            transition: color 0.3s ease;
        }

        .member-email {
            color: var(--text-tertiary);
            font-size: 10px;
            transition: color 0.3s ease;
        }

        .header-info h2 {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 4px;
            color: var(--text-primary);
            transition: color 0.3s ease;
        }

        .header-info p {
            font-size: 14px;
            color: var(--text-secondary);
            transition: color 0.3s ease;
        }

        .back-button {
            margin-right: auto;
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--accent-color);
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .back-button:hover {
            background-color: var(--accent-color);
            color: white;
        }

        .back-button svg {
            width: 18px;
            height: 18px;
            stroke: currentColor;
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background-color: var(--bg-primary);
            transition: background-color 0.3s ease;
        }

        .message {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            animation: fadeIn 0.3s ease-in;
            scroll-margin-top: 96px;
        }

        .message.search-active .message-content {
            outline: 2px solid var(--accent-color);
            box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.12);
        }

        .search-results {
            display: none;
            padding: 0 16px 12px;
            background-color: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
        }

        .search-results.visible {
            display: block;
        }

        .search-results-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 260px;
            overflow-y: auto;
        }

        .search-result {
            display: block;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .search-result:hover {
            border-color: var(--accent-color);
        }

        .search-result-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 4px;
            color: var(--text-secondary);
            font-size: 12px;
        }

        .search-result-snippet {
            color: var(--text-primary);
            font-size: 13px;
            line-height: 1.35;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.owner {
            justify-content: flex-end;
        }

        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            word-break: break-word;
            transition: all 0.3s ease;
        }

        .message.receiver .message-content {
            background-color: var(--message-receiver-bg);
            color: var(--text-primary);
            border-bottom-left-radius: 4px;
        }

        .message.owner .message-content {
            background-color: var(--message-owner-bg);
            color: var(--text-primary);
            border-bottom-right-radius: 4px;
        }

        .message-sender {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 6px;
            text-transform: capitalize;
            transition: color 0.3s ease;
        }

        .message-text {
            margin-bottom: 8px;
            line-height: 1.4;
            color: var(--text-primary);
            transition: color 0.3s ease;
        }

        .message-time {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 4px;
            color: var(--text-tertiary);
            transition: color 0.3s ease;
        }

        .quoted-message {
            padding: 8px 10px;
            margin-bottom: 8px;
            border-left: 3px solid var(--accent-color);
            background-color: rgba(25, 118, 210, 0.05);
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.3s ease;
        }

        :root[data-theme="dark"] .quoted-message {
            background-color: rgba(100, 181, 246, 0.1);
        }

        .quoted-sender {
            font-weight: 600;
            color: var(--accent-color);
            margin-bottom: 4px;
            transition: color 0.3s ease;
        }

        .quoted-text {
            color: var(--text-secondary);
            font-style: italic;
            transition: color 0.3s ease;
        }

        .attached-media {
            margin-top: 8px;
            border-radius: 8px;
            overflow: hidden;
            max-width: 100%;
        }

        .attached-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            display: block;
        }

        .attached-video {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
        }

        .attached-audio {
            width: 100%;
            margin-top: 4px;
        }

        .attached-file {
            margin-top: 8px;
            display: flex;
            align-items: center;
        }

        .file-download {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background-color: rgba(0,0,0,0.05);
            border-radius: 6px;
            text-decoration: none;
            color: var(--accent-color);
            font-weight: 500;
            font-size: 13px;
            transition: all 0.3s ease;
        }

        .file-download:hover {
            background-color: var(--accent-color);
            color: white;
        }

        .file-ext {
            color: var(--text-tertiary);
            font-size: 11px;
            transition: color 0.3s ease;
        }

        .message-annotation {
            margin-top: 8px;
            padding: 12px;
            background-color: rgba(0,0,0,0.05);
            border-radius: 8px;
            text-decoration: none;
            display: block;
            color: var(--text-primary);
            transition: all 0.3s ease;
        }

        :root[data-theme="dark"] .message-annotation {
            background-color: rgba(255,255,255,0.05);
        }

        .message-annotation:hover {
            background-color: rgba(0,0,0,0.1);
        }

        :root[data-theme="dark"] .message-annotation:hover {
            background-color: rgba(255,255,255,0.1);
        }

        .annotation-title {
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--text-primary);
            transition: color 0.3s ease;
        }

        .annotation-snippet {
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.3;
            margin-bottom: 8px;
            transition: color 0.3s ease;
        }

        .annotation-thumbnail {
            max-width: 100%;
            max-height: 150px;
            border-radius: 4px;
            margin-top: 8px;
        }

        .annotation-url {
            font-size: 12px;
            color: var(--accent-color);
            word-break: break-all;
            transition: color 0.3s ease;
        }

        .inline-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            margin-top: 8px;
        }

        .file-icon {
            width: 18px;
            height: 18px;
        }

        .empty-conversation {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-tertiary);
            font-size: 16px;
            transition: color 0.3s ease;
        }

        .footer {
            padding: 16px;
            border-top: 1px solid var(--border-color);
            background-color: var(--bg-tertiary);
            text-align: center;
            font-size: 12px;
            color: var(--text-tertiary);
            transition: all 0.3s ease;
        }

        .pagination-nav {
            padding: 16px;
            border: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 8px 0;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .pagination-info {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: var(--text-secondary);
            gap: 16px;
        }

        .page-indicator {
            font-weight: 500;
            color: var(--text-primary);
        }

        .message-count {
            color: var(--text-tertiary);
        }

        .pagination-buttons {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }

        .pagination-btn {
            padding: 8px 12px;
            background-color: var(--accent-color);
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s ease;
            cursor: pointer;
            border: none;
        }

        .pagination-btn:hover:not(.disabled) {
            opacity: 0.9;
        }

        .pagination-btn.disabled {
            background-color: var(--border-color);
            color: var(--text-tertiary);
            cursor: not-allowed;
            opacity: 0.5;
        }

        .page-selector {
            display: flex;
            gap: 8px;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .page-selector a {
            color: var(--accent-color);
            text-decoration: none;
            font-weight: 500;
            transition: opacity 0.2s ease;
        }

        .page-selector a:hover {
            opacity: 0.7;
        }

        .page-selector .current {
            color: var(--text-primary);
            font-weight: 600;
            min-width: 20px;
            text-align: center;
        }

        .date-separator {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 20px 0;
            opacity: 0.6;
        }

        .date-separator::before,
        .date-separator::after {
            content: '';
            flex: 1;
            height: 1px;
            background-color: var(--border-color);
            transition: background-color 0.3s ease;
        }

        .date-separator-text {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-secondary);
            white-space: nowrap;
            background-color: var(--bg-primary);
            padding: 0 8px;
            transition: all 0.3s ease;
        }

        @media (max-width: 600px) {
            .message-content {
                max-width: 85%;
            }

            .chat-header {
                padding: 12px;
                flex-wrap: wrap;
            }

            .conversation-search {
                order: 10;
                flex-basis: 100%;
                max-width: none;
                min-width: 0;
                margin-left: 0;
            }

            .search-status {
                min-width: 72px;
            }

            .avatar {
                width: 40px;
                height: 40px;
                font-size: 14px;
            }

            .header-info h2 {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        ${headerHtml}
        ${paginationHtml}
        <div class="messages-container">
            ${messagesHtml}
        </div>
        ${paginationHtml}
        <div class="footer">
            <p>${sanitizeHtml(t('footerExportLabel'))} • ${sanitizeHtml(t('timezone'))}: ${sanitizeHtml(timezone)} • ${sanitizeHtml(t('locale'))}: ${sanitizeHtml(locale)}</p>
        </div>
    </div>
    <script>
        // Get current theme from URL parameter
        const pageThemeParams = new URLSearchParams(window.location.search);
        const currentTheme = pageThemeParams.get('theme') || 'light';
        
        function updateThemeButton(theme) {
            const button = document.getElementById('themeToggle');
            if (button) {
                button.textContent = theme === 'light' ? '🌙' : '☀️';
            }
        }
        
        updateThemeButton(currentTheme);
        
        // Add theme parameter to pagination and back links
        document.querySelectorAll('[data-theme-link]').forEach(link => {
            const url = new URL(link.href, window.location.href);
            if (!url.searchParams.has('theme')) {
                url.searchParams.set('theme', currentTheme);
                link.href = url.toString();
            }
        });
        
        // Add theme parameter to back link
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            const url = new URL(backButton.href, window.location.href);
            if (!url.searchParams.has('theme')) {
                url.searchParams.set('theme', currentTheme);
                backButton.href = url.toString();
            }
        }
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                // Navigate to same page with new theme parameter
                const url = new URL(window.location);
                url.searchParams.set('theme', newTheme);
                window.location.href = url.toString();
            });
        }

        function clearActiveSearchMessage() {
            document.querySelectorAll('.message.search-active').forEach(message => {
                message.classList.remove('search-active');
            });
        }

        function focusSearchMessage(messageId) {
            if (!messageId) return;
            const target = document.getElementById(messageId);
            if (!target) return;
            clearActiveSearchMessage();
            target.classList.add('search-active');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const searchForm = document.getElementById('conversationSearchForm');
        const searchInput = document.getElementById('conversationSearchInput');
        const initialQuery = pageThemeParams.get('q') || '';
        if (initialQuery && searchInput) {
            searchInput.value = initialQuery;
        }

        if (searchForm) {
            searchForm.addEventListener('submit', event => {
                if (!searchInput || !searchInput.value.trim()) {
                    event.preventDefault();
                    return;
                }

                const themeInput = searchForm.querySelector('input[name="theme"]');
                if (themeInput) themeInput.value = currentTheme;
            });
        }

        if (window.location.hash) {
            window.setTimeout(() => focusSearchMessage(window.location.hash.slice(1)), 100);
        }
    </script>
</body>
</html>`;
}

export async function renderConversationSearchPage(conversation, timezone, locale, searchIndex = []) {
  if (!conversation) return '';

  const t = getTranslator(locale);
  const title = conversation.isGroup
    ? (conversation.groupName || t('groupChat'))
    : (conversation.receiver?.name || t('unknown'));
  const searchIndexJson = serializeJsonForScript(searchIndex);

  return `<!DOCTYPE html>
<html lang="${sanitizeHtml(locale || 'en')}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHtml(t('searchMessages'))} - ${sanitizeHtml(title)}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
    <script>
        const initialThemeParams = new URLSearchParams(window.location.search);
        const initialTheme = initialThemeParams.get('theme') || 'light';
        document.documentElement.setAttribute('data-theme', initialTheme);
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg-primary: #f5f5f5;
            --bg-secondary: white;
            --bg-tertiary: #f9f9f9;
            --text-primary: #000;
            --text-secondary: #666;
            --text-tertiary: #999;
            --border-color: #e0e0e0;
            --accent-color: #1976d2;
            --shadow: rgba(0,0,0,0.1);
        }
        :root[data-theme="dark"] {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2a2a2a;
            --bg-tertiary: #333;
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --text-tertiary: #808080;
            --border-color: #444;
            --accent-color: #64b5f6;
            --shadow: rgba(0,0,0,0.3);
        }
        body {
            font-family: 'Roboto', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
        }
        .search-page {
            max-width: 900px;
            min-height: 100vh;
            margin: 0 auto;
            background-color: var(--bg-secondary);
            box-shadow: 0 -2px 4px var(--shadow);
        }
        .search-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }
        .back-button {
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--accent-color);
            text-decoration: none;
        }
        .search-title {
            flex: 1;
            min-width: 220px;
        }
        .search-title h1 {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 4px;
        }
        .search-title p {
            color: var(--text-secondary);
            font-size: 13px;
        }
        .conversation-search {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-basis: 100%;
        }
        .conversation-search-input {
            flex: 1;
            min-width: 0;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 14px;
        }
        .search-submit, .theme-toggle {
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--accent-color);
            color: white;
            cursor: pointer;
            font-weight: 500;
        }
        .theme-toggle {
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 18px;
        }
        .search-summary {
            padding: 16px;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-color);
        }
        .search-results-list {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .search-result {
            display: block;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            text-decoration: none;
        }
        .search-result:hover { border-color: var(--accent-color); }
        .search-result-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 5px;
            color: var(--text-secondary);
            font-size: 12px;
        }
        .search-result-snippet {
            font-size: 14px;
            line-height: 1.4;
        }
        @media (max-width: 600px) {
            .search-header { padding: 12px; }
            .search-result-meta { flex-direction: column; gap: 2px; }
        }
    </style>
</head>
<body>
    <div class="search-page">
        <div class="search-header">
            <a href="index.html" class="back-button" data-theme-link title="${sanitizeHtml(t('backToConversation'))}" aria-label="${sanitizeHtml(t('backToConversation'))}">‹</a>
            <div class="search-title">
                <h1>${sanitizeHtml(t('searchMessages'))}</h1>
                <p>${sanitizeHtml(title)}</p>
            </div>
            <button class="theme-toggle" id="themeToggle" title="${sanitizeHtml(t('toggleDarkMode'))}">🌙</button>
            <form class="conversation-search" id="conversationSearchForm" action="search.html" method="get" role="search">
                <input id="conversationSearchInput" class="conversation-search-input" type="search" name="q" autocomplete="off" placeholder="${sanitizeHtml(t('searchMessages'))}" aria-label="${sanitizeHtml(t('searchMessages'))}" autofocus>
                <input type="hidden" name="theme" value="">
                <button class="search-submit" type="submit">${sanitizeHtml(t('search'))}</button>
            </form>
        </div>
        <div class="search-summary" id="searchSummary"></div>
        <div class="search-results-list" id="searchResultsList"></div>
    </div>
    <script type="application/json" id="conversation-search-index">${searchIndexJson}</script>
    <script>
        const pageThemeParams = new URLSearchParams(window.location.search);
        const currentTheme = pageThemeParams.get('theme') || 'light';
        const searchInput = document.getElementById('conversationSearchInput');
        const searchForm = document.getElementById('conversationSearchForm');
        const searchSummary = document.getElementById('searchSummary');
        const searchResultsList = document.getElementById('searchResultsList');
        const searchIndex = JSON.parse(document.getElementById('conversation-search-index').textContent || '[]');
        const query = pageThemeParams.get('q') || '';

        function updateThemeButton(theme) {
            const button = document.getElementById('themeToggle');
            if (button) button.textContent = theme === 'light' ? '🌙' : '☀️';
        }

        function normalizeSearchText(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        }

        function resultUrl(record, currentQuery) {
            const url = new URL(record.file || 'index.html', window.location.href);
            url.searchParams.set('theme', currentTheme);
            if (currentQuery) url.searchParams.set('q', currentQuery);
            url.hash = record.id;
            return url.toString();
        }

        function renderResults(currentQuery) {
            searchResultsList.textContent = '';
            const terms = normalizeSearchText(currentQuery).trim().split(/\s+/).filter(Boolean);

            if (terms.length === 0) {
                searchSummary.textContent = '${sanitizeJsString(t('searchEnterQuery'))}';
                return;
            }

            const matches = searchIndex.filter(record => terms.every(term => (record.text || '').includes(term)));
            const visibleMatches = matches.slice(0, 100);
            searchSummary.textContent = matches.length > 100
                ? '${sanitizeJsString(t('searchShowingResults'))}'.replace('{shown}', visibleMatches.length).replace('{total}', matches.length)
                : '${sanitizeJsString(t('searchResultsCount'))}'.replace('{count}', matches.length);

            if (matches.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'search-result';
                empty.textContent = '${sanitizeJsString(t('searchNoResults'))}';
                searchResultsList.appendChild(empty);
                return;
            }

            visibleMatches.forEach(record => {
                const link = document.createElement('a');
                link.className = 'search-result';
                link.href = resultUrl(record, currentQuery);

                const meta = document.createElement('div');
                meta.className = 'search-result-meta';
                const sender = document.createElement('span');
                sender.textContent = record.sender || '${sanitizeJsString(t('unknown'))}';
                const page = document.createElement('span');
                page.textContent = '${sanitizeJsString(t('searchPageLabel'))} ' + record.page;
                meta.append(sender, page);

                const snippet = document.createElement('div');
                snippet.className = 'search-result-snippet';
                snippet.textContent = record.snippet || record.time || '';
                link.append(meta, snippet);
                searchResultsList.appendChild(link);
            });
        }

        updateThemeButton(currentTheme);
        document.querySelectorAll('[data-theme-link]').forEach(link => {
            const url = new URL(link.href, window.location.href);
            url.searchParams.set('theme', currentTheme);
            link.href = url.toString();
        });

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const url = new URL(window.location.href);
                url.searchParams.set('theme', currentTheme === 'light' ? 'dark' : 'light');
                window.location.href = url.toString();
            });
        }

        if (searchInput) searchInput.value = query;
        if (searchForm) {
            searchForm.addEventListener('submit', event => {
                if (!searchInput || !searchInput.value.trim()) event.preventDefault();
                const themeInput = searchForm.querySelector('input[name="theme"]');
                if (themeInput) themeInput.value = currentTheme;
            });
        }
        renderResults(query);
    </script>
</body>
</html>`;
}

export async function renderIndexPage(conversations, timezone, locale) {
  if (!conversations || conversations.length === 0) {
    return renderEmptyIndexPage(locale);
  }

  const t = getTranslator(locale);

  // Sort conversations by name (group or receiver) alphabetically
  const sorted = [...conversations].sort((a, b) => {
    const aName = a.isGroup
      ? (a.groupName || t('unknown')).toLowerCase()
      : (a.receiver?.name || t('unknown')).toLowerCase();
    const bName = b.isGroup
      ? (b.groupName || t('unknown')).toLowerCase()
      : (b.receiver?.name || t('unknown')).toLowerCase();
    return aName.localeCompare(bName);
  });

  const conversationListHtml = await Promise.all(
    sorted.map(async (conv) => {
      if (conv.isGroup) {
        // For groups, don't get individual avatar
        return renderConversationListItem(conv, null, null, timezone, locale);
      } else {
        const receiver = conv.receiver || { name: t('unknown'), email: 'unknown@example.com' };
        const avatar = await getAvatar(receiver);
        return renderConversationListItem(conv, avatar, receiver, timezone, locale);
      }
    })
  );

  return `<!DOCTYPE html>
<html lang="${sanitizeHtml(locale || 'en')}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHtml(t('conversationsPageTitle'))}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
    <link rel="stylesheet" href="${MATERIAL_DESIGN_CDN}/all.css">
    <script>
        // Get theme from URL parameter or default to light
        const initialThemeParams = new URLSearchParams(window.location.search);
        const initialTheme = initialThemeParams.get('theme') || 'light';
        document.documentElement.setAttribute('data-theme', initialTheme);
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --bg-secondary: white;
            --bg-tertiary: #f5f5f5;
            --text-primary: #000;
            --text-secondary: #666;
            --text-tertiary: #999;
            --text-header: white;
            --border-color: #e0e0e0;
            --shadow: rgba(0,0,0,0.1);
            --accent-color: #1976d2;
            --accent-light: #e3f2fd;
        }

        :root[data-theme="dark"] {
            --bg-primary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --bg-secondary: #2a2a3e;
            --bg-tertiary: #1f1f2e;
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --text-tertiary: #808080;
            --text-header: #e0e0e0;
            --border-color: #444;
            --shadow: rgba(0,0,0,0.3);
            --accent-color: #64b5f6;
            --accent-light: rgba(100, 181, 246, 0.2);
        }

        body {
            font-family: 'Roboto', sans-serif;
            background: var(--bg-primary);
            min-height: 100vh;
            padding: 20px;
            transition: background 0.3s ease;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: var(--text-header);
            margin-bottom: 40px;
            position: relative;
            transition: color 0.3s ease;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 8px;
            font-weight: 700;
        }

        .header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .theme-toggle-index {
            position: absolute;
            top: 0;
            right: 0;
            padding: 10px 14px;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.3s ease;
            color: var(--text-primary);
        }

        .theme-toggle-index:hover {
            background-color: var(--accent-color);
            color: white;
        }

        .stats {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px var(--shadow);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat {
            padding: 12px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent-color);
            transition: color 0.3s ease;
        }

        .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
            margin-top: 4px;
            transition: color 0.3s ease;
        }

        .conversations-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .conversation-item {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            text-decoration: none;
            color: var(--text-primary);
            transition: all 0.3s;
            box-shadow: 0 2px 4px var(--shadow);
            cursor: pointer;
            border: 1px solid var(--border-color);
        }

        .conversation-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px var(--shadow);
        }

        .conversation-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: white;
            font-size: 16px;
            flex-shrink: 0;
        }

        .conversation-avatar-image {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }

        .group-avatar-badge {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            flex-shrink: 0;
        }

        .conversation-info {
            flex: 1;
            min-width: 0;
        }

        .conversation-name {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 4px;
            color: var(--text-primary);
            transition: color 0.3s ease;
        }

        .conversation-email {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 4px;
            transition: color 0.3s ease;
        }

        .conversation-preview {
            font-size: 13px;
            color: var(--text-tertiary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.3s ease;
        }

        .conversation-meta {
            text-align: right;
            font-size: 12px;
            color: var(--text-tertiary);
            transition: color 0.3s ease;
        }

        .message-count {
            background: var(--accent-light);
            color: var(--accent-color);
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            display: inline-block;
            margin-bottom: 4px;
            transition: all 0.3s ease;
        }

        .empty-state {
            text-align: center;
            color: var(--text-header);
            padding: 40px 20px;
            transition: color 0.3s ease;
        }

        .empty-state h2 {
            margin-bottom: 12px;
        }

        @media (max-width: 600px) {
            .header h1 {
                font-size: 24px;
            }

            .conversation-item {
                padding: 12px;
            }

            .conversation-avatar {
                width: 40px;
                height: 40px;
                font-size: 14px;
            }

            .conversation-meta {
                text-align: left;
                margin-top: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <button class="theme-toggle-index" id="themeToggleIndex" title="${sanitizeHtml(t('toggleDarkMode'))}">🌙</button>
            <h1>💬 Google Chat</h1>
            <p>${sanitizeHtml(t('conversationsSubtitle'))}</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">${conversations.length}</div>
                <div class="stat-label">${sanitizeHtml(t('conversations'))}</div>
            </div>
            <div class="stat">
                <div class="stat-value">${conversations.filter(c => c.hasMessages).length}</div>
                <div class="stat-label">${sanitizeHtml(t('active'))}</div>
            </div>
            <div class="stat">
                <div class="stat-value">${conversations.reduce((sum, c) => sum + c.messageCount, 0).toLocaleString(locale)}</div>
                <div class="stat-label">${sanitizeHtml(t('messages'))}</div>
            </div>
        </div>

        <div class="conversations-list">
            ${conversationListHtml.join('')}
        </div>
    </div>
    <script>
        // Get current theme from URL parameter
        const pageThemeParams = new URLSearchParams(window.location.search);
        const currentTheme = pageThemeParams.get('theme') || 'light';
        
        function updateThemeButtonIndex(theme) {
            const button = document.getElementById('themeToggleIndex');
            if (button) {
                button.textContent = theme === 'light' ? '🌙' : '☀️';
            }
        }
        
        updateThemeButtonIndex(currentTheme);
        
        // Add theme parameter to all conversation links
        document.querySelectorAll('.conversation-item').forEach(link => {
            const url = new URL(link.href, window.location.href);
            if (!url.searchParams.has('theme')) {
                url.searchParams.set('theme', currentTheme);
                link.href = url.toString();
            }
        });
        
        const themeToggleIndex = document.getElementById('themeToggleIndex');
        if (themeToggleIndex) {
            themeToggleIndex.addEventListener('click', () => {
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                // Navigate with new theme parameter
                const url = new URL(window.location);
                url.searchParams.set('theme', newTheme);
                window.location.href = url.toString();
            });
        }
    </script>
</body>
</html>`;
}

function renderPaginationNav(conversationId, pageInfo, locale) {
  const t = getTranslator(locale);
  const { currentPage, totalPages, totalMessages, pageSize } = pageInfo;

  // Don't show pagination for single page
  if (totalPages <= 1) return '';

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const firstPageLink = 'index.html';
  const lastPageLink = totalPages > 1 ? `page${totalPages}.html` : firstPageLink;
  const prevPageLink = prevPage === 1 ? firstPageLink : `page${prevPage}.html`;
  const nextPageLink = `page${nextPage}.html`;

  // For pagination links, append theme parameter if present in current URL
  // This is handled by the client-side script, so just use base links
  return `
    <div class="pagination-nav">
      <div class="pagination-info">
                <span class="page-indicator">${sanitizeHtml(t('pageIndicator', { current: currentPage, total: totalPages }))}</span>
                <span class="message-count">${sanitizeHtml(t('totalMessages', { count: totalMessages.toLocaleString(locale) }))}</span>
      </div>
      <div class="pagination-buttons">
                ${prevPage ? `<a href="${prevPageLink}" class="pagination-btn" data-theme-link>← ${sanitizeHtml(t('previous'))}</a>` : `<span class="pagination-btn disabled">← ${sanitizeHtml(t('previous'))}</span>`}
        <span class="page-selector">
                    ${prevPage ? `<a href="${firstPageLink}" data-theme-link>${sanitizeHtml(t('first'))}</a> | ` : ''}
          <span class="current">${currentPage}</span>
                    ${nextPage ? ` | <a href="${lastPageLink}" data-theme-link>${sanitizeHtml(t('last'))}</a>` : ''}
        </span>
                ${nextPage ? `<a href="${nextPageLink}" class="pagination-btn" data-theme-link>${sanitizeHtml(t('next'))} →</a>` : `<span class="pagination-btn disabled">${sanitizeHtml(t('next'))} →</span>`}
      </div>
    </div>
  `;
}

function renderHeader(receiver, avatar, t, enableSearch = true) {
  const avatarContent = avatar.avatarUrl
    ? `<div class="avatar"><img src="${avatar.avatarUrl}" alt="${sanitizeHtml(receiver.name)}" class="avatar-image"></div>`
    : `<div class="avatar" style="background-color: ${avatar.color}">${avatar.initials}</div>`;

  return `<div class="chat-header">
    <a href="../index.html" class="back-button" title="${sanitizeHtml(t('backToConversations'))}" aria-label="${sanitizeHtml(t('backToConversations'))}">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M15 18l-6-6 6-6"></path>
        </svg>
    </a>
    ${avatarContent}
    <div class="header-info">
        <h2>${sanitizeHtml(receiver.name)}</h2>
        <p>${sanitizeHtml(receiver.email)}</p>
    </div>
    ${enableSearch ? renderSearchControl(t) : ''}
    <button class="theme-toggle" id="themeToggle" title="${sanitizeHtml(t('toggleDarkMode'))}">🌙</button>
</div>`;
}

function renderGroupHeader(groupName, members, t, enableSearch = true) {
  const membersList = members && members.length > 0
    ? members.map(m => `<div class="member-item"><span class="member-name">${sanitizeHtml(m.name)}</span><span class="member-email">${sanitizeHtml(m.email)}</span></div>`).join('')
    : `<div class="member-item">${sanitizeHtml(t('noMembers'))}</div>`;

  return `<div class="chat-header">
    <a href="../index.html" class="back-button" title="${sanitizeHtml(t('backToConversations'))}" aria-label="${sanitizeHtml(t('backToConversations'))}">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M15 18l-6-6 6-6"></path>
        </svg>
    </a>
    <div class="group-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">👥</div>
    <div class="header-info">
        <h2>${sanitizeHtml(groupName || t('groupChat'))}</h2>
        <div class="group-members">${membersList}</div>
    </div>
    ${enableSearch ? renderSearchControl(t) : ''}
    <button class="theme-toggle" id="themeToggle" title="${sanitizeHtml(t('toggleDarkMode'))}">🌙</button>
</div>`;
}

function renderSearchControl(t) {
  return `<form class="conversation-search" id="conversationSearchForm" action="search.html" method="get" role="search">
        <input id="conversationSearchInput" class="conversation-search-input" type="search" name="q" autocomplete="off" placeholder="${sanitizeHtml(t('searchMessages'))}" aria-label="${sanitizeHtml(t('searchMessages'))}">
        <input type="hidden" name="theme" value="">
        <button class="search-clear" type="submit" title="${sanitizeHtml(t('search'))}" aria-label="${sanitizeHtml(t('search'))}">🔎</button>
        <span id="conversationSearchStatus" class="search-status" aria-live="polite"></span>
    </form>`;
}

function renderDateSeparator(dateString, timezone, locale) {
  const fullDate = formatDate(dateString, timezone, locale);
  return `<div class="date-separator">
    <div class="date-separator-text">${fullDate}</div>
</div>`;
}

function renderMessagesWithDateSeparators(messages, ownerEmail, timezone, locale, ownerAvatar, isGroup = false, members = [], conversationId = null, startIndex = 0) {
  if (messages.length === 0) return '';

  let result = '';
  let previousDate = null;

  messages.forEach((message, index) => {
    // Use created_date if available, fallback to updated_date
    const dateStr = message.created_date || message.updated_date;

    // Skip if no date is available
    if (!dateStr) {
      result += renderMessageBubble(message, ownerEmail, timezone, locale, ownerAvatar, isGroup, conversationId, startIndex + index);
      return;
    }

    // Extract date from current message
    const currentMessageDate = parseGoogleChatDate(dateStr);

    // Handle case where date parsing fails
    if (!currentMessageDate) {
      result += renderMessageBubble(message, ownerEmail, timezone, locale, ownerAvatar, isGroup, conversationId, startIndex + index);
      return;
    }

    const currentDateStr = currentMessageDate.toLocaleDateString();

    // Check if we need to add a date separator
    if (previousDate !== currentDateStr) {
      result += renderDateSeparator(dateStr, timezone, locale);
      previousDate = currentDateStr;
    }

    // Add the message bubble
    result += renderMessageBubble(message, ownerEmail, timezone, locale, ownerAvatar, isGroup, conversationId, startIndex + index);
  });

  return result;
}


function renderAttachedFiles(attachedFiles, conversationId = null) {
  if (!attachedFiles || attachedFiles.length === 0) return '';

  return attachedFiles.map(file => {
    const filename = file.export_name || file.original_name;
    const displayName = file.original_name || file.export_name;
    // Reference files from original data source: ../../Google Chat/Groups/conversationId/filename
    const filePath = conversationId
      ? `../../Google Chat/Groups/${conversationId}/${filename}`
      : '../' + filename;

    if (isImageFile(filename)) {
      return `<div class="attached-media"><img src="${sanitizeHtml(filePath)}" alt="${sanitizeHtml(displayName)}" class="attached-image"></div>`;
    } else if (isVideoFile(filename)) {
      return `<div class="attached-media"><video controls class="attached-video"><source src="${sanitizeHtml(filePath)}"></video></div>`;
    } else if (isAudioFile(filename)) {
      return `<div class="attached-media"><audio controls class="attached-audio"><source src="${sanitizeHtml(filePath)}"></audio></div>`;
    } else {
      const ext = getFileExtension(filename);
      return `<div class="attached-file"><a href="${sanitizeHtml(filePath)}" download class="file-download">📎 ${sanitizeHtml(displayName)} <span class="file-ext">.${ext}</span></a></div>`;
    }
  }).join('');
}

function renderQuotedMessage(quotedMeta, locale) {
  const t = getTranslator(locale);
  if (!quotedMeta) return '';

  const creator = quotedMeta.creator || {};
  const text = sanitizeHtml(quotedMeta.text || '').substring(0, 100);

  return `<div class="quoted-message">
        <div class="quoted-sender">${sanitizeHtml(creator.name || t('unknown'))}</div>
        <div class="quoted-text">${text}${text.length === 100 ? '...' : ''}</div>
    </div>`;
}

function renderMessageBubble(message, ownerEmail, timezone, locale, ownerAvatar, isGroup = false, conversationId = null, messageIndex = 0) {
  const isOwner = message.creator.email === ownerEmail;
  const time = formatTime(message.created_date, timezone, locale);
  const messageId = getMessageAnchorId(message, conversationId, messageIndex);

  // Render quoted/replied message if exists
  const quotedHtml = message.quoted_message_metadata ? renderQuotedMessage(message.quoted_message_metadata, locale) : '';

  // Extract and render annotations (URLs with metadata)
  const annotations = extractAnnotationsMetadata(message.annotations);
  const annotationsHtml = annotations
    .map(ann => renderAnnotation(ann, locale))
    .join('');

  // Parse message text for inline links
  // Extract URLs before sanitizing to preserve them properly
  let messageText = message.text;
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const urls = messageText.match(urlRegex) || [];

  // Replace URLs with placeholders
  let placeholderMap = {};
  urls.forEach((url, index) => {
    const placeholder = `__URL_PLACEHOLDER_${index}__`;
    placeholderMap[placeholder] = url;
    messageText = messageText.replace(url, placeholder);
  });

  // Sanitize the text with placeholders
  messageText = sanitizeHtml(messageText);

  // Replace placeholders with proper links with escaped URLs
  Object.entries(placeholderMap).forEach(([placeholder, url]) => {
    const escapedUrl = sanitizeHtml(url);
    const linkHtml = `<a href="${escapedUrl}" target="_blank" style="color: #1976d2; text-decoration: underline;">${escapedUrl}</a>`;
    messageText = messageText.replace(placeholder, linkHtml);
  });

  // Render attached files
  const attachedFilesHtml = message.attached_files && message.attached_files.length > 0
    ? renderAttachedFiles(message.attached_files, conversationId)
    : '';

  const messageClass = isOwner ? 'owner' : 'receiver';
  const senderName = isGroup ? `<div class="message-sender">${sanitizeHtml(message.creator.name)}</div>` : '';

  return `<div class="message ${messageClass}" id="${sanitizeHtml(messageId)}" data-message-id="${sanitizeHtml(messageId)}">
    <div class="message-content">
        ${senderName}
        ${quotedHtml}
        <div class="message-text">${messageText}</div>
        ${annotationsHtml}
        ${attachedFilesHtml}
        <div class="message-time">${time}</div>
    </div>
</div>`;
}
function renderAnnotation(annotation, locale) {
  const t = getTranslator(locale);
  if (!annotation.url) return '';

  const domain = extractDomain(annotation.url);
  let html = `<a href="${annotation.url}" target="_blank" class="message-annotation">`;

  if (annotation.title) {
    html += `<div class="annotation-title">${sanitizeHtml(annotation.title)}</div>`;
  }

  if (annotation.imageUrl && isImageUrl(annotation.imageUrl)) {
    html += `<img src="${annotation.imageUrl}" alt="${sanitizeHtml(t('previewAlt'))}" class="annotation-thumbnail">`;
  }

  if (annotation.snippet) {
    html += `<div class="annotation-snippet">${sanitizeHtml(annotation.snippet)}</div>`;
  }

  html += `<div class="annotation-url">${sanitizeHtml(domain)}</div>`;
  html += `</a>`;

  return html;
}

async function renderConversationListItem(conversation, avatar, receiver, timezone, locale) {
  const t = getTranslator(locale);
  const fileName = `${conversation.id}/index.html`;
  const lastMessageTime = conversation.lastMessage
    ? formatTime(conversation.lastMessage.created_date, timezone, locale)
    : '';
  const messagePreview = conversation.lastMessage
    ? sanitizeHtml(conversation.lastMessage.text).substring(0, 60)
    : t('noMessages');

  if (conversation.isGroup) {
    // Group conversation rendering
    const memberCount = conversation.members ? conversation.members.length : 0;
    const memberNames = conversation.members
      ? conversation.members.slice(0, 3).map(m => m.name).join(', ') + (memberCount > 3 ? ` +${memberCount - 3}` : '')
      : t('noMembers');

    return `<a href="${fileName}" class="conversation-item" data-theme-link>
    <div class="group-avatar-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">👥</div>
    <div class="conversation-info">
        <div class="conversation-name">${sanitizeHtml(conversation.groupName || t('groupChat'))}</div>
        <div class="conversation-email">${memberNames}</div>
        <div class="conversation-preview">${messagePreview}${messagePreview.length === 60 ? '...' : ''}</div>
    </div>
    <div class="conversation-meta">
        <div class="message-count">${conversation.messageCount}</div>
        <div>${lastMessageTime}</div>
    </div>
</a>`;
  } else {
    // Direct message rendering
    const avatarContent = avatar.avatarUrl
      ? `<div class="conversation-avatar"><img src="${avatar.avatarUrl}" alt="${sanitizeHtml(receiver.name)}" class="conversation-avatar-image"></div>`
      : `<div class="conversation-avatar" style="background-color: ${avatar.color}">${avatar.initials}</div>`;

    return `<a href="${fileName}" class="conversation-item" data-theme-link>
    ${avatarContent}
    <div class="conversation-info">
        <div class="conversation-name">${sanitizeHtml(receiver.name)}</div>
        <div class="conversation-email">${sanitizeHtml(receiver.email)}</div>
        <div class="conversation-preview">${messagePreview}${messagePreview.length === 60 ? '...' : ''}</div>
    </div>
    <div class="conversation-meta">
        <div class="message-count">${conversation.messageCount}</div>
        <div>${lastMessageTime}</div>
    </div>
</a>`;
  }
}

function renderEmptyIndexPage(locale) {
  const t = getTranslator(locale);
  return `<!DOCTYPE html>
<html lang="${sanitizeHtml(locale || 'en')}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHtml(t('conversationsPageTitle'))}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .empty-state {
            text-align: center;
            color: white;
            padding: 40px 20px;
        }

        .empty-state h1 {
            font-size: 32px;
            margin-bottom: 12px;
        }

        .empty-state p {
            font-size: 16px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <h1>${sanitizeHtml(t('noConversationsFound'))}</h1>
        <p>${sanitizeHtml(t('noConversationsDescription'))}</p>
    </div>
</body>
</html>`;
}
