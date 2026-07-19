import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as parser from './parser.js';
import * as renderer from './renderer.js';
import { buildConversationSearchIndex } from './searchIndex.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const TIMEZONE = process.env.TIMEZONE || 'UTC';
const LOCALE = process.env.LOCALE || 'en-US';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const DATA_SOURCE_PATH = process.env.DATA_SOURCE_PATH || './Groups';
const USER_DATA_PATH = process.env.USER_DATA_PATH || './Users';
const MESSAGES_PER_PAGE = parseInt(process.env.MESSAGES_PER_PAGE) || 1000;
const ENABLE_SEARCH = process.env.ENABLE_SEARCH !== 'false';




async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Google Chat HTML Exporter            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('⚙️  Configuration:');
  console.log(`  Owner Email: ${OWNER_EMAIL}`);
  console.log(`  Timezone: ${TIMEZONE}`);
  console.log(`  Locale: ${LOCALE}`);
  console.log(`  Output Directory: ${OUTPUT_DIR}`);
  console.log(`  Data Source: ${DATA_SOURCE_PATH}`);
  console.log(`  Full-text Search: ${ENABLE_SEARCH ? 'enabled' : 'disabled'}\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);
  }

  // Parse user info
  console.log('👤 Parsing user information...');
  const userInfo = await parser.parseUserInfo(USER_DATA_PATH);
  if (userInfo && userInfo.user) {
    console.log(`✅ Owner identified: ${userInfo.user.name} (${userInfo.user.email})\n`);
  } else {
    console.warn('⚠️  Could not identify owner\n');
  }

  // Parse all conversations
  console.log('💬 Parsing conversations...');
  const conversations = await parser.parseAllConversations(DATA_SOURCE_PATH, OWNER_EMAIL);

  console.log('\n📊 Summary:');
  console.log(`  Total conversations: ${conversations.length}`);
  console.log(`  With messages: ${conversations.filter(c => c.hasMessages).length}`);
  console.log(`  Empty: ${conversations.filter(c => !c.hasMessages).length}`);
  console.log(`  Total messages: ${conversations.reduce((sum, c) => sum + c.messageCount, 0)}\n`);

  // Render HTML files
  console.log('🎨 Generating HTML files...'); console.log('   (Attachment files will be referenced from source data)\n'); let successCount = 0;
  let errorCount = 0;
  let paginatedCount = 0;
  let searchPageCount = 0;

  for (const conversation of conversations) {
    try {
      const searchIndex = ENABLE_SEARCH
        ? buildConversationSearchIndex(conversation, MESSAGES_PER_PAGE)
        : [];

      // Check if pagination is needed
      if (MESSAGES_PER_PAGE > 0 && conversation.messages.length > MESSAGES_PER_PAGE) {
        // Generate paginated files
        const totalPages = Math.ceil(conversation.messages.length / MESSAGES_PER_PAGE);

        for (let page = 1; page <= totalPages; page++) {
          const startIdx = (page - 1) * MESSAGES_PER_PAGE;
          const endIdx = Math.min(startIdx + MESSAGES_PER_PAGE, conversation.messages.length);

          // Create page-specific conversation object
          const pageConversation = {
            ...conversation,
            messages: conversation.messages.slice(startIdx, endIdx),
            messageCount: endIdx - startIdx,
            pageInfo: {
              currentPage: page,
              totalPages,
              totalMessages: conversation.messages.length,
              pageSize: MESSAGES_PER_PAGE,
              startIndex: startIdx
            }
          };

          const htmlContent = await renderer.renderConversationPage(
            pageConversation,
            TIMEZONE,
            LOCALE,
            ENABLE_SEARCH
          );

          const conversationDir = path.join(OUTPUT_DIR, conversation.id);
          if (!fs.existsSync(conversationDir)) {
            fs.mkdirSync(conversationDir, { recursive: true });
          }

          const fileName = page === 1
            ? path.join(conversationDir, 'index.html')
            : path.join(conversationDir, `page${page}.html`);

          fs.writeFileSync(fileName, htmlContent, 'utf8');
          successCount++;
        }
        paginatedCount++;
      } else {
        // Single file (no pagination)
        const htmlContent = await renderer.renderConversationPage(
          conversation,
          TIMEZONE,
          LOCALE,
          ENABLE_SEARCH
        );

        const conversationDir = path.join(OUTPUT_DIR, conversation.id);
        if (!fs.existsSync(conversationDir)) {
          fs.mkdirSync(conversationDir, { recursive: true });
        }

        const fileName = path.join(conversationDir, 'index.html');
        fs.writeFileSync(fileName, htmlContent, 'utf8');
        successCount++;
      }

      const conversationDir = path.join(OUTPUT_DIR, conversation.id);
      if (!fs.existsSync(conversationDir)) {
        fs.mkdirSync(conversationDir, { recursive: true });
      }

      const searchPath = path.join(conversationDir, 'search.html');
      if (ENABLE_SEARCH) {
        const searchHtml = await renderer.renderConversationSearchPage(
          conversation,
          TIMEZONE,
          LOCALE,
          searchIndex
        );
        fs.writeFileSync(searchPath, searchHtml, 'utf8');
        searchPageCount++;
      } else if (fs.existsSync(searchPath)) {
        fs.unlinkSync(searchPath);
      }
    } catch (error) {
      console.warn(`⚠️  Error rendering conversation ${conversation.id}:`, error.message);
      errorCount++;
    }
  }

  const searchSummary = ENABLE_SEARCH ? ` and ${searchPageCount} search pages` : '';
  console.log(`✅ Rendered ${successCount} conversation HTML files${searchSummary} (${paginatedCount} paginated), ${errorCount} errors\n`);

  // Render index page
  console.log('📑 Generating index page...');
  try {
    const indexHtml = await renderer.renderIndexPage(
      conversations,
      TIMEZONE,
      LOCALE
    );

    const indexPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log(`✅ Index page created: ${indexPath}\n`);
  } catch (error) {
    console.error('❌ Error rendering index page:', error.message);
    errorCount++;
  }

  // Summary
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ✅ Export Complete!                  ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  const generatedFileLabel = ENABLE_SEARCH ? 'conversations + search pages + index' : 'conversations + index';
  console.log(`📄 Files generated: ${successCount + searchPageCount + 1} (${generatedFileLabel})`);
  console.log(`⚠️  Errors: ${errorCount}`);
  console.log('\n💡 Next step: Open index.html in your browser to view conversations');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
