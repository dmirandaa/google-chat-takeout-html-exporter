// Parser module - reads and validates Google Chat JSON exports
import fs from 'fs';
import path from 'path';

export async function parseUserInfo(userDataPath) {
  try {
    // Find the first User folder
    const usersDir = userDataPath;
    const userFolders = fs.readdirSync(usersDir).filter(f => f.startsWith('User '));

    if (userFolders.length === 0) {
      console.warn('⚠️  No user folders found in Users directory');
      return null;
    }

    const firstUserFolder = userFolders[0];
    const userInfoPath = path.join(usersDir, firstUserFolder, 'user_info.json');

    if (!fs.existsSync(userInfoPath)) {
      console.warn(`⚠️  user_info.json not found at ${userInfoPath}`);
      return null;
    }

    const rawData = fs.readFileSync(userInfoPath, 'utf8');
    const userInfo = JSON.parse(rawData);
    return userInfo;
  } catch (error) {
    console.error('❌ Error parsing user info:', error.message);
    return null;
  }
}

export async function parseAllConversations(dataSourcePath, ownerEmail) {
  try {
    const groupsDir = dataSourcePath;

    if (!fs.existsSync(groupsDir)) {
      console.error(`❌ Groups directory not found: ${groupsDir}`);
      return [];
    }

    const conversationFolders = fs.readdirSync(groupsDir).filter(f => {
      const stat = fs.statSync(path.join(groupsDir, f));
      return stat.isDirectory();
    });

    console.log(`📁 Found ${conversationFolders.length} conversation folders`);

    const conversations = [];
    let processed = 0;
    let errors = 0;

    for (const folder of conversationFolders) {
      try {
        const conversation = parseConversation(path.join(groupsDir, folder), ownerEmail);
        conversations.push(conversation);
        processed++;
      } catch (error) {
        console.warn(`⚠️  Error parsing conversation ${folder}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ Parsed ${processed} conversations, ${errors} errors`);
    return conversations;
  } catch (error) {
    console.error('❌ Error parsing conversations:', error.message);
    return [];
  }
}

export function parseConversation(conversationPath, ownerEmail) {
  const conversationId = path.basename(conversationPath);
  const isGroup = conversationId.startsWith('Space ');

  // Read group_info.json
  const groupInfoPath = path.join(conversationPath, 'group_info.json');
  let groupInfo = { members: [], name: null };

  if (fs.existsSync(groupInfoPath)) {
    try {
      const rawGroupInfo = fs.readFileSync(groupInfoPath, 'utf8');
      groupInfo = JSON.parse(rawGroupInfo);
    } catch (error) {
      console.warn(`⚠️  Error parsing group_info.json in ${conversationId}:`, error.message);
    }
  }

  // Read messages.json if it exists
  const messagesPath = path.join(conversationPath, 'messages.json');
  let messages = [];
  let hasMessages = false;

  if (fs.existsSync(messagesPath)) {
    try {
      const rawMessages = fs.readFileSync(messagesPath, 'utf8');
      const messageData = JSON.parse(rawMessages);
      messages = messageData.messages || [];
      hasMessages = true;
    } catch (error) {
      console.warn(`⚠️  Error parsing messages.json in ${conversationId}:`, error.message);
    }
  }

  // Identify owner and receiver
  let owner = null;
  let receiver = null;

  if (groupInfo.members && groupInfo.members.length > 0) {
    owner = groupInfo.members.find(m => m.email === ownerEmail) || groupInfo.members[0];
    receiver = groupInfo.members.find(m => m.email !== owner.email) || groupInfo.members[1] || null;
  }

  // Parse each message
  const parsedMessages = messages.map(msg => ({
    creator: msg.creator || { name: 'Unknown', email: 'unknown@example.com' },
    created_date: msg.created_date,
    updated_date: msg.updated_date,
    text: msg.text || '',
    annotations: msg.annotations || [],
    attached_files: msg.attached_files || [],
    quoted_message_metadata: msg.quoted_message_metadata || null,
    topic_id: msg.topic_id,
    message_id: msg.message_id
  }));

  return {
    id: conversationId,
    name: conversationId.replace(/^DM |^Space /, ''),
    groupName: groupInfo.name || null,
    isGroup,
    owner,
    receiver,
    members: groupInfo.members,
    messages: parsedMessages,
    messageCount: parsedMessages.length,
    hasMessages,
    lastMessage: parsedMessages.length > 0 ? parsedMessages[parsedMessages.length - 1] : null
  };
}
