const resources = {
  en: {
    unknown: 'Unknown',
    owner: 'Owner',
    groupChat: 'Group Chat',
    noMessagesInConversation: 'No messages in this conversation',
    noMessages: 'No messages',
    noMembers: 'No members',
    footerExportLabel: 'Messages from Google Chat Export',
    timezone: 'Timezone',
    locale: 'Locale',
    toggleDarkMode: 'Toggle dark mode',
    backToConversations: 'Back to conversations',
    conversationsPageTitle: 'Google Chat Conversations',
    conversationsSubtitle: 'Conversations exported from Google Chat',
    conversations: 'Conversations',
    active: 'Active',
    messages: 'Messages',
    pageIndicator: 'Page {current} of {total}',
    totalMessages: '{count} messages total',
    previous: 'Previous',
    next: 'Next',
    first: 'First',
    last: 'Last',
    previewAlt: 'preview',
    searchMessages: 'Search messages',
    clearSearch: 'Clear search',
    search: 'Search',
    backToConversation: 'Back to conversation',
    searchNoResults: 'No results found',
    searchPageLabel: 'Page',
    searchEnterQuery: 'Enter a search term to find messages in this conversation.',
    searchResultsCount: '{count} results',
    searchShowingResults: 'Showing {shown} of {total} results',
    noConversationsFound: 'No Conversations Found',
    noConversationsDescription: 'No Google Chat conversations were found in the data source.'
  },
  'pt-BR': {
    unknown: 'Desconhecido',
    owner: 'Proprietário',
    groupChat: 'Conversa em grupo',
    noMessagesInConversation: 'Nenhuma mensagem nesta conversa',
    noMessages: 'Sem mensagens',
    noMembers: 'Sem membros',
    footerExportLabel: 'Mensagens da exportação do Google Chat',
    timezone: 'Fuso horário',
    locale: 'Localidade',
    toggleDarkMode: 'Alternar modo escuro',
    backToConversations: 'Voltar para conversas',
    conversationsPageTitle: 'Conversas do Google Chat',
    conversationsSubtitle: 'Conversas exportadas do Google Chat',
    conversations: 'Conversas',
    active: 'Ativas',
    messages: 'Mensagens',
    pageIndicator: 'Página {current} de {total}',
    totalMessages: '{count} mensagens no total',
    previous: 'Anterior',
    next: 'Próxima',
    first: 'Primeira',
    last: 'Última',
    previewAlt: 'prévia',
    searchMessages: 'Pesquisar mensagens',
    clearSearch: 'Limpar pesquisa',
    search: 'Pesquisar',
    backToConversation: 'Voltar para conversa',
    searchNoResults: 'Nenhum resultado encontrado',
    searchPageLabel: 'Página',
    searchEnterQuery: 'Digite um termo para encontrar mensagens nesta conversa.',
    searchResultsCount: '{count} resultados',
    searchShowingResults: 'Mostrando {shown} de {total} resultados',
    noConversationsFound: 'Nenhuma conversa encontrada',
    noConversationsDescription: 'Nenhuma conversa do Google Chat foi encontrada na origem de dados.'
  }
};

function interpolate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function resolveResource(locale = 'en') {
  if (resources[locale]) {
    return resources[locale];
  }

  const baseLocale = locale.split('-')[0];
  if (resources[baseLocale]) {
    return resources[baseLocale];
  }

  return resources.en;
}

export function getTranslator(locale = 'en') {
  const resource = resolveResource(locale);

  return (key, values = {}) => {
    const fallback = resources.en[key] || key;
    const template = resource[key] || fallback;
    return interpolate(template, values);
  };
}